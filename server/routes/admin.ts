import { Router, Request, Response } from "express";
import { AuthRequest } from "../auth";
import prisma from "../../src/lib/prisma";
import { sendWeeklySummaryEmail } from "../../src/lib/email-templates";

export const adminRoutes = Router();

// ---------- GET /api/admin/overview ----------
adminRoutes.get("/overview", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      totalStudents, totalDoubts, resolvedDoubts, doubtsToday, doubtsThisWeek,
      voiceDoubts, textDoubts, escalatedDoubts, todayActiveStudentIds,
      recentDoubts, subjectDistribution, modelUsage, avgResponseTime,
      unresolvedDoubts, helpfulRatings, notHelpfulRatings,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "student" } }),
      prisma.doubt.count(),
      prisma.doubt.count({ where: { status: "resolved" } }),
      prisma.doubt.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.doubt.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.doubt.count({ where: { inputMode: "voice" } }),
      prisma.doubt.count({ where: { inputMode: "text" } }),
      prisma.doubt.count({ where: { modelUsed: { in: ["claude-opus-4-6"] } } }),
      prisma.doubt.findMany({ where: { createdAt: { gte: todayStart } }, select: { studentId: true }, distinct: ["studentId"] }),
      prisma.doubt.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { student: { select: { name: true, email: true, batch: true } } } }),
      prisma.doubt.groupBy({ by: ["subject"], _count: { id: true }, where: { subject: { not: null } }, orderBy: { _count: { id: "desc" } } }),
      prisma.doubt.groupBy({ by: ["modelUsed"], _count: { id: true }, where: { modelUsed: { not: null } } }),
      prisma.doubt.aggregate({ _avg: { responseTimeMs: true }, where: { responseTimeMs: { not: null } } }),
      prisma.doubt.count({ where: { status: "unresolved" } }),
      prisma.doubt.count({ where: { rating: "helpful" } }),
      prisma.doubt.count({ where: { rating: "not_helpful" } }),
    ]);

    const totalRated = helpfulRatings + notHelpfulRatings;
    return res.json({
      overview: {
        totalStudents, activeStudentsToday: todayActiveStudentIds.length,
        totalDoubts, resolvedDoubts, unresolvedDoubts, doubtsToday, doubtsThisWeek,
        avgDoubtsPerStudent: totalStudents > 0 ? +(totalDoubts / totalStudents).toFixed(1) : 0,
        voiceDoubts, textDoubts,
        voicePercent: totalDoubts > 0 ? Math.round((voiceDoubts / totalDoubts) * 100) : 0,
        resolutionRate: totalDoubts > 0 ? Math.round((resolvedDoubts / totalDoubts) * 100) : 0,
        escalationRate: totalDoubts > 0 ? Math.round((escalatedDoubts / totalDoubts) * 100) : 0,
        avgResponseTimeMs: Math.round(avgResponseTime._avg.responseTimeMs || 0),
        satisfactionRate: totalRated > 0 ? Math.round((helpfulRatings / totalRated) * 100) : 0,
      },
      subjectDistribution: subjectDistribution.map(s => ({ subject: s.subject || "Unknown", count: s._count.id })),
      modelUsage: modelUsage.map(m => ({ model: m.modelUsed || "Unknown", count: m._count.id })),
      recentDoubts,
    });
  } catch (error) {
    console.error("Overview error:", error);
    return res.status(500).json({ error: "Failed to fetch overview" });
  }
});

// ---------- GET /api/admin/students ----------
adminRoutes.get("/students", async (req: Request, res: Response) => {
  try {
    const { search, batch } = req.query;
    const where: any = { role: "student" };
    if (search) { where.OR = [{ name: { contains: search } }, { email: { contains: search } }]; }
    if (batch) where.batch = batch;

    const students = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, batch: true, createdAt: true, _count: { select: { doubts: true } } },
      orderBy: { name: "asc" },
    });
    return res.json(students);
  } catch (error) {
    console.error("Fetch students error:", error);
    return res.status(500).json({ error: "Failed to fetch students" });
  }
});

