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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      totalStudents,
      totalDoubts,
      resolvedDoubts,
      doubtsToday,
      doubtsThisWeek,
      voiceDoubts,
      textDoubts,
      escalatedDoubts,
      todayActiveStudentIds,
      recentDoubts,
      subjectDistribution,
      modelUsage,
      avgResponseTime,
      unresolvedDoubts,
      helpfulRatings,
      notHelpfulRatings,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "student" } }),
      prisma.doubt.count(),
      prisma.doubt.count({ where: { status: "resolved" } }),
      prisma.doubt.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.doubt.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.doubt.count({ where: { inputMode: "voice" } }),
      prisma.doubt.count({ where: { inputMode: "text" } }),
      prisma.doubt.count({ where: { modelUsed: { in: ["claude-opus-4-6"] } } }),
      prisma.doubt.findMany({
        where: { createdAt: { gte: todayStart } },
        select: { studentId: true },
        distinct: ["studentId"],
      }),
      prisma.doubt.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { student: { select: { name: true, email: true, batch: true } } },
      }),
      prisma.doubt.groupBy({
        by: ["subject"],
        _count: { id: true },
        where: { subject: { not: null } },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.doubt.groupBy({
        by: ["modelUsed"],
        _count: { id: true },
        where: { modelUsed: { not: null } },
      }),
      prisma.doubt.aggregate({
        _avg: { responseTimeMs: true },
        where: { responseTimeMs: { not: null } },
      }),
      prisma.doubt.count({ where: { status: "unresolved" } }),
      prisma.doubt.count({ where: { rating: "helpful" } }),
      prisma.doubt.count({ where: { rating: "not_helpful" } }),
    ]);

    const resolutionRate = totalDoubts > 0 ? Math.round((resolvedDoubts / totalDoubts) * 100) : 0;
    const escalationRate = totalDoubts > 0 ? Math.round((escalatedDoubts / totalDoubts) * 100) : 0;
    const avgDoubtsPerStudent = totalStudents > 0 ? +(totalDoubts / totalStudents).toFixed(1) : 0;
    const voicePercent = totalDoubts > 0 ? Math.round((voiceDoubts / totalDoubts) * 100) : 0;
    const totalRated = helpfulRatings + notHelpfulRatings;
    const satisfactionRate = totalRated > 0 ? Math.round((helpfulRatings / totalRated) * 100) : 0;

    return NextResponse.json({
      overview: {
        totalStudents,
        activeStudentsToday: todayActiveStudentIds.length,
        totalDoubts,
        resolvedDoubts,
        unresolvedDoubts,
        doubtsToday,
        doubtsThisWeek,
        avgDoubtsPerStudent,
        voiceDoubts,
        textDoubts,
        voicePercent,
        resolutionRate,
        escalationRate,
        avgResponseTimeMs: Math.round(avgResponseTime._avg.responseTimeMs || 0),
        satisfactionRate,
      },
      subjectDistribution: subjectDistribution.map(s => ({
        subject: s.subject || "Unknown",
        count: s._count.id,
      })),
      modelUsage: modelUsage.map(m => ({
        model: m.modelUsed || "Unknown",
        count: m._count.id,
      })),
      recentDoubts,
    });
  } catch (error) {
    console.error("Overview error:", error);
    return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
  }
}
