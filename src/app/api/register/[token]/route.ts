import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

type Params = { params: Promise<{ token: string }> };

// ---------------------------------------------------------------------------
// GET /api/register/[token]
// Public — return ceremony + wedding info for the self-registration form.
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const ceremony = await db.ceremony.findUnique({
    where: { registrationToken: token },
    include: {
      wedding: { select: { name: true, senderName: true } },
    },
  });

  if (!ceremony) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ceremony: {
      id: ceremony.id,
      type: ceremony.type,
      customLabel: ceremony.customLabel,
      date: ceremony.date?.toISOString() ?? null,
      venue: ceremony.venue,
    },
    wedding: {
      name: ceremony.wedding.name,
      senderName: ceremony.wedding.senderName,
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/register/[token]
// Public — upsert guest + RSVP for the ceremony scoped by this token.
// ---------------------------------------------------------------------------

const BodySchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  guestType: z.enum(["SINGLETON", "COUPLE"]).default("SINGLETON"),
  gender: z.enum(["MR", "MME"]).optional().nullable(),
  rsvp: z.enum(["CONFIRMED", "DECLINED"]).default("CONFIRMED"),
  mealPref: z.string().max(300).optional().nullable(),
  plusOneName: z.string().max(100).optional().nullable(),
  plusOnePhone: z.string().max(30).optional().nullable(),
  plusOneEmail: z.string().email().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;

  const ceremony = await db.ceremony.findUnique({
    where: { registrationToken: token },
  });

  if (!ceremony) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const weddingId = ceremony.weddingId;

  // Find existing guest by phone or email match within this wedding
  let existingGuest = null;
  if (data.phone || data.email) {
    existingGuest = await db.guest.findFirst({
      where: {
        weddingId,
        OR: [
          ...(data.phone ? [{ phone: data.phone }] : []),
          ...(data.email ? [{ email: data.email }] : []),
        ],
      },
    });
  }

  if (existingGuest) {
    // Update RSVP and meal preference — do not create a duplicate
    await Promise.all([
      db.guest.update({
        where: { id: existingGuest.id },
        data: {
          mealPref: data.mealPref ?? existingGuest.mealPref,
          plusOneName: data.plusOneName ?? existingGuest.plusOneName,
          plusOnePhone: data.plusOnePhone ?? existingGuest.plusOnePhone,
          plusOneEmail: data.plusOneEmail ?? existingGuest.plusOneEmail,
        },
      }),
      db.guestCeremony.upsert({
        where: { guestId_ceremonyId: { guestId: existingGuest.id, ceremonyId: ceremony.id } },
        create: { guestId: existingGuest.id, ceremonyId: ceremony.id, rsvp: data.rsvp },
        update: { rsvp: data.rsvp },
      }),
    ]);

    return NextResponse.json({ guestId: existingGuest.id, created: false });
  }

  // Cap check for new guests (only applies to couple accounts)
  const coupleAccount = await db.coupleAccount.findFirst({
    where: { wedding: { id: weddingId } },
    select: { guestCap: true },
  });
  if (coupleAccount) {
    const guestCount = await db.guest.count({ where: { weddingId } });
    if (guestCount >= coupleAccount.guestCap) {
      return NextResponse.json({ error: "guest_cap_reached" }, { status: 422 });
    }
  }

  // Create new guest + GuestCeremony assignment
  const newGuest = await db.guest.create({
    data: {
      name: data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      guestType: data.guestType,
      gender: data.guestType === "SINGLETON" ? (data.gender ?? null) : null,
      mealPref: data.mealPref ?? null,
      plusOneName: data.plusOneName ?? null,
      plusOnePhone: data.plusOnePhone ?? null,
      plusOneEmail: data.plusOneEmail ?? null,
      selfRegistered: true,
      weddingId,
      ceremonyAssignments: {
        create: { ceremonyId: ceremony.id, rsvp: data.rsvp },
      },
    },
  });

  return NextResponse.json({ guestId: newGuest.id, created: true }, { status: 201 });
}
