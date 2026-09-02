import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOwnedWedding(userId: string, weddingId: string) {
  return db.wedding.findFirst({
    where: {
      id: weddingId,
      OR: [
        { coupleAccount: { userId } },
        { plannerAccount: { userId } },
      ],
    },
    include: { coupleAccount: { select: { guestCap: true } } },
  });
}

const createSchema = z.object({
  weddingId: z.string().min(1),
  name: z.string().min(1),
});

// ---------------------------------------------------------------------------
// GET /api/guest-group?weddingId=...
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const weddingId = searchParams.get("weddingId");
  if (!weddingId) {
    return NextResponse.json({ error: "missing_weddingId" }, { status: 400 });
  }

  const wedding = await getOwnedWedding(session.user.id, weddingId);
  if (!wedding) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const groups = await db.guestGroup.findMany({
    where: { weddingId },
    include: { members: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ groups });
}

// ---------------------------------------------------------------------------
// POST /api/guest-group
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "invalid_input", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { weddingId, name } = result.data;

  const wedding = await getOwnedWedding(session.user.id, weddingId);
  if (!wedding) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const group = await db.guestGroup.create({
    data: { weddingId, name },
  });

  return NextResponse.json(group, { status: 201 });
}