// ---------- GET /api/admin/students/:id ----------
adminRoutes.get("/students/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, batch: true, createdAt: true,
        doubts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, question: true, aiResponse: true, subject: true, topic: true, subTopic: true,
            complexityLevel: true, difficultyScore: true, confidenceScore: true,
            status: true, modelUsed: true, inputMode: true, rating: true,
            responseTimeMs: true, createdAt: true,
            followUps: { orderBy: { createdAt: "asc" }, select: { id: true, question: true, answer: true, createdAt: true } },
          },
        },
      },
    });

    if (!student) return res.status(404).json({ error: "Student not found" });

    const doubts = student.doubts;
    const now = new Date();
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const subjectCounts: Record<string, { total: number; confusion: number }> = {};
    const topicCounts: Record<string, { total: number; confusion: number; subject: string }> = {};
    let totalDifficulty = 0, difficultyCount = 0;

    for (const d of doubts) {
      if (d.subject) {
        if (!subjectCounts[d.subject]) subjectCounts[d.subject] = { total: 0, confusion: 0 };
        subjectCounts[d.subject].total++;
        subjectCounts[d.subject].confusion += d.confidenceScore != null ? (1 - d.confidenceScore) : 0;
      }
      if (d.topic) {
        if (!topicCounts[d.topic]) topicCounts[d.topic] = { total: 0, confusion: 0, subject: d.subject || "" };
        topicCounts[d.topic].total++;
        topicCounts[d.topic].confusion += d.confidenceScore != null ? (1 - d.confidenceScore) : 0;
      }
      if (d.difficultyScore != null) { totalDifficulty += d.difficultyScore; difficultyCount++; }
    }

    const weakSubjects = Object.entries(subjectCounts)
      .map(([subject, data]) => ({ subject, totalDoubts: data.total, confusionPercent: data.total > 0 ? Math.round((data.confusion / data.total) * 100) : 0 }))
      .sort((a, b) => b.confusionPercent - a.confusionPercent);

    const weakTopics = Object.entries(topicCounts)
      .map(([topic, data]) => ({ topic, subject: data.subject, totalDoubts: data.total, confusionPercent: data.total > 0 ? Math.round((data.confusion / data.total) * 100) : 0 }))
      .sort((a, b) => b.confusionPercent - a.confusionPercent);

    const topicRepeatCounts = Object.entries(topicCounts)
      .filter(([, data]) => data.total >= 3)
      .map(([topic, data]) => ({ topic, count: data.total }))
      .sort((a, b) => b.count - a.count);

    let riskScore = 0;
    const riskFactors: string[] = [];
    const lastDoubt = doubts[0];
    if (!lastDoubt) { riskScore += 25; riskFactors.push("No doubt activity recorded"); }
    else if (lastDoubt.createdAt < thirtyDaysAgo) { riskScore += 25; riskFactors.push("Inactive for 30+ days"); }
    else if (lastDoubt.createdAt < sevenDaysAgo) { riskScore += 10; riskFactors.push("Inactive for 7+ days"); }
    if (topicRepeatCounts.length > 0) { riskScore += topicRepeatCounts.length * 10; riskFactors.push(`Repeated doubts in ${topicRepeatCounts.length} topics`); }
    const highDiffCount = doubts.filter(d => d.difficultyScore != null && d.difficultyScore >= 6).length;
    if (highDiffCount >= 5) { riskScore += 15; riskFactors.push(`${highDiffCount} high-difficulty questions`); }
    const unresolvedCount = doubts.filter(d => d.status === "unresolved").length;
    if (unresolvedCount >= 2) { riskScore += unresolvedCount * 5; riskFactors.push(`${unresolvedCount} unresolved doubts`); }
    const notHelpfulCount = doubts.filter(d => d.rating === "not_helpful").length;
    if (notHelpfulCount >= 2) { riskScore += 10; riskFactors.push(`${notHelpfulCount} responses rated unhelpful`); }
    riskScore = Math.min(riskScore, 100);

    const weeklyDoubts: Record<string, number> = {};
    const weeklyConfusion: Record<string, { total: number; count: number }> = {};
    for (const d of doubts) {
      const wk = getWeekKey(d.createdAt);
      weeklyDoubts[wk] = (weeklyDoubts[wk] || 0) + 1;
      if (!weeklyConfusion[wk]) weeklyConfusion[wk] = { total: 0, count: 0 };
      if (d.confidenceScore != null) { weeklyConfusion[wk].total += (1 - d.confidenceScore); weeklyConfusion[wk].count++; }
    }
    const trend = Object.entries(weeklyDoubts).map(([week, count]) => ({ week, count })).sort((a, b) => a.week.localeCompare(b.week)).slice(-8);
    const confusionTrend = Object.entries(weeklyConfusion)
      .map(([week, data]) => ({ week, confusionPercent: data.count > 0 ? Math.round((data.total / data.count) * 100) : 0 }))
      .sort((a, b) => a.week.localeCompare(b.week)).slice(-8);

    let learningTrend: "improving" | "stagnant" | "declining" = "stagnant";
    if (confusionTrend.length >= 2) {
      const recent = confusionTrend[confusionTrend.length - 1].confusionPercent;
      const older = confusionTrend[0].confusionPercent;
      if (recent < older - 5) learningTrend = "improving";
      else if (recent > older + 5) learningTrend = "declining";
    }

    const timeline = doubts.map(d => ({
      id: d.id, date: d.createdAt, question: d.question, aiResponse: d.aiResponse,
      subject: d.subject, topic: d.topic, subTopic: d.subTopic,
      complexity: d.complexityLevel, status: d.status, modelUsed: d.modelUsed,
      confidenceScore: d.confidenceScore, inputMode: d.inputMode, rating: d.rating,
      responseTimeMs: d.responseTimeMs, followUps: d.followUps,
    }));

    return res.json({
      student: { id: student.id, name: student.name, email: student.email, batch: student.batch, createdAt: student.createdAt, lastActive: lastDoubt?.createdAt || null },
      overview: {
        totalDoubts: doubts.length, doubtsThisWeek: doubts.filter(d => d.createdAt >= sevenDaysAgo).length,
        avgDifficulty: difficultyCount > 0 ? +(totalDifficulty / difficultyCount).toFixed(1) : 0,
        resolvedCount: doubts.filter(d => d.status === "resolved").length, unresolvedCount,
        voiceDoubts: doubts.filter(d => d.inputMode === "voice").length,
        textDoubts: doubts.filter(d => d.inputMode === "text").length,
      },
      weakness: {
        weakSubjects: weakSubjects.filter(s => s.confusionPercent > 30),
        weakTopics: weakTopics.filter(t => t.confusionPercent > 30),
        repeatedDoubts: topicRepeatCounts,
        overallConfusion: doubts.length > 0 ? Math.round(doubts.reduce((sum, d) => sum + (d.confidenceScore != null ? (1 - d.confidenceScore) : 0), 0) / doubts.length * 100) : 0,
      },
      riskAssessment: { riskScore, riskLevel: riskScore >= 60 ? "critical" : riskScore >= 40 ? "high" : riskScore >= 20 ? "medium" : "low", factors: riskFactors, needsIntervention: riskScore >= 50 },
      trends: { learningTrend, doubtFrequency: trend, confusionTrend },
      subjectDistribution: weakSubjects, topicDistribution: weakTopics.slice(0, 15),
      recentDoubts: doubts.slice(0, 10), timeline, allDoubts: doubts,
    });
  } catch (error) {
    console.error("Fetch student error:", error);
    return res.status(500).json({ error: "Failed to fetch student" });
  }
});

