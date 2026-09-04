import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

// ---------------------------------------------------------------------------
// GET /api/reminder?weddingId=
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const weddingId = new URL(req.url).searchParams.get("weddingId");
  if (!weddingId) return NextResponse.json({ error: "missing_params" }, { status: 400 });

  const access = await getWeddingAccess(session.user.id, weddingId);
  if (!access) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const reminders = await db.rsvpReminder.findMany({
    where: { weddingId },
    include: { ceremony: { select: { type: true, customLabel: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reminders });
}

// ---------------------------------------------------------------------------
// POST /api/reminder — create an RSVP reminder
// ---------------------------------------------------------------------------

const CreateSchema = z.object({
  weddingId: z.string(),
  ceremonyId: z.string(),
  templateId: z.string(),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  daysAfter: z.number().int().min(1).max(365),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const data = parsed.data;

  const access = await getWeddingAccess(session.user.id, data.weddingId);
  if (!access || !canEdit(access.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const reminder = await db.rsvpReminder.create({ data });

  return NextResponse.json(reminder, { status: 201 });
}
