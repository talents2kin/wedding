import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// PATCH /api/reminder/[id] — enable or disable
// ---------------------------------------------------------------------------

const PatchSchema = z.object({ enabled: z.boolean() });

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const reminder = await db.rsvpReminder.findUnique({ where: { id } });
  if (!reminder) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const access = await getWeddingAccess(session.user.id, reminder.weddingId);
  if (!access || !canEdit(access.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const updated = await db.rsvpReminder.update({
    where: { id },
    data: { enabled: parsed.data.enabled },
  });

  return NextResponse.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/reminder/[id]
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const reminder = await db.rsvpReminder.findUnique({ where: { id } });
  if (!reminder) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const access = await getWeddingAccess(session.user.id, reminder.weddingId);
  if (!access || !canEdit(access.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await db.rsvpReminder.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
