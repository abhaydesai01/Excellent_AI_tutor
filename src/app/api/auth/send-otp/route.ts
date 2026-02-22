import { NextRequest, NextResponse } from "next/server";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import prisma from "@/lib/prisma";

const RATE_LIMIT_MS = 60_000; // 1 minute between OTP requests per email

export async function POST(req: NextRequest) {
  try {
    const { email, type = "registration" } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (type === "registration") {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing?.emailVerified) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }
    }

    if (type === "login") {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: "No account found with this email" }, { status: 404 });
      }
    }

    const recent = await prisma.otp.findFirst({
      where: {
        email,
        type,
        createdAt: { gt: new Date(Date.now() - RATE_LIMIT_MS) },
      },
    });

    if (recent) {
      const waitSec = Math.ceil((recent.createdAt.getTime() + RATE_LIMIT_MS - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSec}s before requesting another OTP` },
        { status: 429 }
      );
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("SMTP_USER or SMTP_PASS not set");
      return NextResponse.json({ error: "Email service is not configured. Contact support." }, { status: 500 });
    }

    const otp = await createOtp(email, type);
    await sendOtpEmail(email, otp.code);

    return NextResponse.json({ message: "OTP sent successfully", expiresAt: otp.expiresAt });
  } catch (error: any) {
    console.error("Send OTP error:", error);

    if (error?.code === "EAUTH" || error?.responseCode === 535) {
      return NextResponse.json({ error: "Email service authentication failed. Contact support." }, { status: 500 });
    }
    if (error?.code === "ESOCKET" || error?.code === "ECONNREFUSED") {
      return NextResponse.json({ error: "Cannot connect to email service. Please try again later." }, { status: 500 });
    }
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ error: "Email service is not configured. Contact support." }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Failed to send OTP. Please try again or contact support." },
      { status: 500 }
    );
  }
}
