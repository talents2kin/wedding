import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { getWeddingAccess } from "@/lib/wedding-access";

// ---------------------------------------------------------------------------
// GET /api/seating/pdf?ceremonyId=
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ceremonyId = new URL(req.url).searchParams.get("ceremonyId");
  if (!ceremonyId) return NextResponse.json({ error: "missing_params" }, { status: 400 });

  const ceremony = await db.ceremony.findUnique({
    where: { id: ceremonyId },
    include: {
      tables: {
        orderBy: { position: "asc" },
        include: {
          seats: {
            include: { guest: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!ceremony) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const access = await getWeddingAccess(session.user.id, ceremony.weddingId);
  if (!access) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const bytes = await generateSeatingPdf(ceremony, access.wedding.name);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="plan-de-table.pdf"`,
    },
  });
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

type TableWithSeats = {
  id: string;
  name: string;
  capacity: number;
  seats: { guest: { id: string; name: string } }[];
};

type CeremonyForPdf = {
  type: string;
  customLabel: string | null;
  date: Date | null;
  venue: string | null;
  tables: TableWithSeats[];
};

async function generateSeatingPdf(ceremony: CeremonyForPdf, weddingName: string): Promise<Uint8Array> {
  const BURGUNDY = rgb(0.50, 0.07, 0.12);
  const CREAM    = rgb(0.98, 0.96, 0.92);
  const DARK     = rgb(0.12, 0.10, 0.11);

  const doc   = await PDFDocument.create();
  const bold  = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg   = await doc.embedFont(StandardFonts.Helvetica);

  const W = 595, H = 842; // A4
  const MARGIN = 48;
  const COL_W  = (W - MARGIN * 2 - 16) / 2;

  const ceremonyLabel =
    ceremony.customLabel ??
    ({ COUTUMIER: "Coutumier", CIVIL: "Civil", RELIGIEUX: "Religieux", CUSTOM: "Personnalisé" }[ceremony.type] ?? ceremony.type);

  const dateStr = ceremony.date
    ? ceremony.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";

  // Helper: start a new page with header band
  function newPage() {
    const page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 60, width: W, height: 60, color: BURGUNDY });
    page.drawText(`Plan de table — ${weddingName}`, {
      x: MARGIN, y: H - 38, size: 14, font: bold, color: CREAM,
    });
    if (dateStr) {
      page.drawText(dateStr, { x: W - MARGIN - 120, y: H - 38, size: 10, font: reg, color: CREAM });
    }
    if (ceremony.venue) {
      page.drawText(ceremony.venue, { x: W - MARGIN - 120, y: H - 52, size: 8, font: reg, color: CREAM });
    }
    page.drawText(ceremonyLabel, { x: MARGIN, y: H - 52, size: 9, font: reg, color: CREAM });
    return page;
  }

  // Layout: 2 columns of table cards
  const TABLE_CARD_PADDING = 10;
  const LINE_H = 14;
  const CARD_HEADER_H = 24;
  const TABLE_CARD_MIN_H = CARD_HEADER_H + TABLE_CARD_PADDING * 2;

  let page = newPage();
  let col = 0;   // 0 = left, 1 = right
  let y   = H - 80;

  for (const table of ceremony.tables) {
    const guestCount = table.seats.length;
    const cardH = TABLE_CARD_MIN_H + guestCount * LINE_H;

    if (y - cardH < MARGIN) {
      if (col === 0) {
        col = 1;
        y = H - 80;
      } else {
        page = newPage();
        col = 0;
        y = H - 80;
      }
    }

    const x = MARGIN + col * (COL_W + 16);

    // Card background
    page.drawRectangle({ x, y: y - cardH, width: COL_W, height: cardH, color: rgb(0.97, 0.95, 0.92) });
    page.drawRectangle({ x, y: y - CARD_HEADER_H, width: COL_W, height: CARD_HEADER_H, color: BURGUNDY });

    // Table name + count
    page.drawText(table.name, { x: x + TABLE_CARD_PADDING, y: y - CARD_HEADER_H + 8, size: 11, font: bold, color: CREAM });
    const countLabel = `${guestCount}/${table.capacity}`;
    const countW = bold.widthOfTextAtSize(countLabel, 10);
    page.drawText(countLabel, { x: x + COL_W - TABLE_CARD_PADDING - countW, y: y - CARD_HEADER_H + 9, size: 10, font: reg, color: CREAM });

    // Guest names
    let gy = y - CARD_HEADER_H - TABLE_CARD_PADDING - 4;
    for (const seat of table.seats) {
      page.drawText(`• ${seat.guest.name}`, { x: x + TABLE_CARD_PADDING + 4, y: gy, size: 10, font: reg, color: DARK });
      gy -= LINE_H;
    }
    if (guestCount === 0) {
      page.drawText("Aucun invité assigné", { x: x + TABLE_CARD_PADDING + 4, y: gy, size: 9, font: reg, color: rgb(0.6, 0.6, 0.6) });
    }

    y -= cardH + 12;

    if (col === 0) {
      col = 1;
      y += cardH + 12; // stay at same row level for right column
    } else {
      col = 0;
      y -= 0; // already decremented
    }
  }

  return doc.save();
}
