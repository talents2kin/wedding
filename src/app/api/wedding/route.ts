import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const weddingSchema = z.object({
  name: z.string().min(1),
  date: z.string().date(), // expects "YYYY-MM-DD"
});

// ---------------------------------------------------------------------------
// GET /api/wedding — fetch the current couple's wedding with counts
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const coupleAccount = await db.coupleAccount.findUnique({
    where: { userId: session.user.id },
    include: {
      wedding: {
        include: {
          _count: { select: { ceremonies: true, guests: true } },
        },
      },
    },
  });

  if (!coupleAccount) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!coupleAccount.wedding) {
    return NextResponse.json({ error: "no_wedding" }, { status: 404 });
  }

  const { wedding } = coupleAccount;

  const rsvpConfirmed = await db.guest.count({
    where: { weddingId: wedding.id, rsvp: "CONFIRMED" },
  });

  return NextResponse.json({
    id: wedding.id,
    name: wedding.name,
    date: wedding.date,
    ceremonies: wedding._count.ceremonies,
    guests: wedding._count.guests,
    rsvpConfirmed,
  });
}

// ---------------------------------------------------------------------------
// POST /api/wedding — create a wedding for the authenticated couple
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = weddingSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "invalid_input", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const coupleAccount = await db.coupleAccount.findUnique({
    where: { userId: session.user.id },
    include: { wedding: true },
  });

  if (!coupleAccount) {
    return NextResponse.json({ error: "no_couple_account" }, { status: 403 });
  }

  if (coupleAccount.wedding) {
    return NextResponse.json({ error: "wedding_exists" }, { status: 409 });
  }

  const wedding = await db.wedding.create({
    data: {
      name: result.data.name,
      date: new Date(result.data.date),
      coupleAccountId: coupleAccount.id,
    },
  });

  return NextResponse.json(
    { id: wedding.id, name: wedding.name, date: wedding.date },
    { status: 201 }
  );
}
