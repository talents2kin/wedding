import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ token: string }> };

// ---------------------------------------------------------------------------
// GET /api/invite/[token]
// Public — returns invite info so the accept page can display wedding name + role.
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const invite = await db.collaboratorInvite.findUnique({
    where: { token },
    include: { wedding: { select: { id: true, name: true, date: true } } },
  });

  if (!invite) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "already_accepted" }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "expired" }, { status: 410 });

  return NextResponse.json({
    weddingId: invite.wedding.id,
    weddingName: invite.wedding.name,
    weddingDate: invite.wedding.date,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
  });
}

// ---------------------------------------------------------------------------
// POST /api/invite/[token]/accept
// Authenticated — accepts the invite, creates a WeddingCollaborator record.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { token } = await params;

  const invite = await db.collaboratorInvite.findUnique({
    where: { token },
    include: { wedding: { select: { id: true, name: true } } },
  });

  if (!invite) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "already_accepted" }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "expired" }, { status: 410 });

  // Verify the logged-in user's email matches the invite
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  if (!user || user.email?.toLowerCase() !== invite.email) {
    return NextResponse.json({ error: "email_mismatch" }, { status: 403 });
  }

  // Check if already a collaborator (idempotent accept)
  const existing = await db.weddingCollaborator.findUnique({
    where: { weddingId_userId: { weddingId: invite.weddingId, userId: session.user.id } },
  });

  const [collaborator] = await db.$transaction([
    existing
      ? db.weddingCollaborator.update({
          where: { id: existing.id },
          data: { role: invite.role },
        })
      : db.weddingCollaborator.create({
          data: { weddingId: invite.weddingId, userId: session.user.id, role: invite.role },
        }),
    db.collaboratorInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ collaborator, weddingId: invite.weddingId }, { status: 201 });
}
