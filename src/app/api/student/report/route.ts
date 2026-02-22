import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const doubts = await prisma.doubt.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, question: true, subject: true, topic: true,
        complexityLevel: true, confidenceScore: true, difficultyScore: true,
        status: true, rating: true, inputMode: true, modelUsed: true,
        responseTimeMs: true, followUpCount: true, createdAt: true,
      },
    });

    const total = doubts.length;
    const resolved = doubts.filter(d => d.status === "resolved").length;
    const todayCount = doubts.filter(d => d.createdAt >= todayStart).length;
    const weekCount = doubts.filter(d => d.createdAt >= weekStart).length;
    const monthCount = doubts.filter(d => d.createdAt >= monthStart).length;
    const voiceCount = doubts.filter(d => d.inputMode === "voice").length;
    const textCount = doubts.filter(d => d.inputMode === "text").length;
    const helpfulCount = doubts.filter(d => d.rating === "helpful").length;
    const ratedCount = doubts.filter(d => d.rating).length;

    // Subject breakdown
    const subjectMap: Record<string, { total: number; resolved: number; avgConfidence: number; confSum: number; confCount: number }> = {};
    doubts.forEach(d => {
      const s = d.subject || "Unknown";
      if (!subjectMap[s]) subjectMap[s] = { total: 0, resolved: 0, avgConfidence: 0, confSum: 0, confCount: 0 };
      subjectMap[s].total++;
      if (d.status === "resolved") subjectMap[s].resolved++;
      if (d.confidenceScore != null) {
        subjectMap[s].confSum += d.confidenceScore;
        subjectMap[s].confCount++;
      }
    });

    const subjects = Object.entries(subjectMap)
      .map(([subject, data]) => ({
        subject,
        total: data.total,
        resolved: data.resolved,
        avgConfidence: data.confCount > 0 ? Math.round((data.confSum / data.confCount) * 100) : 0,
        percentage: total > 0 ? Math.round((data.total / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Topic breakdown (top 10 weakest)
    const topicMap: Record<string, { total: number; confSum: number; confCount: number; subject: string }> = {};
    doubts.forEach(d => {
      const t = d.topic || "General";
      if (!topicMap[t]) topicMap[t] = { total: 0, confSum: 0, confCount: 0, subject: d.subject || "" };
      topicMap[t].total++;
      if (d.confidenceScore != null) {
        topicMap[t].confSum += d.confidenceScore;
        topicMap[t].confCount++;
      }
    });

    const weakTopics = Object.entries(topicMap)
      .map(([topic, data]) => ({
        topic,
        subject: data.subject,
        total: data.total,
        avgConfidence: data.confCount > 0 ? Math.round((data.confSum / data.confCount) * 100) : 50,
      }))
      .filter(t => t.avgConfidence < 60)
      .sort((a, b) => a.avgConfidence - b.avgConfidence)
      .slice(0, 8);

    const strongTopics = Object.entries(topicMap)
      .map(([topic, data]) => ({
        topic,
        subject: data.subject,
        total: data.total,
        avgConfidence: data.confCount > 0 ? Math.round((data.confSum / data.confCount) * 100) : 50,
      }))
      .filter(t => t.avgConfidence >= 70)
      .sort((a, b) => b.avgConfidence - a.avgConfidence)
      .slice(0, 8);

    // Weekly activity (last 8 weeks)
    const weeklyActivity: { week: string; count: number; avgConfidence: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const wStart = new Date(todayStart);
      wStart.setDate(wStart.getDate() - (i + 1) * 7);
      const wEnd = new Date(todayStart);
      wEnd.setDate(wEnd.getDate() - i * 7);
      const weekDoubts = doubts.filter(d => d.createdAt >= wStart && d.createdAt < wEnd);
      const avgConf = weekDoubts.length > 0
        ? weekDoubts.reduce((s, d) => s + (d.confidenceScore || 0), 0) / weekDoubts.length
        : 0;
      weeklyActivity.push({
        week: `W${8 - i}`,
        count: weekDoubts.length,
        avgConfidence: Math.round(avgConf * 100),
      });
    }

    // Streak (consecutive days with at least 1 doubt)
    let streak = 0;
    const dateSet = new Set(doubts.map(d => d.createdAt.toISOString().split("T")[0]));
    for (let i = 0; i < 60; i++) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      if (dateSet.has(d.toISOString().split("T")[0])) {
        streak++;
      } else if (i > 0) break;
    }

    // Complexity distribution
    const complexityDist: Record<string, number> = { easy: 0, medium: 0, hard: 0, expert: 0 };
    doubts.forEach(d => {
      if (d.complexityLevel && complexityDist[d.complexityLevel] !== undefined) {
        complexityDist[d.complexityLevel]++;
      }
    });

    // Average response time
    const responseTimes = doubts.filter(d => d.responseTimeMs).map(d => d.responseTimeMs!);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    // Recent 10
    const recentDoubts = doubts.slice(0, 10).map(d => ({
      id: d.id,
      question: d.question,
      subject: d.subject,
      topic: d.topic,
      status: d.status,
      rating: d.rating,
      inputMode: d.inputMode,
      confidenceScore: d.confidenceScore,
      createdAt: d.createdAt,
    }));

    return NextResponse.json({
      overview: {
        total, resolved, todayCount, weekCount, monthCount,
        voiceCount, textCount, helpfulCount, ratedCount,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        satisfactionRate: ratedCount > 0 ? Math.round((helpfulCount / ratedCount) * 100) : 0,
        avgResponseTime,
        streak,
      },
      subjects,
      weakTopics,
      strongTopics,
      weeklyActivity,
      complexityDist,
      recentDoubts,
    });
  } catch (error) {
    console.error("Student report error:", error);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}
