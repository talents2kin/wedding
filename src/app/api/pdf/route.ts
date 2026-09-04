import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { findTemplate } from "@/lib/templates";
import { generateInvitationPdf } from "@/lib/pdf";
import { getWeddingAccess } from "@/lib/wedding-access";

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

  // Fetch guest
  const guest = await db.guest.findUnique({ where: { id: guestId } });

  if (!guest) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const access = await getWeddingAccess(session.user.id, guest.weddingId);
  if (!access) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Fetch ceremony + optional custom body in parallel
  const [ceremony, invitation] = await Promise.all([
    db.ceremony.findUnique({ where: { id: ceremonyId } }),
    db.invitation.findFirst({
      where: { guestId, ceremonyId, templateId },
      orderBy: { createdAt: "desc" },
      select: { customBody: true },
    }),
  ]);

  const senderName = access.wedding.senderName ?? access.wedding.name;

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
