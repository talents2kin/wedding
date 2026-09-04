import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/ceremony/[id]/check-in-link
// Generate (or return existing) staff check-in token for a ceremony.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: ceremonyId } = await params;

  const ceremony = await db.ceremony.findUnique({ where: { id: ceremonyId } });
  if (!ceremony) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const access = await getWeddingAccess(session.user.id, ceremony.weddingId);
  if (!access || !canEdit(access.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token =
    ceremony.checkInToken ??
    (
      await db.ceremony.update({
        where: { id: ceremonyId },
        data: { checkInToken: randomBytes(16).toString("hex") },
      })
    ).checkInToken!;

  const baseUrl =
    req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/check-in/${token}`;

  return NextResponse.json({ token, url });
}
