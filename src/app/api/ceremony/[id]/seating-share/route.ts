import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/ceremony/[id]/seating-share — generate or return existing token
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const ceremony = await db.ceremony.findUnique({
    where: { id },
    include: {
      wedding: {
        include: {
          coupleAccount: { select: { userId: true } },
          plannerAccount: { select: { userId: true } },
        },
      },
    },
  });

  if (!ceremony) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const userId = session.user.id;
  const owns =
    ceremony.wedding.coupleAccount?.userId === userId ||
    ceremony.wedding.plannerAccount?.userId === userId;

  if (!owns) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const token = ceremony.seatingShareToken ?? crypto.randomBytes(16).toString("hex");

  if (!ceremony.seatingShareToken) {
    await db.ceremony.update({ where: { id }, data: { seatingShareToken: token } });
  }

  const url = `/fr/seating/${token}`;
  return NextResponse.json({ token, url });
}
