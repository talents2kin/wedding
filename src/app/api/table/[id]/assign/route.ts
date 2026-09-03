import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

async function getTableWithAuth(id: string, userId: string) {
  const table = await db.table.findUnique({
    where: { id },
    include: {
      wedding: {
        include: {
          coupleAccount: { select: { userId: true } },
          plannerAccount: { select: { userId: true } },
        },
      },
    },
  });
  if (!table) return null;
  const owns =
    table.wedding.coupleAccount?.userId === userId ||
    table.wedding.plannerAccount?.userId === userId;
  return owns ? table : null;
}

// ---------------------------------------------------------------------------
// POST /api/table/[id]/assign — seat a guest at this table
// ---------------------------------------------------------------------------

const AssignSchema = z.object({ guestId: z.string() });

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: tableId } = await params;
  const table = await getTableWithAuth(tableId, session.user.id);
  if (!table) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = AssignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { guestId } = parsed.data;

  // Upsert: if guest already seated elsewhere, move them
  await db.tableSeat.upsert({
    where: { guestId },
    update: { tableId },
    create: { tableId, guestId },
  });

  return NextResponse.json({ tableId, guestId });
}
