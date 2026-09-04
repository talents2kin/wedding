import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { findTemplate, renderBody } from "@/lib/templates";
import { deliver } from "@/lib/delivery";

import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

// ---------------------------------------------------------------------------
// GET /api/invitation?weddingId=
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

  const access = await getWeddingAccess(session.user.id, weddingId);
  if (!access) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const guestId = searchParams.get("guestId") ?? undefined;

  const invitations = await db.invitation.findMany({
    where: { weddingId, ...(guestId && { guestId }) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invitations });
}

// ---------------------------------------------------------------------------
// POST /api/invitation — bulk send
// ---------------------------------------------------------------------------

const sendSchema = z.object({
  weddingId: z.string().min(1),
  ceremonyId: z.string().min(1),
  templateId: z.string().min(1),
  guestIds: z.array(z.string().min(1)).min(1),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  customBody: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const result = sendSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "invalid_input", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { weddingId, ceremonyId, templateId, guestIds, channel, customBody } = result.data;

  // Validate template exists
  const template = findTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: "invalid_template" }, { status: 400 });
  }

  const access = await getWeddingAccess(session.user.id, weddingId);
  if (!access || !canEdit(access.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Fetch guests + ceremony for rendering
  const [guests, ceremony] = await Promise.all([
    db.guest.findMany({ where: { id: { in: guestIds }, weddingId } }),
    db.ceremony.findUnique({ where: { id: ceremonyId } }),
  ]);

  const senderName = access.wedding.senderName ?? access.wedding.name;
  const ceremonyLabel = ceremony
    ? ceremony.type === "CUSTOM"
      ? ceremony.customLabel ?? "Cérémonie"
      : { COUTUMIER: "Coutumier", CIVIL: "Civil", RELIGIEUX: "Religieux" }[ceremony.type] ?? ceremony.type
    : "Cérémonie";
  const dateStr = ceremony?.date
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(ceremony.date)
    : "";
  const venue = ceremony?.venue ?? "";

  let sent = 0;
  let failed = 0;

  for (const guest of guests) {
    const genderPrefix =
      (guest as { guestType: string; gender: string | null }).guestType === "SINGLETON"
        ? (guest as { gender: string | null }).gender === "MR"
          ? "M."
          : (guest as { gender: string | null }).gender === "MME"
          ? "Mme"
          : ""
        : "";

    const bodyText = customBody ?? template.bodyText;
    const renderedBody = renderBody(bodyText, {
      guestName: guest.name,
      genderPrefix,
      ceremonyLabel,
      date: dateStr,
      venue,
      senderName,
    });

    const to = channel === "EMAIL" ? guest.email : guest.phone;
    const deliveryResult = await deliver({ channel, to, body: renderedBody, senderName });

    await db.invitation.create({
      data: {
        weddingId,
        guestId: guest.id,
        ceremonyId,
        templateId,
        channel,
        customBody: customBody ?? null,
        status: deliveryResult.success ? "SENT" : "FAILED",
        sentAt: deliveryResult.success ? new Date() : null,
      },
    });

    if (deliveryResult.success) sent++;
    else failed++;
  }

  return NextResponse.json({ sent, failed }, { status: 201 });
}
