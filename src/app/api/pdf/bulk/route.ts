import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { findTemplate } from "@/lib/templates";
import { generateInvitationPdf } from "@/lib/pdf";

// ---------------------------------------------------------------------------
// GET /api/pdf/bulk?ceremonyId=&templateId=
// — Download a ZIP of PDF invitations for all guests in a ceremony
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ceremonyId = searchParams.get("ceremonyId");
  const templateId = searchParams.get("templateId");

  if (!ceremonyId || !templateId) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const template = findTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: "invalid_template" }, { status: 400 });
  }

  // Fetch ceremony with ownership info + assigned guest IDs
  const ceremony = await db.ceremony.findUnique({
    where: { id: ceremonyId },
    include: {
      wedding: {
        include: {
          coupleAccount: { select: { userId: true } },
          plannerAccount: { select: { userId: true } },
        },
      },
      guestAssignments: { select: { guestId: true } },
    },
  });

  if (!ceremony) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const userId = session.user.id;
  const owns =
    ceremony.wedding.coupleAccount?.userId === userId ||
    ceremony.wedding.plannerAccount?.userId === userId;

  if (!owns) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const guestIds = ceremony.guestAssignments.map((a) => a.guestId);

  const [guests, invitations] = await Promise.all([
    db.guest.findMany({
      where: { id: { in: guestIds } },
      select: { id: true, name: true, guestType: true, gender: true },
    }),
    db.invitation.findMany({
      where: { ceremonyId, templateId },
      select: { guestId: true, customBody: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Latest customBody per guest (if any)
  const customBodyMap = new Map<string, string | null>();
  for (const inv of invitations) {
    if (!customBodyMap.has(inv.guestId)) {
      customBodyMap.set(inv.guestId, inv.customBody);
    }
  }

  const senderName = ceremony.wedding.senderName ?? ceremony.wedding.name;
  const zip = new JSZip();

  await Promise.all(
    guests.map(async (guest) => {
      const pdfBytes = await generateInvitationPdf(
        { id: guest.id, name: guest.name, guestType: guest.guestType, gender: guest.gender },
        {
          id: ceremonyId,
          type: ceremony.type,
          customLabel: ceremony.customLabel,
          date: ceremony.date,
          venue: ceremony.venue,
        },
        template,
        senderName,
        customBodyMap.get(guest.id) ?? null
      );
      const safeName = guest.name.replace(/[^a-zA-Z0-9]/g, "_");
      zip.file(`invitation_${safeName}.pdf`, pdfBytes);
    })
  );

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });
  const weddingName = (ceremony.wedding as { name: string }).name.replace(/[^a-zA-Z0-9]/g, "_");

  return new NextResponse(Buffer.from(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="invitations_${weddingName}.zip"`,
    },
  });
}