// ---------- GET /api/admin/analytics ----------
adminRoutes.get("/analytics", async (_req: Request, res: Response) => {
  try {
    const [totalStudents, totalDoubts, resolvedDoubts, subjectDistribution, recentDoubts, modelUsage] = await Promise.all([
      prisma.user.count({ where: { role: "student" } }),
      prisma.doubt.count(),
      prisma.doubt.count({ where: { status: "resolved" } }),
      prisma.doubt.groupBy({ by: ["subject"], _count: { id: true }, where: { subject: { not: null } } }),
      prisma.doubt.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { student: { select: { name: true, email: true } } } }),
      prisma.doubt.groupBy({ by: ["modelUsed"], _count: { id: true }, where: { modelUsed: { not: null } } }),
    ]);

    return res.json({
      overview: { totalStudents, totalDoubts, resolvedDoubts, resolutionRate: totalDoubts > 0 ? Math.round((resolvedDoubts / totalDoubts) * 100) : 0 },
      subjectDistribution: subjectDistribution.map(s => ({ subject: s.subject || "Unknown", count: s._count.id })),
      modelUsage: modelUsage.map(m => ({ model: m.modelUsed || "Unknown", count: m._count.id })),
      recentDoubts,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ---------- GET /api/admin/ai-performance ----------
adminRoutes.get("/ai-performance", async (_req: Request, res: Response) => {
  try {
    const [totalAnswered, resolved, unresolved, avgResponse, modelUsage, helpfulCount, notHelpfulCount, totalRated, complexityDistribution] = await Promise.all([
      prisma.doubt.count({ where: { aiResponse: { not: null } } }),
      prisma.doubt.count({ where: { status: "resolved" } }),
      prisma.doubt.count({ where: { status: "unresolved" } }),
      prisma.doubt.aggregate({ _avg: { responseTimeMs: true }, where: { responseTimeMs: { not: null } } }),
      prisma.doubt.groupBy({ by: ["modelUsed"], _count: { id: true }, _avg: { responseTimeMs: true, confidenceScore: true }, where: { modelUsed: { not: null } } }),
      prisma.doubt.count({ where: { rating: "helpful" } }),
      prisma.doubt.count({ where: { rating: "not_helpful" } }),
      prisma.doubt.count({ where: { rating: { not: null } } }),
      prisma.doubt.groupBy({ by: ["complexityLevel"], _count: { id: true }, where: { complexityLevel: { not: null } } }),
    ]);

    const tierMap: Record<string, { tier: string; label: string }> = {
      "gpt-4o-mini": { tier: "Tier 1", label: "GPT-4o Mini" },
      "gpt-4.1": { tier: "Tier 2", label: "GPT-4.1" },
      "claude-opus-4-6": { tier: "Tier 3", label: "Claude Opus 4.6" },
    };
    const totalModels = modelUsage.reduce((s, x) => s + x._count.id, 0);
    const modelDetails = modelUsage.map(m => {
      const info = tierMap[m.modelUsed!] || { tier: "Unknown", label: m.modelUsed! };
      return { model: m.modelUsed, ...info, count: m._count.id, percentage: totalModels > 0 ? Math.round((m._count.id / totalModels) * 100) : 0, avgResponseMs: Math.round(m._avg.responseTimeMs || 0), avgConfidence: +(m._avg.confidenceScore || 0).toFixed(2) };
    });

    return res.json({
      resolution: { totalAnswered, resolved, unresolved, resolutionRate: totalAnswered > 0 ? Math.round((resolved / totalAnswered) * 100) : 0, escalationRate: totalAnswered > 0 ? Math.round((unresolved / totalAnswered) * 100) : 0, avgResponseTimeMs: Math.round(avgResponse._avg.responseTimeMs || 0) },
      models: modelDetails,
      feedback: { totalRated, helpful: helpfulCount, notHelpful: notHelpfulCount, satisfactionRate: totalRated > 0 ? Math.round((helpfulCount / totalRated) * 100) : 0 },
      complexity: complexityDistribution.map(c => ({ level: c.complexityLevel, count: c._count.id })),
    });
  } catch (error) {
    console.error("AI performance error:", error);
    return res.status(500).json({ error: "Failed to fetch AI performance" });
  }
});

// ---------- GET /api/admin/ai-costs ----------
adminRoutes.get("/ai-costs", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const allLogs = await prisma.aiUsageLog.findMany({ orderBy: { createdAt: "desc" } });

    const totalCost = allLogs.reduce((s, l) => s + l.costUsd, 0);
    const totalTokens = allLogs.reduce((s, l) => s + l.totalTokens, 0);
    const todayCost = allLogs.filter(l => l.createdAt >= todayStart).reduce((s, l) => s + l.costUsd, 0);
    const weekCost = allLogs.filter(l => l.createdAt >= weekStart).reduce((s, l) => s + l.costUsd, 0);
    const monthCost = allLogs.filter(l => l.createdAt >= monthStart).reduce((s, l) => s + l.costUsd, 0);

    const modelMap: Record<string, any> = {};
    const serviceMap: Record<string, any> = {};
    const providerMap: Record<string, any> = {};
    allLogs.forEach(l => {
      if (!modelMap[l.model]) modelMap[l.model] = { requests: 0, tokens: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
      modelMap[l.model].requests++; modelMap[l.model].tokens += l.totalTokens; modelMap[l.model].cost += l.costUsd; modelMap[l.model].inputTokens += l.inputTokens; modelMap[l.model].outputTokens += l.outputTokens;

      if (!serviceMap[l.service]) serviceMap[l.service] = { requests: 0, cost: 0, tokens: 0 };
      serviceMap[l.service].requests++; serviceMap[l.service].cost += l.costUsd; serviceMap[l.service].tokens += l.totalTokens;

      if (!providerMap[l.provider]) providerMap[l.provider] = { requests: 0, cost: 0, tokens: 0 };
      providerMap[l.provider].requests++; providerMap[l.provider].cost += l.costUsd; providerMap[l.provider].tokens += l.totalTokens;
    });

    const dailyCosts: Record<string, { date: string; cost: number; requests: number; tokens: number }> = {};
    for (let i = 29; i >= 0; i--) { const d = new Date(todayStart); d.setDate(d.getDate() - i); const k = d.toISOString().split("T")[0]; dailyCosts[k] = { date: k, cost: 0, requests: 0, tokens: 0 }; }
    allLogs.forEach(l => { const k = l.createdAt.toISOString().split("T")[0]; if (dailyCosts[k]) { dailyCosts[k].cost += l.costUsd; dailyCosts[k].requests++; dailyCosts[k].tokens += l.totalTokens; } });

    const studentCostMap: Record<string, { cost: number; requests: number }> = {};
    allLogs.forEach(l => { if (l.userId) { if (!studentCostMap[l.userId]) studentCostMap[l.userId] = { cost: 0, requests: 0 }; studentCostMap[l.userId].cost += l.costUsd; studentCostMap[l.userId].requests++; } });
    const topStudentIds = Object.entries(studentCostMap).sort((a, b) => b[1].cost - a[1].cost).slice(0, 10).map(([id]) => id);
    const topStudentUsers = topStudentIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: topStudentIds } }, select: { id: true, name: true, email: true, batch: true } }) : [];
    const topSpenders = topStudentIds.map(id => ({ ...topStudentUsers.find(u => u.id === id), ...studentCostMap[id] }));

    return res.json({
      summary: { totalCost, todayCost, weekCost, monthCost, totalTokens, totalRequests: allLogs.length, avgCostPerRequest: allLogs.length > 0 ? totalCost / allLogs.length : 0, avgTokensPerRequest: allLogs.length > 0 ? Math.round(totalTokens / allLogs.length) : 0 },
      costByModel: Object.entries(modelMap).map(([model, d]) => ({ model, ...d, avgCostPerRequest: d.requests > 0 ? d.cost / d.requests : 0 })).sort((a: any, b: any) => b.cost - a.cost),
      costByService: Object.entries(serviceMap).map(([service, d]) => ({ service, ...d })).sort((a: any, b: any) => b.cost - a.cost),
      costByProvider: Object.entries(providerMap).map(([provider, d]) => ({ provider, ...d })).sort((a: any, b: any) => b.cost - a.cost),
      dailyTrend: Object.values(dailyCosts),
      topSpenders,
      recentLogs: allLogs.slice(0, 20).map(l => ({ id: l.id, service: l.service, model: l.model, provider: l.provider, inputTokens: l.inputTokens, outputTokens: l.outputTokens, totalTokens: l.totalTokens, costUsd: l.costUsd, createdAt: l.createdAt })),
    });
  } catch (error) {
    console.error("AI costs error:", error);
    return res.status(500).json({ error: "Failed to fetch AI costs" });
  }
});

