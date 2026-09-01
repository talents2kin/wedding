import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";

const forgotPasswordSchema = z.object({
  email: z.email(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = forgotPasswordSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const { email } = result.data;

  // Always return 200 to prevent user enumeration
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ success: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Delete any existing token for this identifier before creating a new one
  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.verificationToken.create({ data: { identifier: email, token, expires } });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  // TODO: wire a real email transport (e.g. Resend, Nodemailer via SMTP env vars)
  // Until then, the reset link is logged in development only.
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
  }

  return NextResponse.json({ success: true });
}
