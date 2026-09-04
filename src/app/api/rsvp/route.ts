import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

const schema = z.object({
  guestId: z.string().min(1),
  ceremonyId: z.string().min(1),
  rsvp: z.enum(["PENDING", "CONFIRMED", "DECLINED"]),
});

// ---------------------------------------------------------------------------
// PATCH /api/rsvp — update RSVP status for a guest-ceremony pair
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "invalid_input", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { guestId, ceremonyId, rsvp } = result.data;

  const guestCeremony = await db.guestCeremony.findUnique({
    where: { guestId_ceremonyId: { guestId, ceremonyId } },
    include: { guest: { select: { weddingId: true } } },
  });
  if (!guestCeremony) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const access = await getWeddingAccess(session.user.id, guestCeremony.guest.weddingId);
  if (!access || !canEdit(access.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const updated = await db.guestCeremony.update({
    where: { guestId_ceremonyId: { guestId, ceremonyId } },
    data: { rsvp },
  });

  return NextResponse.json(updated);
}
