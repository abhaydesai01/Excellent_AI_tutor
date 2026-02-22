import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createOtp } from "@/lib/otp";
import { sendPasswordResetEmail } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return NextResponse.json({ success: true, message: "If an account exists, a reset code has been sent" });
    }

    const existing = await prisma.otp.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        type: "password_reset",
        verified: false,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another code" },
        { status: 429 }
      );
    }

    const otp = await createOtp(email.toLowerCase().trim(), "password_reset");
    await sendPasswordResetEmail(email.toLowerCase().trim(), otp.code);

    return NextResponse.json({ success: true, message: "Reset code sent to your email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
