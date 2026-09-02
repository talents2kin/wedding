import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { findTemplate } from "@/lib/templates";
import { generateInvitationPdf } from "@/lib/pdf";

// ---------------------------------------------------------------------------
// GET /api/pdf?guestId=&ceremonyId=&templateId=
// — Download a single PDF invitation for a guest-ceremony pair
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const guestId = searchParams.get("guestId");
  const ceremonyId = searchParams.get("ceremonyId");
  const templateId = searchParams.get("templateId");

  if (!guestId || !ceremonyId || !templateId) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const template = findTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: "invalid_template" }, { status: 400 });
  }

  // Fetch guest with wedding ownership info
  const guest = await db.guest.findUnique({
    where: { id: guestId },
    include: {
      wedding: {
        include: {
          coupleAccount: { select: { userId: true } },
          plannerAccount: { select: { userId: true } },
        },
      },
    },
  });

  if (!guest) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const userId = session.user.id;
  const owns =
    guest.wedding.coupleAccount?.userId === userId ||
    guest.wedding.plannerAccount?.userId === userId;

  if (!owns) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Fetch ceremony
  const ceremony = await db.ceremony.findUnique({ where: { id: ceremonyId } });

  // Check if there's a custom body from a sent invitation
  const invitation = await db.invitation.findFirst({
    where: { guestId, ceremonyId, templateId },
    orderBy: { createdAt: "desc" },
    select: { customBody: true },
  });

  const senderName = guest.wedding.senderName ?? guest.wedding.name;

  const pdfBytes = await generateInvitationPdf(
    { id: guest.id, name: guest.name, guestType: guest.guestType, gender: guest.gender },
    {
      id: ceremonyId,
      type: ceremony?.type ?? "CUSTOM",
      customLabel: ceremony?.customLabel ?? null,
      date: ceremony?.date ?? null,
      venue: ceremony?.venue ?? null,
    },
    template,
    senderName,
    invitation?.customBody ?? null
  );

  const safeName = guest.name.replace(/[^a-zA-Z0-9]/g, "_");
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invitation_${safeName}.pdf"`,
    },
  });
}
