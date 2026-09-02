import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/ceremony/[id]/registration-link
// Generate (or return existing) public self-registration token for a ceremony.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: ceremonyId } = await params;

  const ceremony = await db.ceremony.findUnique({
    where: { id: ceremonyId },
    include: {
      wedding: {
        include: {
          coupleAccount: { select: { userId: true } },
          plannerAccount: { select: { userId: true } },
        },
      },
    },
  });

  if (!ceremony) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const userId = session.user.id;
  const owns =
    ceremony.wedding.coupleAccount?.userId === userId ||
    ceremony.wedding.plannerAccount?.userId === userId;

  if (!owns) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Return existing token or generate a new one
  const token =
    ceremony.registrationToken ??
    (await db.ceremony.update({
      where: { id: ceremonyId },
      data: { registrationToken: randomBytes(16).toString("hex") },
    })).registrationToken!;

  const baseUrl = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/fr/rsvp/${token}`;

  return NextResponse.json({ token, url });
}
