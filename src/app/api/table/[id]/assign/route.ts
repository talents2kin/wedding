import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

// ---------------------------------------------------------------------------
// POST /api/table/[id]/assign — seat a guest at this table
// ---------------------------------------------------------------------------

const AssignSchema = z.object({ guestId: z.string() });

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: tableId } = await params;
  const table = await db.table.findUnique({ where: { id: tableId } });
  if (!table) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const access = await getWeddingAccess(session.user.id, table.weddingId);
  if (!access || !canEdit(access.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

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
