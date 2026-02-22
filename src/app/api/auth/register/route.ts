import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { isOtpVerified } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, batch } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.emailVerified) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const otpVerified = await isOtpVerified(email, "registration");
    if (!otpVerified) {
      return NextResponse.json(
        { error: "Email not verified. Please verify your email with OTP first." },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (existing && !existing.emailVerified) {
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: { name, passwordHash, role: role || "student", batch: batch || null, emailVerified: true },
      });

      await prisma.otp.deleteMany({ where: { email, type: "registration" } });

      return NextResponse.json(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        { status: 201 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role || "student",
        batch: batch || null,
        emailVerified: true,
      },
    });

    await prisma.otp.deleteMany({ where: { email, type: "registration" } });

    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
