import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ token: string }> };

// ---------------------------------------------------------------------------
// GET /api/check-in/[token]
// Public — returns ceremony stats, check-in log, and guest list for search.
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const ceremony = await db.ceremony.findUnique({
    where: { checkInToken: token },
    include: {
      guestAssignments: {
        include: { guest: { select: { id: true, name: true } } },
      },
      checkIns: {
        include: { guest: { select: { id: true, name: true } } },
        orderBy: { arrivedAt: "desc" },
      },
    },
  });

  if (!ceremony) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ceremonyLabel =
    ceremony.customLabel ??
    ({ COUTUMIER: "Coutumier", CIVIL: "Civil", RELIGIEUX: "Religieux", CUSTOM: "Personnalisé" }[
      ceremony.type
    ] ??
      ceremony.type);

  const totalExpected = ceremony.guestAssignments.length;
  const arrivedCount = ceremony.checkIns.length;

  const guests = ceremony.guestAssignments.map((a) => ({
    id: a.guest.id,
    name: a.guest.name,
  }));

  const checkIns = ceremony.checkIns.map((c) => ({
    guestId: c.guestId,
    guestName: c.guest.name,
    arrivedAt: c.arrivedAt,
  }));

  return NextResponse.json({
    ceremonyLabel,
    totalExpected,
    arrivedCount,
    guests,
    checkIns,
  });
}
