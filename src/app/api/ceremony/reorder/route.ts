import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeddingAccess, canEdit } from "@/lib/wedding-access";

const reorderSchema = z.object({
  weddingId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { weddingId, orderedIds } = parsed.data;

  const access = await getWeddingAccess(session.user.id, weddingId);
  if (!access || !canEdit(access.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Update positions in a transaction
  await db.$transaction(
    orderedIds.map((id, position) =>
      db.ceremony.update({ where: { id, weddingId }, data: { position } })
    )
  );

  return NextResponse.json({ ok: true });
}
