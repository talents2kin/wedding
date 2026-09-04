import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeddingAccess, canManageCollaborators, isOwner } from "@/lib/wedding-access";

type Params = { params: Promise<{ id: string; collaboratorId: string }> };

const patchSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

// ---------------------------------------------------------------------------
// PATCH /api/wedding/[id]/collaborators/[collaboratorId]
// Change collaborator role. Owner or Admin only.
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: weddingId, collaboratorId } = await params;

  const access = await getWeddingAccess(session.user.id, weddingId);
  if (!access || !canManageCollaborators(access.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const collaborator = await db.weddingCollaborator.findFirst({
    where: { id: collaboratorId, weddingId },
  });
  if (!collaborator) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Non-owner admins cannot promote someone to ADMIN (only owner can)
  if (parsed.data.role === "ADMIN" && !isOwner(access.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const updated = await db.weddingCollaborator.update({
    where: { id: collaboratorId },
    data: { role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/wedding/[id]/collaborators/[collaboratorId]
// Remove collaborator. Owner or Admin only. A collaborator can remove themselves.
// ---------------------------------------------------------------------------

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: weddingId, collaboratorId } = await params;

  const collaborator = await db.weddingCollaborator.findFirst({
    where: { id: collaboratorId, weddingId },
  });
  if (!collaborator) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Allow: owner, admin, or the collaborator themselves leaving
  const isSelf = collaborator.userId === session.user.id;
  if (!isSelf) {
    const access = await getWeddingAccess(session.user.id, weddingId);
    if (!access || !canManageCollaborators(access.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  await db.weddingCollaborator.delete({ where: { id: collaboratorId } });
  return new NextResponse(null, { status: 204 });
}
