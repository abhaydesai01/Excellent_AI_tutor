import prisma from "./prisma";

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOtp(email: string, type: string = "registration") {
  await prisma.otp.deleteMany({
    where: { email, type },
  });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const otp = await prisma.otp.create({
    data: { email, code, type, expiresAt },
  });

  return otp;
}

export async function verifyOtp(email: string, code: string, type: string = "registration") {
  const otp = await prisma.otp.findFirst({
    where: {
      email,
      code,
      type,
      verified: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!otp) return false;

  await prisma.otp.update({
    where: { id: otp.id },
    data: { verified: true },
  });

  return true;
}

export async function isOtpVerified(email: string, type: string = "registration") {
  const otp = await prisma.otp.findFirst({
    where: {
      email,
      type,
      verified: true,
      expiresAt: { gt: new Date() },
    },
  });

  return !!otp;
}

export async function cleanupExpiredOtps() {
  await prisma.otp.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
