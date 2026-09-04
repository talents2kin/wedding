import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  addGuestId: z.string().optional(),
  removeGuestId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// PATCH /api/guest-group/[id] — rename or add/remove member
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

  const group = await db.guestGroup.findUnique({ where: { id } });
  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const access = await getWeddingAccess(session.user.id, group.weddingId);
  if (!access || !canEdit(access.role)) {
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

  const { name, addGuestId, removeGuestId } = result.data;

  if (addGuestId) {
    await db.guestGroupMember.upsert({
      where: { guestId_groupId: { guestId: addGuestId, groupId: id } },
      create: { guestId: addGuestId, groupId: id },
      update: {},
    });
  }

  if (removeGuestId) {
    await db.guestGroupMember.delete({
      where: { guestId_groupId: { guestId: removeGuestId, groupId: id } },
    });
  }

  if (name) {
    const updated = await db.guestGroup.update({ where: { id }, data: { name } });
    return NextResponse.json(updated);
  }

  return NextResponse.json(group);
}

// ---------------------------------------------------------------------------
// DELETE /api/guest-group/[id]
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

  const group = await db.guestGroup.findUnique({ where: { id } });
  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const access = await getWeddingAccess(session.user.id, group.weddingId);
  if (!access || !canEdit(access.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.guestGroup.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
