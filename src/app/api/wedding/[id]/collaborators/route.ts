import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeddingAccess, canManageCollaborators } from "@/lib/wedding-access";
import { deliver } from "@/lib/delivery";

type Params = { params: Promise<{ id: string }> };

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

// ---------------------------------------------------------------------------
// GET /api/wedding/[id]/collaborators
// Returns current collaborators + pending invites. Owner or admin required.
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: weddingId } = await params;

  const access = await getWeddingAccess(session.user.id, weddingId);
  if (!access) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [collaborators, invites] = await Promise.all([
    db.weddingCollaborator.findMany({
      where: { weddingId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.collaboratorInvite.findMany({
      where: { weddingId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ collaborators, invites });
}

// ---------------------------------------------------------------------------
// POST /api/wedding/[id]/collaborators
// Invite a user by email + role. Owner or Admin only.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: weddingId } = await params;

  const access = await getWeddingAccess(session.user.id, weddingId);
  if (!access || !canManageCollaborators(access.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, role } = parsed.data;

  // Block inviting yourself
  const currentUser = await db.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  if (currentUser?.email?.toLowerCase() === email.toLowerCase()) {
    return NextResponse.json({ error: "cannot_invite_self" }, { status: 422 });
  }

  // Check if already a collaborator
  const targetUser = await db.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  if (targetUser) {
    const existing = await db.weddingCollaborator.findUnique({
      where: { weddingId_userId: { weddingId, userId: targetUser.id } },
    });
    if (existing) return NextResponse.json({ error: "already_collaborator" }, { status: 409 });
  }

  // Cancel any existing pending invite to this email for this wedding
  await db.collaboratorInvite.deleteMany({
    where: { weddingId, email: email.toLowerCase(), acceptedAt: null },
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await db.collaboratorInvite.create({
    data: {
      weddingId,
      email: email.toLowerCase(),
      role,
      expiresAt,
    },
  });

  // Send invite email (best-effort; the stub always succeeds)
  const baseUrl = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${invite.token}`;
  const roleLabel = { ADMIN: "Admin", EDITOR: "Éditeur", VIEWER: "Lecteur" }[role];

  await deliver({
    channel: "EMAIL",
    to: email,
    body: `Vous avez été invité à collaborer sur le mariage "${access.wedding.name}" en tant que ${roleLabel}.\n\nAcceptez l'invitation : ${inviteUrl}\n\nCe lien expire dans 7 jours.`,
    senderName: access.wedding.senderName ?? access.wedding.name,
  });

  return NextResponse.json({ invite }, { status: 201 });
}
