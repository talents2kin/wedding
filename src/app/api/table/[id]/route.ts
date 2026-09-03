import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

async function getTable(id: string, userId: string) {
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
  const table = await getTable(id, session.user.id);
  if (!table) return NextResponse.json({ error: "not_found" }, { status: 404 });

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
  const table = await getTable(id, session.user.id);
  if (!table) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.table.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
