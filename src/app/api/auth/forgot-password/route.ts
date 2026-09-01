import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";

const schema = z.object({
  email: z.email(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Adresse e-mail invalide" }, { status: 400 });
  }

  const { email } = result.data;

  // Always return 200 to prevent user enumeration
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ success: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.verificationToken.upsert({
    where: { identifier_token: { identifier: email, token } },
    update: { expires },
    create: { identifier: email, token, expires },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  // TODO: replace with real email transport (e.g. Resend, Nodemailer)
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
  } else {
    // Email transport goes here
    console.warn("Email transport not configured — reset link not sent");
  }

  return NextResponse.json({ success: true });
}
