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

    const [
      totalStudents,
      totalDoubts,
      resolvedDoubts,
      subjectDistribution,
      recentDoubts,
      modelUsage,
      dailyDoubts,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "student" } }),
      prisma.doubt.count(),
      prisma.doubt.count({ where: { status: "resolved" } }),
      prisma.doubt.groupBy({
        by: ["subject"],
        _count: { id: true },
        where: { subject: { not: null } },
      }),
      prisma.doubt.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { student: { select: { name: true, email: true } } },
      }),
      prisma.doubt.groupBy({
        by: ["modelUsed"],
        _count: { id: true },
        where: { modelUsed: { not: null } },
      }),
      prisma.doubt.groupBy({
        by: ["createdAt"],
        _count: { id: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const resolutionRate = totalDoubts > 0
      ? Math.round((resolvedDoubts / totalDoubts) * 100)
      : 0;

    return NextResponse.json({
      overview: {
        totalStudents,
        totalDoubts,
        resolvedDoubts,
        resolutionRate,
      },
      subjectDistribution: subjectDistribution.map((s) => ({
        subject: s.subject || "Unknown",
        count: s._count.id,
      })),
      modelUsage: modelUsage.map((m) => ({
        model: m.modelUsed || "Unknown",
        count: m._count.id,
      })),
      recentDoubts,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
