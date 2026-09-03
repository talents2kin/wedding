import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; guestId: string }> };

// ---------------------------------------------------------------------------
// DELETE /api/table/[id]/assign/[guestId] — unseat a guest
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: tableId, guestId } = await params;

  const seat = await db.tableSeat.findFirst({
    where: { tableId, guestId },
    include: {
      table: {
        include: {
          wedding: {
            include: {
              coupleAccount: { select: { userId: true } },
              plannerAccount: { select: { userId: true } },
            },
          },
        },
      },
    },
  });

  if (!seat) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const userId = session.user.id;
  const owns =
    seat.table.wedding.coupleAccount?.userId === userId ||
    seat.table.wedding.plannerAccount?.userId === userId;

  if (!owns) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await db.tableSeat.delete({ where: { guestId } });
  return new NextResponse(null, { status: 204 });
}