// ---------- GET /api/admin/alerts + PATCH ----------
adminRoutes.get("/alerts", async (_req: Request, res: Response) => {
  try {
    const alerts = await prisma.alert.findMany({ orderBy: { createdAt: "desc" } });
    const unreadCount = alerts.filter(a => !a.isRead).length;
    return res.json({
      alerts, unreadCount,
      summary: { critical: alerts.filter(a => a.severity === "critical" && !a.isRead).length, high: alerts.filter(a => a.severity === "high" && !a.isRead).length, medium: alerts.filter(a => a.severity === "medium" && !a.isRead).length, low: alerts.filter(a => a.severity === "low" && !a.isRead).length },
    });
  } catch (error) { console.error("Alerts error:", error); return res.status(500).json({ error: "Failed to fetch alerts" }); }
});

adminRoutes.patch("/alerts", async (req: Request, res: Response) => {
  try {
    const { id, isRead } = req.body;
    if (id === "all") await prisma.alert.updateMany({ data: { isRead: true } });
    else await prisma.alert.update({ where: { id }, data: { isRead: isRead ?? true } });
    return res.json({ success: true });
  } catch (error) { console.error("Alert update error:", error); return res.status(500).json({ error: "Failed to update alert" }); }
});

// ---------- GET /api/admin/interventions ----------
adminRoutes.get("/interventions", async (_req: Request, res: Response) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: "student" },
      include: { doubts: { orderBy: { createdAt: "desc" }, select: { subject: true, topic: true, difficultyScore: true, confidenceScore: true, status: true, createdAt: true, rating: true } } },
    });

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const needsAttention: any[] = [];
    const topicStruggles: Record<string, { count: number; students: Set<string> }> = {};

    for (const student of students) {
      let riskScore = 0; const weakSubjects: Record<string, number> = {}; const weakTopics: Record<string, number> = {}; const reasons: string[] = [];
      const lastDoubt = student.doubts[0];
      if (!lastDoubt) { riskScore += 20; reasons.push("No activity recorded"); }
      else if (lastDoubt.createdAt < thirtyDaysAgo) { riskScore += 25; reasons.push("Inactive for 30+ days"); }
      else if (lastDoubt.createdAt < sevenDaysAgo) { riskScore += 10; reasons.push("Inactive for 7+ days"); }

      const topicCnts: Record<string, number> = {};
      for (const d of student.doubts) {
        if (d.topic) topicCnts[d.topic] = (topicCnts[d.topic] || 0) + 1;
        if (d.confidenceScore != null && d.confidenceScore < 0.4 && d.subject) weakSubjects[d.subject] = (weakSubjects[d.subject] || 0) + 1;
        if (d.confidenceScore != null && d.confidenceScore < 0.4 && d.topic) {
          weakTopics[d.topic] = (weakTopics[d.topic] || 0) + 1;
          const key = `${d.subject}::${d.topic}`;
          if (!topicStruggles[key]) topicStruggles[key] = { count: 0, students: new Set() };
          topicStruggles[key].count++; topicStruggles[key].students.add(student.id);
        }
      }
      const repeatedTopics = Object.entries(topicCnts).filter(([, c]) => c >= 3);
      if (repeatedTopics.length > 0) { riskScore += repeatedTopics.length * 10; reasons.push(`Repeated doubts: ${repeatedTopics.map(([t]) => t).join(", ")}`); }
      if (student.doubts.filter(d => d.difficultyScore != null && d.difficultyScore >= 6).length >= 5) { riskScore += 15; reasons.push("Multiple high-difficulty questions"); }
      const uc = student.doubts.filter(d => d.status === "unresolved").length;
      if (uc >= 2) { riskScore += uc * 5; reasons.push(`${uc} unresolved doubts`); }
      if (student.doubts.filter(d => d.rating === "not_helpful").length >= 2) { riskScore += 10; reasons.push("Multiple unhelpful responses"); }
      riskScore = Math.min(riskScore, 100);

      if (riskScore >= 20) {
        const topWeak = Object.entries(weakSubjects).sort(([,a],[,b]) => b - a)[0];
        needsAttention.push({
          id: student.id, name: student.name, email: student.email, batch: student.batch, riskScore,
          riskLevel: riskScore >= 60 ? "critical" : riskScore >= 40 ? "high" : "medium",
          weakSubject: topWeak ? topWeak[0] : null,
          weakTopics: Object.entries(weakTopics).sort(([,a],[,b]) => b - a).slice(0, 3).map(([t]) => t),
          reasons, totalDoubts: student.doubts.length, lastActive: lastDoubt?.createdAt || null,
        });
      }
    }
    needsAttention.sort((a, b) => b.riskScore - a.riskScore);

    const conceptRecommendations = Object.entries(topicStruggles)
      .map(([key, data]) => { const [subject, topic] = key.split("::"); return { subject, topic, studentsStruggling: data.students.size, totalDoubts: data.count }; })
      .filter(c => c.studentsStruggling >= 2).sort((a, b) => b.studentsStruggling - a.studentsStruggling).slice(0, 10);

    return res.json({
      studentsNeedingAttention: needsAttention, conceptRecommendations,
      aiSuggestions: needsAttention.filter(s => s.riskScore >= 50).slice(0, 5).map(s => ({ studentName: s.name, riskScore: s.riskScore, suggestion: s.weakTopics.length > 0 ? `Student ${s.name} is struggling with ${s.weakTopics.join(", ")}. Recommend personal mentoring.` : `Student ${s.name} shows ${s.reasons[0]?.toLowerCase()}. Recommend intervention.` })),
      summary: { critical: needsAttention.filter(s => s.riskLevel === "critical").length, high: needsAttention.filter(s => s.riskLevel === "high").length, medium: needsAttention.filter(s => s.riskLevel === "medium").length },
    });
  } catch (error) { console.error("Interventions error:", error); return res.status(500).json({ error: "Failed to fetch interventions" }); }
});

