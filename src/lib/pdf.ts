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
// Design tokens
// ---------------------------------------------------------------------------

const BURGUNDY = rgb(0.50, 0.07, 0.12);
const CREAM    = rgb(0.98, 0.96, 0.92);
const DARK     = rgb(0.12, 0.10, 0.11);
const MEDIUM   = rgb(0.35, 0.30, 0.30);
const LIGHT    = rgb(0.65, 0.60, 0.58);
const GOLD     = rgb(0.70, 0.55, 0.18);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ceremonyLabel(c: PdfCeremony): string {
  if (c.type === "CUSTOM") return c.customLabel ?? "Cérémonie";
  return { COUTUMIER: "Coutumier", CIVIL: "Civil", RELIGIEUX: "Religieux" }[c.type] ?? c.type;
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    .format(d)
    .toUpperCase();
}

function genderPrefix(guest: PdfGuest): string {
  if (guest.guestType !== "SINGLETON") return "";
  return guest.gender === "MR" ? "Monsieur" : guest.gender === "MME" ? "Madame" : "";
}

type EmbeddedFont = Awaited<ReturnType<PDFDocument["embedFont"]>>;
type Page = ReturnType<PDFDocument["addPage"]>;
type Color = ReturnType<typeof rgb>;

function drawCentered(page: Page, text: string, y: number, size: number, font: EmbeddedFont, color: Color, pageWidth: number) {
  const x = (pageWidth - font.widthOfTextAtSize(text, size)) / 2;
  page.drawText(text, { x, y, size, font, color });
}

