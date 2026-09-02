import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { renderBody, type Template, type TemplateVars } from "./templates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PdfGuest = {
  id: string;
  name: string;
  guestType: "SINGLETON" | "COUPLE";
  gender: "MR" | "MME" | null;
};

export type PdfCeremony = {
  id: string;
  type: string;
  customLabel: string | null;
  date: Date | null;
  venue: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ceremonyLabel(c: PdfCeremony): string {
  if (c.type === "CUSTOM") return c.customLabel ?? "Cérémonie";
  return { COUTUMIER: "Coutumier", CIVIL: "Civil", RELIGIEUX: "Religieux" }[c.type] ?? c.type;
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function genderPrefix(guest: PdfGuest): string {
  if (guest.guestType !== "SINGLETON") return "";
  return guest.gender === "MR" ? "M." : guest.gender === "MME" ? "Mme" : "";
}

// ---------------------------------------------------------------------------
// QR code — encodes guest-ceremony pair for T14 check-in
// ---------------------------------------------------------------------------

export function qrPayload(guestId: string, ceremonyId: string): string {
  return `g:${guestId}|c:${ceremonyId}`;
}

async function buildQrPng(guestId: string, ceremonyId: string): Promise<Buffer> {
  return QRCode.toBuffer(qrPayload(guestId, ceremonyId), {
    type: "png",
    width: 180,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}

// ---------------------------------------------------------------------------
// generateInvitationPdf — returns PDF as Uint8Array
// ---------------------------------------------------------------------------

export async function generateInvitationPdf(
  guest: PdfGuest,
  ceremony: PdfCeremony,
  template: Template,
  senderName: string,
  customBody?: string | null
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // A4 page: 595 × 842 pt
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 56;
  const contentWidth = width - margin * 2;

  // ── Background tint ──────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: height - 120,
    width, height: 120,
    color: rgb(0.06, 0.08, 0.12),
  });

  // ── Header: ceremony label + date ────────────────────────────────────────
  const cerLabel = ceremonyLabel(ceremony).toUpperCase();
  page.drawText(cerLabel, {
    x: margin, y: height - 50,
    size: 10, font: fontBold,
    color: rgb(0.6, 0.65, 0.75),
  });

  const dateStr = formatDate(ceremony.date);
  if (dateStr) {
    page.drawText(dateStr, {
      x: margin, y: height - 68,
      size: 13, font: fontRegular,
      color: rgb(0.9, 0.9, 0.92),
    });
  }

  if (ceremony.venue) {
    page.drawText(ceremony.venue, {
      x: margin, y: height - 88,
      size: 11, font: fontRegular,
      color: rgb(0.65, 0.68, 0.75),
    });
  }

  // ── Guest name ───────────────────────────────────────────────────────────
  const prefix = genderPrefix(guest);
  const guestLine = prefix ? `${prefix} ${guest.name}` : guest.name;
  page.drawText(guestLine, {
    x: margin, y: height - 165,
    size: 28, font: fontBold,
    color: rgb(0.08, 0.10, 0.14),
  });

  // Divider
  page.drawLine({
    start: { x: margin, y: height - 185 },
    end: { x: margin + 60, y: height - 185 },
    thickness: 3,
    color: rgb(0.36, 0.49, 0.98),
  });

  // ── Body text ────────────────────────────────────────────────────────────
  const vars: TemplateVars = {
    guestName: guest.name,
    genderPrefix: prefix,
    ceremonyLabel: ceremonyLabel(ceremony),
    date: dateStr,
    venue: ceremony.venue ?? "",
    senderName,
  };
  const bodyText = renderBody(customBody ?? template.bodyText, vars);

  // Word-wrap body text into lines
  const maxLineWidth = contentWidth - 200; // leave room for QR code
  const bodyLines = wrapText(bodyText, fontRegular, 13, maxLineWidth);
  let y = height - 220;
  for (const line of bodyLines) {
    if (y < 120) break;
    page.drawText(line, { x: margin, y, size: 13, font: fontRegular, color: rgb(0.2, 0.22, 0.27) });
    y -= 20;
  }

  // ── QR code ──────────────────────────────────────────────────────────────
  const qrPng = await buildQrPng(guest.id, ceremony.id);
  const qrImage = await doc.embedPng(qrPng);
  const qrSize = 150;
  page.drawImage(qrImage, {
    x: width - margin - qrSize,
    y: height - 185 - qrSize,
    width: qrSize,
    height: qrSize,
  });

  // QR label
  page.drawText("Scan pour check-in", {
    x: width - margin - qrSize,
    y: height - 185 - qrSize - 14,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.52, 0.58),
  });

  // ── Footer ───────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: margin, y: 72 },
    end: { x: width - margin, y: 72 },
    thickness: 0.5,
    color: rgb(0.85, 0.86, 0.88),
  });
  page.drawText(senderName, {
    x: margin, y: 54,
    size: 9, font: fontBold,
    color: rgb(0.45, 0.48, 0.55),
  });

  const bytes = await doc.save();
  return bytes;
}

// ---------------------------------------------------------------------------
// Simple word-wrap for pdf-lib text
// ---------------------------------------------------------------------------

function wrapText(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number, maxWidth: number): string[] {
  const result: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") { result.push(""); continue; }
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      const w = font.widthOfTextAtSize(candidate, size);
      if (w > maxWidth && line) {
        result.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) result.push(line);
  }
  return result;
}