// ---------- GET /api/admin/risks ----------
adminRoutes.get("/risks", async (_req: Request, res: Response) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: "student" },
      include: { doubts: { orderBy: { createdAt: "desc" }, select: { id: true, subject: true, topic: true, question: true, difficultyScore: true, confidenceScore: true, status: true, createdAt: true } } },
    });

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const riskStudents: any[] = [];

    for (const student of students) {
      const reasons: string[] = []; let riskScore = 0;
      const lastDoubt = student.doubts[0];
      if (!lastDoubt) { reasons.push("No doubt activity recorded"); riskScore += 3; }
      else if (lastDoubt.createdAt < thirtyDaysAgo) { reasons.push("Inactive for 30+ days"); riskScore += 3; }
      else if (lastDoubt.createdAt < sevenDaysAgo) { reasons.push("Inactive for 7+ days"); riskScore += 1; }

      const topicCnts: Record<string, number> = {};
      for (const d of student.doubts) { if (d.topic) topicCnts[d.topic] = (topicCnts[d.topic] || 0) + 1; }
      const repeated = Object.entries(topicCnts).filter(([, c]) => c >= 3).map(([t]) => t);
      if (repeated.length > 0) { reasons.push(`Repeated doubts in: ${repeated.join(", ")}`); riskScore += repeated.length * 2; }
      if (student.doubts.filter(d => d.difficultyScore != null && d.difficultyScore >= 6).length >= 5) { reasons.push("Multiple high-difficulty questions"); riskScore += 2; }
      const lowConf = student.doubts.filter(d => d.confidenceScore != null && d.confidenceScore < 0.3).length;
      if (lowConf >= 3) { reasons.push(`${lowConf} questions in unfamiliar areas`); riskScore += 2; }
      const unres = student.doubts.filter(d => d.status === "unresolved").length;
      if (unres >= 3) { reasons.push(`${unres} unresolved doubts`); riskScore += 2; }

      if (reasons.length > 0) {
        riskStudents.push({ id: student.id, name: student.name, email: student.email, batch: student.batch, riskLevel: riskScore >= 6 ? "high" : riskScore >= 3 ? "medium" : "low", riskReasons: reasons, totalDoubts: student.doubts.length, lastActive: lastDoubt?.createdAt || null });
      }
    }
    riskStudents.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.riskLevel as string]! - { high: 0, medium: 1, low: 2 }[b.riskLevel as string]!));

    return res.json({ riskStudents, summary: { high: riskStudents.filter(s => s.riskLevel === "high").length, medium: riskStudents.filter(s => s.riskLevel === "medium").length, low: riskStudents.filter(s => s.riskLevel === "low").length } });
  } catch (error) { console.error("Risk detection error:", error); return res.status(500).json({ error: "Failed to fetch risk data" }); }
});