function drawDivider(page: Page, y: number, pageWidth: number, margin: number, color: Color) {
  const cx = pageWidth / 2;
  page.drawLine({ start: { x: margin, y }, end: { x: cx - 20, y }, thickness: 0.5, color });
  page.drawRectangle({ x: cx - 4, y: y - 4, width: 8, height: 8, color });
  page.drawLine({ start: { x: cx + 20, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color });
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
    width: 100,
    margin: 1,
    color: { dark: "#7f1220", light: "#f9f4eb" },
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

  // A4 portrait: 595 × 842 pt
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const margin = 52;

  const fRegular    = await doc.embedFont(StandardFonts.TimesRoman);
  const fBold       = await doc.embedFont(StandardFonts.TimesRomanBold);
  const fItalic     = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const fBoldItalic = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const fHelv       = await doc.embedFont(StandardFonts.Helvetica);
  const fHelvBold   = await doc.embedFont(StandardFonts.HelveticaBold);

  // ── Cream background ──────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height, color: CREAM });

  // ── Top border band ───────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: BURGUNDY });
  page.drawRectangle({ x: 0, y: height - 9, width, height: 1.5, color: GOLD });

  // ── Bottom border band ────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height: 6, color: BURGUNDY });
  page.drawRectangle({ x: 0, y: 6, width, height: 1.5, color: GOLD });

  // ── "VOTRE INVITATION" header ─────────────────────────────────────────────
  drawCentered(page, "VOTRE  INVITATION", height - 36, 9, fHelvBold, BURGUNDY, width);

  // Thin rule under header
  page.drawLine({
    start: { x: margin + 30, y: height - 44 },
    end:   { x: width - margin - 30, y: height - 44 },
    thickness: 0.5, color: BURGUNDY,
  });

  // ── Guest honorific + name ────────────────────────────────────────────────
  const prefix = genderPrefix(guest);
  const honorific = prefix || (guest.guestType === "COUPLE" ? "Monsieur & Madame" : "");
  if (honorific) {
    drawCentered(page, honorific, height - 76, 11, fItalic, LIGHT, width);
  }

  const guestNameUpper = guest.name.toUpperCase();
  drawCentered(page, guestNameUpper, height - 105, 18, fBoldItalic, DARK, width);

  // Dotted line under guest name
  const nameW  = fBoldItalic.widthOfTextAtSize(guestNameUpper, 18);
  const dotX0  = (width - nameW) / 2;
  for (let dx = 0; dx < nameW; dx += 5) {
    page.drawCircle({ x: dotX0 + dx, y: height - 114, size: 0.8, color: MEDIUM });
  }

  // ── Section divider ───────────────────────────────────────────────────────
  drawDivider(page, height - 136, width, margin, BURGUNDY);

  // ── Opening sentence ──────────────────────────────────────────────────────
  drawCentered(page, "Avec la grâce de Dieu et entourés de leurs familles,", height - 162, 11, fItalic, MEDIUM, width);

  // ── Sender / couple name — large elegant italic ───────────────────────────
  drawCentered(page, senderName, height - 202, 28, fBoldItalic, BURGUNDY, width);

  // ── Body text (centered) ──────────────────────────────────────────────────
  const vars: TemplateVars = {
    guestName: guest.name,
    genderPrefix: prefix,
    ceremonyLabel: ceremonyLabel(ceremony),
    date: formatDate(ceremony.date),
    venue: ceremony.venue ?? "",
    senderName,
  };
  const bodyText = renderBody(customBody ?? template.bodyText, vars);
  const bodyMaxW = width - margin * 2 - 30;
  const bodyLines = wrapText(bodyText, fItalic, 12, bodyMaxW);

  let y = height - 242;
  for (const line of bodyLines) {
    if (y < 220) break;
    if (line.trim() === "") { y -= 10; continue; }
    drawCentered(page, line, y, 12, fItalic, DARK, width);
    y -= 19;
  }

  // ── Divider before ceremony details ──────────────────────────────────────
  y -= 14;
  drawDivider(page, y, width, margin, GOLD);
  y -= 26;

  // ── Ceremony type label ───────────────────────────────────────────────────
  drawCentered(page, ceremonyLabel(ceremony).toUpperCase(), y, 8, fHelvBold, LIGHT, width);
  y -= 20;

  // ── Date ──────────────────────────────────────────────────────────────────
  const dateStr = formatDate(ceremony.date);
  if (dateStr) {
    drawCentered(page, dateStr, y, 20, fBold, DARK, width);
    y -= 30;
  }

  // ── Venue ─────────────────────────────────────────────────────────────────
  if (ceremony.venue) {
    drawCentered(page, ceremony.venue, y, 12, fRegular, MEDIUM, width);
    y -= 20;
  }

  // ── "Nous vous attendons" footer section ──────────────────────────────────
  const addrY = 108;
  page.drawLine({
    start: { x: margin + 60, y: addrY + 42 },
    end:   { x: width - margin - 60, y: addrY + 42 },
    thickness: 0.5, color: BURGUNDY,
  });
  drawCentered(page, "Nous vous attendons", addrY + 26, 10, fBoldItalic, BURGUNDY, width);

  // ── QR code — bottom right ────────────────────────────────────────────────
  const qrPng   = await buildQrPng(guest.id, ceremony.id);
  const qrImage = await doc.embedPng(qrPng);
  const qrSize  = 68;
  const qrX     = width - margin - qrSize;
  const qrY     = 18;

  page.drawRectangle({
    x: qrX - 3, y: qrY - 3,
    width: qrSize + 6, height: qrSize + 6,
    borderColor: BURGUNDY, borderWidth: 0.5, color: CREAM,
  });
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  page.drawText("Check-in", {
    x: qrX + (qrSize - fHelv.widthOfTextAtSize("Check-in", 7)) / 2,
    y: qrY - 11, size: 7, font: fHelv, color: LIGHT,
  });

  const bytes = await doc.save();
  return bytes;
}

// ---------------------------------------------------------------------------
// Simple word-wrap for pdf-lib text
// ---------------------------------------------------------------------------

function wrapText(text: string, font: EmbeddedFont, size: number, maxWidth: number): string[] {
  const result: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") { result.push(""); continue; }
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
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
