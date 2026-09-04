import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

// ---------------------------------------------------------------------------
// GET /api/scheduled?weddingId=
// List pending scheduled notifications for a wedding.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const weddingId = new URL(req.url).searchParams.get("weddingId");
  if (!weddingId) return NextResponse.json({ error: "missing_params" }, { status: 400 });

  const access = await getWeddingAccess(session.user.id, weddingId);
  if (!access) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const items = await db.scheduledNotification.findMany({
    where: { weddingId, status: "PENDING" },
    include: {
      ceremony: { select: { type: true, customLabel: true, date: true } },
      guests: { select: { guestId: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({ items });
}

// ---------------------------------------------------------------------------
// POST /api/scheduled
// Create a new scheduled notification.
// ---------------------------------------------------------------------------

const CreateSchema = z.object({
  weddingId: z.string(),
  ceremonyId: z.string(),
  templateId: z.string(),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  guestIds: z.array(z.string()).min(1),
  scheduledAt: z.string().datetime(),
  customBody: z.string().optional().nullable(),
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

  if (new Date(data.scheduledAt) <= new Date()) {
    return NextResponse.json({ error: "scheduled_at_must_be_future" }, { status: 400 });
  }

  const notification = await db.scheduledNotification.create({
    data: {
      weddingId: data.weddingId,
      ceremonyId: data.ceremonyId,
      templateId: data.templateId,
      channel: data.channel,
      customBody: data.customBody ?? null,
      scheduledAt: new Date(data.scheduledAt),
      guests: {
        create: data.guestIds.map((guestId) => ({ guestId })),
      },
    },
  });

  return NextResponse.json(notification, { status: 201 });
}