// ---------- GET /api/admin/voice-analytics ----------
adminRoutes.get("/voice-analytics", async (_req: Request, res: Response) => {
  try {
    const [totalDoubts, voiceDoubts, textDoubts, voiceResolved, textResolved, voiceAvg, textAvg, voiceHelpful, textHelpful, voiceRated, textRated] = await Promise.all([
      prisma.doubt.count(), prisma.doubt.count({ where: { inputMode: "voice" } }), prisma.doubt.count({ where: { inputMode: "text" } }),
      prisma.doubt.count({ where: { inputMode: "voice", status: "resolved" } }), prisma.doubt.count({ where: { inputMode: "text", status: "resolved" } }),
      prisma.doubt.aggregate({ _avg: { responseTimeMs: true }, where: { inputMode: "voice", responseTimeMs: { not: null } } }),
      prisma.doubt.aggregate({ _avg: { responseTimeMs: true }, where: { inputMode: "text", responseTimeMs: { not: null } } }),
      prisma.doubt.count({ where: { inputMode: "voice", rating: "helpful" } }), prisma.doubt.count({ where: { inputMode: "text", rating: "helpful" } }),
      prisma.doubt.count({ where: { inputMode: "voice", rating: { not: null } } }), prisma.doubt.count({ where: { inputMode: "text", rating: { not: null } } }),
    ]);

    return res.json({
      overview: { totalDoubts, voiceDoubts, textDoubts, voicePercent: totalDoubts > 0 ? Math.round((voiceDoubts / totalDoubts) * 100) : 0, textPercent: totalDoubts > 0 ? Math.round((textDoubts / totalDoubts) * 100) : 0 },
      performance: {
        voice: { total: voiceDoubts, resolved: voiceResolved, resolutionRate: voiceDoubts > 0 ? Math.round((voiceResolved / voiceDoubts) * 100) : 0, avgResponseMs: Math.round(voiceAvg._avg.responseTimeMs || 0), satisfactionRate: voiceRated > 0 ? Math.round((voiceHelpful / voiceRated) * 100) : 0 },
        text: { total: textDoubts, resolved: textResolved, resolutionRate: textDoubts > 0 ? Math.round((textResolved / textDoubts) * 100) : 0, avgResponseMs: Math.round(textAvg._avg.responseTimeMs || 0), satisfactionRate: textRated > 0 ? Math.round((textHelpful / textRated) * 100) : 0 },
      },
    });
  } catch (error) { console.error("Voice analytics error:", error); return res.status(500).json({ error: "Failed to fetch voice analytics" }); }
});

