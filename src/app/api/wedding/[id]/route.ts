import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const patchSchema = z.object({
  senderName: z.string().min(1).nullable().optional(),
  name: z.string().min(1).optional(),
});

// ---------------------------------------------------------------------------
// PATCH /api/wedding/[id] — update wedding settings (senderName, name, …)
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const wedding = await db.wedding.findFirst({
    where: {
      id,
      OR: [
        { coupleAccount: { userId: session.user.id } },
        { plannerAccount: { userId: session.user.id } },
      ],
    },
  });
  if (!wedding) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "invalid_input", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updated = await db.wedding.update({
    where: { id },
    data: result.data,
  });

  return NextResponse.json({ id: updated.id, name: updated.name, senderName: updated.senderName });
}
