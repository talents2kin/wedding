import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const resetPasswordSchema = z.object({
  email: z.email(),
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = resetPasswordSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { email, token, password } = result.data;

  const verificationToken = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token } },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.$transaction([
    db.user.update({ where: { email }, data: { passwordHash } }),
    db.verificationToken.delete({
      where: { identifier_token: { identifier: email, token } },
    }),
  ]);

  return NextResponse.json({ success: true });
}