// ---------- GET /api/admin/export ----------
adminRoutes.get("/export", async (req: Request, res: Response) => {
  try {
    const { type = "students", format = "csv", studentId } = req.query;
    let csvContent = "";

    if (type === "students") {
      const students = await prisma.user.findMany({ where: { role: "student" }, include: { _count: { select: { doubts: true } } } });
      csvContent = "Name,Email,Batch,Total Doubts,Joined\n";
      for (const s of students) csvContent += `"${s.name}","${s.email}","${s.batch || ""}",${s._count.doubts},"${s.createdAt.toISOString()}"\n`;
    } else if (type === "doubts") {
      const where: any = {}; if (studentId) where.studentId = studentId;
      const doubts = await prisma.doubt.findMany({ where, include: { student: { select: { name: true } } }, orderBy: { createdAt: "desc" } });
      csvContent = "Student,Question,Subject,Topic,Complexity,Model,Input,Status,Rating,ResponseMs,Date\n";
      for (const d of doubts) csvContent += `"${d.student.name}","${d.question.replace(/"/g, '""')}","${d.subject || ""}","${d.topic || ""}","${d.complexityLevel || ""}","${d.modelUsed || ""}","${d.inputMode}","${d.status}","${d.rating || ""}",${d.responseTimeMs || ""},"${d.createdAt.toISOString()}"\n`;
    } else if (type === "subjects") {
      const doubts = await prisma.doubt.findMany({ where: { subject: { not: null } }, select: { subject: true, topic: true, confidenceScore: true } });
      const map: Record<string, { count: number; confusion: number }> = {};
      for (const d of doubts) { const key = `${d.subject}|${d.topic || "General"}`; if (!map[key]) map[key] = { count: 0, confusion: 0 }; map[key].count++; map[key].confusion += d.confidenceScore != null ? (1 - d.confidenceScore) : 0; }
      csvContent = "Subject,Topic,Total Doubts,Avg Confusion\n";
      for (const [key, data] of Object.entries(map)) { const [s, t] = key.split("|"); csvContent += `"${s}","${t}",${data.count},${data.count > 0 ? Math.round((data.confusion / data.count) * 100) : 0}%\n`; }
    }

    if (format === "csv") {
      res.set("Content-Type", "text/csv");
      res.set("Content-Disposition", `attachment; filename="${type}-report.csv"`);
      return res.send(csvContent);
    }
    return res.json({ content: csvContent, type, format });
  } catch (error) { console.error("Export error:", error); return res.status(500).json({ error: "Failed to export data" }); }
});

