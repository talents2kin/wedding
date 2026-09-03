import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// POST /api/check-in
// Public endpoint — authenticated by the ceremony's checkInToken.
// Accepts either a raw QR payload or an explicit guestId.
// ---------------------------------------------------------------------------

const bodySchema = z.object({
  /** The ceremony's checkInToken (from the URL) */
  token: z.string().min(1),
  /** Raw QR string: "g:<guestId>|c:<ceremonyId>" */
  qr: z.string().optional(),
  /** Direct guestId for manual check-in */
  guestId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const result = bodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { token, qr, guestId: directGuestId } = result.data;

  // Resolve ceremony by token
  const ceremony = await db.ceremony.findUnique({
    where: { checkInToken: token },
  });
  if (!ceremony) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  // Resolve guestId — either from QR payload or direct
  let guestId: string | null = null;

  if (qr) {
    // Expected format: "g:<guestId>|c:<ceremonyId>"
    const qrPattern = /^g:([^|]+)\|c:(.+)$/;
    const match = qr.match(qrPattern);
    if (!match) {
      return NextResponse.json({ error: "invalid_qr" }, { status: 422 });
    }
    const [, parsedGuestId, parsedCeremonyId] = match;
    if (parsedCeremonyId !== ceremony.id) {
      return NextResponse.json({ error: "wrong_ceremony" }, { status: 422 });
    }
    guestId = parsedGuestId;
  } else if (directGuestId) {
    guestId = directGuestId;
  } else {
    return NextResponse.json({ error: "missing_guest" }, { status: 400 });
  }

  // Verify guest is assigned to this ceremony
  const assignment = await db.guestCeremony.findUnique({
    where: { guestId_ceremonyId: { guestId, ceremonyId: ceremony.id } },
    include: { guest: { select: { id: true, name: true } } },
  });

  if (!assignment) {
    return NextResponse.json({ error: "not_invited" }, { status: 404 });
  }

  // Check for duplicate
  const existing = await db.checkIn.findUnique({
    where: { guestId_ceremonyId: { guestId, ceremonyId: ceremony.id } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "already_checked_in", arrivedAt: existing.arrivedAt, guest: assignment.guest },
      { status: 409 }
    );
  }

  // Record check-in
  const checkIn = await db.checkIn.create({
    data: { guestId, ceremonyId: ceremony.id },
  });

  return NextResponse.json(
    { checkIn, guest: assignment.guest },
    { status: 201 }
  );
}
