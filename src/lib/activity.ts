import prisma from "./prisma";

export async function logActivity(
  userId: string,
  action: string,
  details?: string,
  metadata?: Record<string, any>
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        details,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (e) {
    console.error("Activity log error:", e);
  }
}
