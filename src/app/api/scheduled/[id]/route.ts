import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// DELETE /api/scheduled/[id] — cancel a pending scheduled notification
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const notification = await db.scheduledNotification.findUnique({ where: { id } });

  if (!notification) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const access = await getWeddingAccess(session.user.id, notification.weddingId);
  if (!access || !canEdit(access.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (notification.status !== "PENDING") return NextResponse.json({ error: "not_pending" }, { status: 409 });

  await db.scheduledNotification.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return new NextResponse(null, { status: 204 });
}
