import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** Fetch ceremony with ownership info and guest-assignment count. */
async function getCeremonyForUser(ceremonyId: string, userId: string) {
  const ceremony = await db.ceremony.findUnique({
    where: { id: ceremonyId },
    include: {
      wedding: {
        include: {
          coupleAccount: { select: { userId: true } },
          plannerAccount: { select: { userId: true } },
        },
      },
      _count: { select: { guestAssignments: true } },
    },
  });
  if (!ceremony) return null;

  const owns =
    ceremony.wedding.coupleAccount?.userId === userId ||
    ceremony.wedding.plannerAccount?.userId === userId;

  return owns ? ceremony : ("forbidden" as const);
}

const updateSchema = z
  .object({
    type: z.enum(["COUTUMIER", "CIVIL", "RELIGIEUX", "CUSTOM"]).optional(),
    customLabel: z.string().min(1).optional(),
    date: z.string().date().optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    venue: z.string().optional(),
  })
  .refine(
    (d) => d.type !== "CUSTOM" || d.customLabel,
    { message: "customLabel is required for CUSTOM type", path: ["customLabel"] }
  );

function combineDatetime(date: string | undefined, time: string | undefined): Date | undefined {
  if (!date) return undefined;
  const iso = time ? `${date}T${time}:00.000Z` : `${date}T00:00:00.000Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}

// ---------------------------------------------------------------------------
// PATCH /api/ceremony/[id]
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ceremony = await getCeremonyForUser(id, session.user.id);

  if (!ceremony) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (ceremony === "forbidden") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { type, customLabel, date, time, venue } = parsed.data;
  const effectiveType = type ?? ceremony.type;

  const updated = await db.ceremony.update({
    where: { id },
    data: {
      ...(type !== undefined && { type }),
      customLabel: effectiveType === "CUSTOM" ? (customLabel ?? ceremony.customLabel) : null,
      ...(date !== undefined && { date: combineDatetime(date, time) }),
      ...(venue !== undefined && { venue }),
    },
  });

  return NextResponse.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/ceremony/[id]
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ceremony = await getCeremonyForUser(id, session.user.id);

  if (!ceremony) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (ceremony === "forbidden") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const force = req.nextUrl.searchParams.get("force") === "true";
  const assignedCount = ceremony._count.guestAssignments;

  if (assignedCount > 0 && !force) {
    return NextResponse.json(
      { error: "guests_assigned", count: assignedCount },
      { status: 409 }
    );
  }

  await db.ceremony.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
