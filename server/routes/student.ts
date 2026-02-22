import { Router, Response } from "express";
import { AuthRequest } from "../auth";
import prisma from "../../src/lib/prisma";

export const studentRoutes = Router();

// GET /api/student/report
studentRoutes.get("/report", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
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

    const subjectMap: Record<string, { total: number; resolved: number; confSum: number; confCount: number }> = {};
    doubts.forEach(d => {
      const s = d.subject || "Unknown";
      if (!subjectMap[s]) subjectMap[s] = { total: 0, resolved: 0, confSum: 0, confCount: 0 };
      subjectMap[s].total++;
      if (d.status === "resolved") subjectMap[s].resolved++;
      if (d.confidenceScore != null) { subjectMap[s].confSum += d.confidenceScore; subjectMap[s].confCount++; }
    });

    const subjects = Object.entries(subjectMap)
      .map(([subject, data]) => ({
        subject, total: data.total, resolved: data.resolved,
        avgConfidence: data.confCount > 0 ? Math.round((data.confSum / data.confCount) * 100) : 0,
        percentage: total > 0 ? Math.round((data.total / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const topicMap: Record<string, { total: number; confSum: number; confCount: number; subject: string }> = {};
    doubts.forEach(d => {
      const t = d.topic || "General";
      if (!topicMap[t]) topicMap[t] = { total: 0, confSum: 0, confCount: 0, subject: d.subject || "" };
      topicMap[t].total++;
      if (d.confidenceScore != null) { topicMap[t].confSum += d.confidenceScore; topicMap[t].confCount++; }
    });

    const weakTopics = Object.entries(topicMap)
      .map(([topic, data]) => ({ topic, subject: data.subject, total: data.total, avgConfidence: data.confCount > 0 ? Math.round((data.confSum / data.confCount) * 100) : 50 }))
      .filter(t => t.avgConfidence < 60).sort((a, b) => a.avgConfidence - b.avgConfidence).slice(0, 8);

    const strongTopics = Object.entries(topicMap)
      .map(([topic, data]) => ({ topic, subject: data.subject, total: data.total, avgConfidence: data.confCount > 0 ? Math.round((data.confSum / data.confCount) * 100) : 50 }))
      .filter(t => t.avgConfidence >= 70).sort((a, b) => b.avgConfidence - a.avgConfidence).slice(0, 8);

    const weeklyActivity: { week: string; count: number; avgConfidence: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const wStart = new Date(todayStart); wStart.setDate(wStart.getDate() - (i + 1) * 7);
      const wEnd = new Date(todayStart); wEnd.setDate(wEnd.getDate() - i * 7);
      const wd = doubts.filter(d => d.createdAt >= wStart && d.createdAt < wEnd);
      const avgConf = wd.length > 0 ? wd.reduce((s, d) => s + (d.confidenceScore || 0), 0) / wd.length : 0;
      weeklyActivity.push({ week: `W${8 - i}`, count: wd.length, avgConfidence: Math.round(avgConf * 100) });
    }

    let streak = 0;
    const dateSet = new Set(doubts.map(d => d.createdAt.toISOString().split("T")[0]));
    for (let i = 0; i < 60; i++) {
      const d = new Date(todayStart); d.setDate(d.getDate() - i);
      if (dateSet.has(d.toISOString().split("T")[0])) streak++;
      else if (i > 0) break;
    }

    const complexityDist: Record<string, number> = { easy: 0, medium: 0, hard: 0, expert: 0 };
    doubts.forEach(d => { if (d.complexityLevel && complexityDist[d.complexityLevel] !== undefined) complexityDist[d.complexityLevel]++; });

    const responseTimes = doubts.filter(d => d.responseTimeMs).map(d => d.responseTimeMs!);
    const avgResponseTime = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;

    const recentDoubts = doubts.slice(0, 10).map(d => ({
      id: d.id, question: d.question, subject: d.subject, topic: d.topic,
      status: d.status, rating: d.rating, inputMode: d.inputMode,
      confidenceScore: d.confidenceScore, createdAt: d.createdAt,
    }));

    return res.json({
      overview: {
        total, resolved, todayCount, weekCount, monthCount,
        voiceCount, textCount, helpfulCount, ratedCount,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        satisfactionRate: ratedCount > 0 ? Math.round((helpfulCount / ratedCount) * 100) : 0,
        avgResponseTime, streak,
      },
      subjects, weakTopics, strongTopics, weeklyActivity, complexityDist, recentDoubts,
    });
  } catch (error) {
    console.error("Student report error:", error);
    return res.status(500).json({ error: "Failed to fetch report" });
  }
});
