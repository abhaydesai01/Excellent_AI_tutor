import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import { createOtp, verifyOtp, isOtpVerified } from "../../src/lib/otp";
import { sendOtpEmail } from "../../src/lib/email";
import { sendPasswordResetEmail } from "../../src/lib/email-templates";
import { logActivity } from "../../src/lib/activity";

export const authRoutes = Router();

// POST /api/auth/send-otp
authRoutes.post("/send-otp", async (req: Request, res: Response) => {
  try {
    const { email, type = "registration" } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    if (type === "registration") {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing?.emailVerified) {
        return res.status(409).json({ error: "Email already registered" });
      }
    }

    if (type === "login") {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: "No account found with this email" });
      }
    }

    const recent = await prisma.otp.findFirst({
      where: { email, type, createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    if (recent) {
      const waitSec = Math.ceil((recent.createdAt.getTime() + 60_000 - Date.now()) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSec}s before requesting another OTP` });
    }

    const otp = await createOtp(email, type);
    await sendOtpEmail(email, otp.code);

    return res.json({ message: "OTP sent successfully", expiresAt: otp.expiresAt });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
});

// POST /api/auth/verify-otp
authRoutes.post("/verify-otp", async (req: Request, res: Response) => {
  try {
    const { email, code, type = "registration" } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and OTP code are required" });
    }

    const isValid = await verifyOtp(email, code, type);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    return res.json({ message: "OTP verified successfully", verified: true });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ error: "Verification failed" });
  }
});

// POST /api/auth/register
authRoutes.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, batch } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.emailVerified) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const otpVerified = await isOtpVerified(email, "registration");
    if (!otpVerified) {
      return res.status(403).json({ error: "Email not verified. Please verify your email with OTP first." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (existing && !existing.emailVerified) {
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: { name, passwordHash, role: role || "student", batch: batch || null, emailVerified: true },
      });
      await prisma.otp.deleteMany({ where: { email, type: "registration" } });
      return res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    }

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: role || "student", batch: batch || null, emailVerified: true },
    });
    await prisma.otp.deleteMany({ where: { email, type: "registration" } });

    return res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/forgot-password
authRoutes.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.json({ success: true, message: "If an account exists, a reset code has been sent" });
    }

    const existing = await prisma.otp.findFirst({
      where: { email: email.toLowerCase().trim(), type: "password_reset", verified: false, createdAt: { gt: new Date(Date.now() - 60 * 1000) } },
    });
    if (existing) {
      return res.status(429).json({ error: "Please wait 60 seconds before requesting another code" });
    }

    const otp = await createOtp(email.toLowerCase().trim(), "password_reset");
    await sendPasswordResetEmail(email.toLowerCase().trim(), otp.code);

    return res.json({ success: true, message: "Reset code sent to your email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
});

// POST /api/auth/reset-password
authRoutes.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email?.trim() || !code?.trim() || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const isValid = await verifyOtp(email.toLowerCase().trim(), code, "password_reset");
    if (!isValid) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(404).json({ error: "Account not found" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await logActivity(user.id, "password_reset", "Password was reset via email OTP");

    return res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
});
