import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "educator", "mentor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = alerts.filter(a => !a.isRead).length;

    return NextResponse.json({
      alerts,
      unreadCount,
      summary: {
        critical: alerts.filter(a => a.severity === "critical" && !a.isRead).length,
        high: alerts.filter(a => a.severity === "high" && !a.isRead).length,
        medium: alerts.filter(a => a.severity === "medium" && !a.isRead).length,
        low: alerts.filter(a => a.severity === "low" && !a.isRead).length,
      },
    });
  } catch (error) {
    console.error("Alerts error:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "educator", "mentor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, isRead } = await req.json();

    if (id === "all") {
      await prisma.alert.updateMany({ data: { isRead: true } });
    } else {
      await prisma.alert.update({ where: { id }, data: { isRead: isRead ?? true } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Alert update error:", error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}
