import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendWeeklySummaryEmail } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "educator", "mentor"].includes((session.user as any).role)) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const students = await prisma.user.findMany({
      where: { role: "student", emailVerified: true },
      select: { id: true, name: true, email: true },
    });

    let sent = 0;
    let failed = 0;

    for (const student of students) {
      try {
        const weekDoubts = await prisma.doubt.findMany({
          where: { studentId: student.id, createdAt: { gte: weekStart } },
          select: { subject: true, topic: true, status: true, confidenceScore: true, createdAt: true },
        });

        if (weekDoubts.length === 0) continue;

        const resolved = weekDoubts.filter(d => d.status === "resolved").length;

        const subjectCounts: Record<string, number> = {};
        weekDoubts.forEach(d => {
          if (d.subject) subjectCounts[d.subject] = (subjectCounts[d.subject] || 0) + 1;
        });
        const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

        const topicConf: Record<string, { sum: number; count: number }> = {};
        weekDoubts.forEach(d => {
          if (d.topic && d.confidenceScore != null) {
            if (!topicConf[d.topic]) topicConf[d.topic] = { sum: 0, count: 0 };
            topicConf[d.topic].sum += d.confidenceScore;
            topicConf[d.topic].count++;
          }
        });
        const weakestTopic = Object.entries(topicConf)
          .map(([t, v]) => ({ t, avg: v.sum / v.count }))
          .sort((a, b) => a.avg - b.avg)[0]?.t || "";

        const allDates = new Set(weekDoubts.map(d => d.createdAt.toISOString().split("T")[0]));
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          if (allDates.has(d.toISOString().split("T")[0])) streak++;
          else if (i > 0) break;
        }

        const confScores = weekDoubts.filter(d => d.confidenceScore != null).map(d => d.confidenceScore!);
        const avgConf = confScores.length > 0
          ? Math.round((confScores.reduce((a, b) => a + b, 0) / confScores.length) * 100)
          : 0;

        await sendWeeklySummaryEmail({
          to: student.email,
          studentName: student.name,
          weekStats: {
            doubtsAsked: weekDoubts.length,
            resolved,
            topSubject,
            weakestTopic,
            streak,
            avgConfidence: avgConf,
          },
        });

        sent++;
      } catch (e) {
        console.error(`Failed to send weekly report to ${student.email}:`, e);
        failed++;
      }
    }

    return NextResponse.json({ success: true, sent, failed, total: students.length });
  } catch (error) {
    console.error("Weekly reports error:", error);
    return NextResponse.json({ error: "Failed to send reports" }, { status: 500 });
  }
}
