import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// PATCH /api/table/[id] — rename or resize
// ---------------------------------------------------------------------------

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  capacity: z.number().int().min(1).max(1000).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const table = await db.table.findUnique({ where: { id } });
  if (!table) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const access = await getWeddingAccess(session.user.id, table.weddingId);
  if (!access || !canEdit(access.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const updated = await db.table.update({
    where: { id },
    data: parsed.data,
    include: { seats: { include: { guest: { select: { id: true, name: true, gender: true, guestType: true } } } } },
  });

  return NextResponse.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/table/[id]
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const table = await db.table.findUnique({ where: { id } });
  if (!table) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const access2 = await getWeddingAccess(session.user.id, table.weddingId);
  if (!access2 || !canEdit(access2.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await db.table.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
