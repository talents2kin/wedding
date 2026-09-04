import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

// ---------------------------------------------------------------------------
// POST /api/table — create a table
// ---------------------------------------------------------------------------

const CreateSchema = z.object({
  weddingId: z.string(),
  ceremonyId: z.string(),
  name: z.string().min(1).max(100),
  capacity: z.number().int().min(1).max(1000),
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

  const count = await db.table.count({ where: { ceremonyId: data.ceremonyId } });

  const table = await db.table.create({
    data: {
      weddingId: data.weddingId,
      ceremonyId: data.ceremonyId,
      name: data.name,
      capacity: data.capacity,
      position: count,
    },
    include: { seats: { include: { guest: { select: { id: true, name: true, gender: true, guestType: true } } } } },
  });

  return NextResponse.json(table, { status: 201 });
}
