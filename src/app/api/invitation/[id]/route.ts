import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { findTemplate, renderBody } from "@/lib/templates";
import { deliver } from "@/lib/delivery";

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/invitation/[id] — resend a failed invitation
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invitation = await db.invitation.findUnique({ where: { id } });
  if (!invitation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Verify wedding ownership
  const wedding = await db.wedding.findFirst({
    where: {
      id: invitation.weddingId,
      OR: [
        { coupleAccount: { userId: session.user.id } },
        { plannerAccount: { userId: session.user.id } },
      ],
    },
  });
  if (!wedding) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (invitation.status !== "FAILED") {
    return NextResponse.json({ error: "not_failed" }, { status: 409 });
  }

  // Fetch guest + ceremony for re-rendering
  const [guest, ceremony] = await Promise.all([
    db.guest.findUnique({ where: { id: invitation.guestId } }),
    db.ceremony.findUnique({ where: { id: invitation.ceremonyId } }),
  ]);

  const senderName = (wedding as { senderName?: string | null }).senderName ?? (wedding as { name: string }).name;
  const template = findTemplate(invitation.templateId);
  const bodyText = invitation.customBody ?? template?.bodyText ?? "";

  const genderPrefix =
    (guest as { guestType: string; gender: string | null } | null)?.guestType === "SINGLETON"
      ? (guest as { gender: string | null } | null)?.gender === "MR"
        ? "M."
        : (guest as { gender: string | null } | null)?.gender === "MME"
        ? "Mme"
        : ""
      : "";

  const ceremonyLabel = ceremony
    ? ceremony.type === "CUSTOM"
      ? ceremony.customLabel ?? "Cérémonie"
      : { COUTUMIER: "Coutumier", CIVIL: "Civil", RELIGIEUX: "Religieux" }[ceremony.type] ?? ceremony.type
    : "Cérémonie";

  const dateStr = ceremony?.date
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(ceremony.date)
    : "";

  const renderedBody = renderBody(bodyText, {
    guestName: guest?.name ?? "",
    genderPrefix,
    ceremonyLabel,
    date: dateStr,
    venue: ceremony?.venue ?? "",
    senderName,
  });

  const to = invitation.channel === "EMAIL" ? guest?.email ?? null : guest?.phone ?? null;
  const deliveryResult = await deliver({ channel: invitation.channel as "EMAIL" | "SMS" | "WHATSAPP", to, body: renderedBody, senderName });

  const updated = await db.invitation.update({
    where: { id },
    data: {
      status: deliveryResult.success ? "SENT" : "FAILED",
      sentAt: deliveryResult.success ? new Date() : invitation.sentAt,
    },
  });

  return NextResponse.json(updated);
}
