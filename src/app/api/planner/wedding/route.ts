import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const weddingSchema = z.object({
  name: z.string().min(1),
  date: z.string().date(),
});

function weddingStatus(date: Date): "upcoming" | "in-progress" | "past" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return "in-progress";
  if (d > today) return "upcoming";
  return "past";
}

// ---------------------------------------------------------------------------
// GET /api/planner/wedding — list all weddings for the authenticated planner
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const plannerAccount = await db.plannerAccount.findUnique({
    where: { userId: session.user.id },
  });

  if (!plannerAccount) {
    return NextResponse.json({ error: "no_planner_account" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weddings = await db.wedding.findMany({
    where: { plannerAccountId: plannerAccount.id },
    include: {
      _count: { select: { guests: true } },
      ceremonies: { orderBy: { date: "asc" } },
    },
    orderBy: { date: "asc" },
  });

  const result = weddings.map((w) => {
    // Use the next upcoming ceremony date for status + display; fall back to wedding date
    const nextCeremony =
      w.ceremonies.find((c) => c.date && new Date(c.date) >= today) ??
      w.ceremonies[0] ??
      null;
    const positionDate = nextCeremony?.date ?? w.date;
    return {
      id: w.id,
      name: w.name,
      date: w.date,
      guestCount: w._count.guests,
      nextCeremonyDate: nextCeremony?.date ?? null,
      status: weddingStatus(positionDate),
    };
  });

  return NextResponse.json({ weddings: result, weddingLimit: plannerAccount.weddingLimit });
}

// ---------------------------------------------------------------------------
// POST /api/planner/wedding — create a wedding for the authenticated planner
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

  const parsed = weddingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const plannerAccount = await db.plannerAccount.findUnique({
    where: { userId: session.user.id },
  });

  if (!plannerAccount) {
    return NextResponse.json({ error: "no_planner_account" }, { status: 403 });
  }

  const count = await db.wedding.count({ where: { plannerAccountId: plannerAccount.id } });
  if (count >= plannerAccount.weddingLimit) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 402 });
  }

  const wedding = await db.wedding.create({
    data: {
      name: parsed.data.name,
      date: new Date(parsed.data.date),
      plannerAccountId: plannerAccount.id,
    },
  });

  return NextResponse.json(
    { id: wedding.id, name: wedding.name, date: wedding.date },
    { status: 201 }
  );
}
