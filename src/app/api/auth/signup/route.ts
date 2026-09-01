import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const signUpSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = signUpSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "invalid_input", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, password } = result.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: { name, email, passwordHash },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
