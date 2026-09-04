import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

function combineDatetime(date: string | undefined, time: string | undefined): Date | undefined {
  if (!date) return undefined;
  const iso = time ? `${date}T${time}:00.000Z` : `${date}T00:00:00.000Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSchema = z
  .object({
    weddingId: z.string().min(1),
    type: z.enum(["COUTUMIER", "CIVIL", "RELIGIEUX", "CUSTOM"]),
    customLabel: z.string().min(1).optional(),
    date: z.string().date().optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    venue: z.string().optional(),
  })
  .refine(
    (d) => d.type !== "CUSTOM" || (d.customLabel && d.customLabel.length > 0),
    { message: "customLabel is required for CUSTOM type", path: ["customLabel"] }
  );

// ---------------------------------------------------------------------------
// GET /api/ceremony?weddingId=X — list ceremonies ordered by position
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const weddingId = req.nextUrl.searchParams.get("weddingId");
  if (!weddingId) {
    return NextResponse.json({ error: "missing_wedding_id" }, { status: 400 });
  }

  const access = await getWeddingAccess(session.user.id, weddingId);
  if (!access) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ceremonies = await db.ceremony.findMany({
    where: { weddingId },
    orderBy: { position: "asc" },
  });

  return NextResponse.json({ ceremonies });
}

// ---------------------------------------------------------------------------
// POST /api/ceremony — create a ceremony
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { weddingId, type, customLabel, date, time, venue } = parsed.data;

  const access = await getWeddingAccess(session.user.id, weddingId);
  if (!access || !canEdit(access.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Position = current count (append to end)
  const count = await db.ceremony.count({ where: { weddingId } });

  const ceremony = await db.ceremony.create({
    data: {
      weddingId,
      type,
      customLabel: type === "CUSTOM" ? customLabel : null,
      date: combineDatetime(date, time) ?? null,
      venue: venue ?? null,
      position: count,
    },
  });

  return NextResponse.json(ceremony, { status: 201 });
}
