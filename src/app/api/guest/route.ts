import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Auth helper — returns the owned wedding or null
// ---------------------------------------------------------------------------

async function getOwnedWedding(userId: string, weddingId: string) {
  return db.wedding.findFirst({
    where: {
      id: weddingId,
      OR: [
        { coupleAccount: { userId } },
        { plannerAccount: { userId } },
      ],
    },
    include: {
      coupleAccount: { select: { guestCap: true } },
    },
  });
}

const RsvpEnum = z.enum(["PENDING", "CONFIRMED", "DECLINED"]);

const guestSchema = z.object({
  weddingId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  mealPref: z.string().optional(),
  plusOneName: z.string().optional(),
  plusOnePhone: z.string().optional(),
  plusOneEmail: z.string().email().optional(),
  ceremonyIds: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// GET /api/guest?weddingId=...&groupId=...&ceremonyId=...&rsvp=...
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

  const groupId = searchParams.get("groupId");
  const ceremonyId = searchParams.get("ceremonyId");
  const rsvp = RsvpEnum.safeParse(searchParams.get("rsvp")).data ?? null;

  const guests = await db.guest.findMany({
    where: {
      weddingId,
      ...(groupId && {
        groupMemberships: { some: { groupId } },
      }),
      ...(ceremonyId && {
        ceremonyAssignments: {
          some: {
            ceremonyId,
            ...(rsvp && { rsvp }),
          },
        },
      }),
      ...(!ceremonyId && rsvp && {
        ceremonyAssignments: { some: { rsvp } },
      }),
    },
    include: {
      ceremonyAssignments: true,
      groupMemberships: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ guests });
}

// ---------------------------------------------------------------------------
// POST /api/guest — create a guest
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const result = guestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "invalid_input", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { weddingId, ceremonyIds, ...guestData } = result.data;

  const wedding = await getOwnedWedding(session.user.id, weddingId);
  if (!wedding) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Enforce guest cap only for couple-owned weddings
  if (wedding.coupleAccount) {
    const count = await db.guest.count({ where: { weddingId } });
    if (count >= wedding.coupleAccount.guestCap) {
      return NextResponse.json({ error: "cap_exceeded" }, { status: 402 });
    }
  }

  const guest = await db.guest.create({
    data: { weddingId, ...guestData },
  });

  if (ceremonyIds && ceremonyIds.length > 0) {
    await db.guestCeremony.createMany({
      data: ceremonyIds.map((ceremonyId) => ({ guestId: guest.id, ceremonyId })),
    });
  }

  return NextResponse.json(guest, { status: 201 });
}