// ---------- GET /api/admin/subjects ----------
adminRoutes.get("/subjects", async (_req: Request, res: Response) => {
  try {
    const doubts = await prisma.doubt.findMany({ where: { subject: { not: null } }, select: { subject: true, topic: true, difficultyScore: true, confidenceScore: true, status: true, studentId: true } });
    const subjectMap: Record<string, { doubts: number; totalConfusion: number; students: Set<string>; topics: Record<string, { doubts: number; totalConfusion: number; students: Set<string>; unresolved: number }>; unresolved: number }> = {};

    for (const d of doubts) {
      const subj = d.subject!;
      if (!subjectMap[subj]) subjectMap[subj] = { doubts: 0, totalConfusion: 0, students: new Set(), topics: {}, unresolved: 0 };
      const s = subjectMap[subj]; s.doubts++; s.totalConfusion += d.confidenceScore != null ? (1 - d.confidenceScore) : 0; s.students.add(d.studentId); if (d.status === "unresolved") s.unresolved++;
      if (d.topic) {
        if (!s.topics[d.topic]) s.topics[d.topic] = { doubts: 0, totalConfusion: 0, students: new Set(), unresolved: 0 };
        const t = s.topics[d.topic]; t.doubts++; t.totalConfusion += d.confidenceScore != null ? (1 - d.confidenceScore) : 0; t.students.add(d.studentId); if (d.status === "unresolved") t.unresolved++;
      }
    }

    const subjects = Object.entries(subjectMap).map(([subject, data]) => ({
      subject, totalDoubts: data.doubts, confusionScore: data.doubts > 0 ? Math.round((data.totalConfusion / data.doubts) * 100) : 0, studentsCount: data.students.size, unresolvedCount: data.unresolved,
      topics: Object.entries(data.topics).map(([topic, tData]) => ({ topic, totalDoubts: tData.doubts, confusionScore: tData.doubts > 0 ? Math.round((tData.totalConfusion / tData.doubts) * 100) : 0, studentsStruggling: tData.students.size, unresolvedCount: tData.unresolved })).sort((a, b) => b.confusionScore - a.confusionScore),
    })).sort((a, b) => b.confusionScore - a.confusionScore);

    return res.json({ subjects, mostDifficultTopics: subjects.flatMap(s => s.topics.map(t => ({ ...t, subject: s.subject }))).sort((a, b) => b.confusionScore - a.confusionScore).slice(0, 10) });
  } catch (error) { console.error("Subjects error:", error); return res.status(500).json({ error: "Failed to fetch subject analytics" }); }
});

// ---------- POST /api/admin/send-weekly-reports ----------
adminRoutes.post("/send-weekly-reports", async (req: AuthRequest, res: Response) => {
  try {
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
    const students = await prisma.user.findMany({ where: { role: "student", emailVerified: true }, select: { id: true, name: true, email: true } });

    let sent = 0, failed = 0;
    for (const student of students) {
      try {
        const weekDoubts = await prisma.doubt.findMany({ where: { studentId: student.id, createdAt: { gte: weekStart } }, select: { subject: true, topic: true, status: true, confidenceScore: true, createdAt: true } });
        if (weekDoubts.length === 0) continue;

        const subjectCounts: Record<string, number> = {};
        weekDoubts.forEach(d => { if (d.subject) subjectCounts[d.subject] = (subjectCounts[d.subject] || 0) + 1; });
        const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

        const topicConf: Record<string, { sum: number; count: number }> = {};
        weekDoubts.forEach(d => { if (d.topic && d.confidenceScore != null) { if (!topicConf[d.topic]) topicConf[d.topic] = { sum: 0, count: 0 }; topicConf[d.topic].sum += d.confidenceScore; topicConf[d.topic].count++; } });
        const weakestTopic = Object.entries(topicConf).map(([t, v]) => ({ t, avg: v.sum / v.count })).sort((a, b) => a.avg - b.avg)[0]?.t || "";

        const allDates = new Set(weekDoubts.map(d => d.createdAt.toISOString().split("T")[0]));
        let streak = 0; const today = new Date();
        for (let i = 0; i < 7; i++) { const d = new Date(today); d.setDate(d.getDate() - i); if (allDates.has(d.toISOString().split("T")[0])) streak++; else if (i > 0) break; }

        const confScores = weekDoubts.filter(d => d.confidenceScore != null).map(d => d.confidenceScore!);
        const avgConf = confScores.length > 0 ? Math.round((confScores.reduce((a, b) => a + b, 0) / confScores.length) * 100) : 0;

        await sendWeeklySummaryEmail({ to: student.email, studentName: student.name, weekStats: { doubtsAsked: weekDoubts.length, resolved: weekDoubts.filter(d => d.status === "resolved").length, topSubject, weakestTopic, streak, avgConfidence: avgConf } });
        sent++;
      } catch (e) { console.error(`Failed for ${student.email}:`, e); failed++; }
    }
    return res.json({ success: true, sent, failed, total: students.length });
  } catch (error) { console.error("Weekly reports error:", error); return res.status(500).json({ error: "Failed to send reports" }); }
});

function getWeekKey(date: Date): string {
  const d = new Date(date); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split("T")[0];
}
