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

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  mealPref: z.string().optional().nullable(),
  plusOneName: z.string().optional().nullable(),
  plusOnePhone: z.string().optional().nullable(),
  plusOneEmail: z.string().email().optional().nullable(),
  ceremonyIds: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// PATCH /api/guest/[id]
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const guest = await db.guest.findUnique({ where: { id } });
  if (!guest) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const wedding = await getOwnedWedding(session.user.id, guest.weddingId);
  if (!wedding) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "invalid_input", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { ceremonyIds, ...guestFields } = result.data;

  // Replace ceremony assignments when provided
  if (ceremonyIds !== undefined) {
    await db.guestCeremony.deleteMany({ where: { guestId: id } });
    if (ceremonyIds.length > 0) {
      await db.guestCeremony.createMany({
        data: ceremonyIds.map((ceremonyId) => ({ guestId: id, ceremonyId })),
      });
    }
  }

  const updated = await db.guest.update({
    where: { id },
    data: guestFields,
  });

  return NextResponse.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/guest/[id]
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const guest = await db.guest.findUnique({ where: { id } });
  if (!guest) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const wedding = await getOwnedWedding(session.user.id, guest.weddingId);
  if (!wedding) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.guest.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
