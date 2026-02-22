import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "educator", "mentor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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
            followUps: {
              orderBy: { createdAt: "asc" },
              select: { id: true, question: true, answer: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const doubts = student.doubts;
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Subject & topic analysis
    const subjectCounts: Record<string, { total: number; confusion: number }> = {};
    const topicCounts: Record<string, { total: number; confusion: number; subject: string }> = {};
    let totalDifficulty = 0;
    let difficultyCount = 0;

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
      if (d.difficultyScore != null) {
        totalDifficulty += d.difficultyScore;
        difficultyCount++;
      }
    }

    // Weakness detection
    const weakSubjects = Object.entries(subjectCounts)
      .map(([subject, data]) => ({
        subject,
        totalDoubts: data.total,
        confusionPercent: data.total > 0 ? Math.round((data.confusion / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.confusionPercent - a.confusionPercent);

    const weakTopics = Object.entries(topicCounts)
      .map(([topic, data]) => ({
        topic,
        subject: data.subject,
        totalDoubts: data.total,
        confusionPercent: data.total > 0 ? Math.round((data.confusion / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.confusionPercent - a.confusionPercent);

    // Repeated doubts detection
    const topicRepeatCounts = Object.entries(topicCounts)
      .filter(([, data]) => data.total >= 3)
      .map(([topic, data]) => ({ topic, count: data.total }))
      .sort((a, b) => b.count - a.count);

    // Risk score calculation
    let riskScore = 0;
    const riskFactors: string[] = [];

    const lastDoubt = doubts[0];
    if (!lastDoubt) {
      riskScore += 25;
      riskFactors.push("No doubt activity recorded");
    } else if (lastDoubt.createdAt < thirtyDaysAgo) {
      riskScore += 25;
      riskFactors.push("Inactive for 30+ days");
    } else if (lastDoubt.createdAt < sevenDaysAgo) {
      riskScore += 10;
      riskFactors.push("Inactive for 7+ days");
    }

    if (topicRepeatCounts.length > 0) {
      riskScore += topicRepeatCounts.length * 10;
      riskFactors.push(`Repeated doubts in ${topicRepeatCounts.length} topics`);
    }

    const highDiffCount = doubts.filter(d => d.difficultyScore != null && d.difficultyScore >= 6).length;
    if (highDiffCount >= 5) {
      riskScore += 15;
      riskFactors.push(`${highDiffCount} high-difficulty questions`);
    }

    const unresolvedCount = doubts.filter(d => d.status === "unresolved").length;
    if (unresolvedCount >= 2) {
      riskScore += unresolvedCount * 5;
      riskFactors.push(`${unresolvedCount} unresolved doubts`);
    }

    const notHelpfulCount = doubts.filter(d => d.rating === "not_helpful").length;
    if (notHelpfulCount >= 2) {
      riskScore += 10;
      riskFactors.push(`${notHelpfulCount} responses rated unhelpful`);
    }

    riskScore = Math.min(riskScore, 100);

    // Doubts per week for trend
    const weeklyDoubts: Record<string, number> = {};
    for (const d of doubts) {
      const weekKey = getWeekKey(d.createdAt);
      weeklyDoubts[weekKey] = (weeklyDoubts[weekKey] || 0) + 1;
    }

    const trend = Object.entries(weeklyDoubts)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8);

    // Weekly confusion trend
    const weeklyConfusion: Record<string, { total: number; count: number }> = {};
    for (const d of doubts) {
      const weekKey = getWeekKey(d.createdAt);
      if (!weeklyConfusion[weekKey]) weeklyConfusion[weekKey] = { total: 0, count: 0 };
      if (d.confidenceScore != null) {
        weeklyConfusion[weekKey].total += (1 - d.confidenceScore);
        weeklyConfusion[weekKey].count++;
      }
    }

    const confusionTrend = Object.entries(weeklyConfusion)
      .map(([week, data]) => ({
        week,
        confusionPercent: data.count > 0 ? Math.round((data.total / data.count) * 100) : 0,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8);

    // Determine learning direction
    let learningTrend: "improving" | "stagnant" | "declining" = "stagnant";
    if (confusionTrend.length >= 2) {
      const recent = confusionTrend[confusionTrend.length - 1].confusionPercent;
      const older = confusionTrend[0].confusionPercent;
      if (recent < older - 5) learningTrend = "improving";
      else if (recent > older + 5) learningTrend = "declining";
    }

    // Timeline
    const timeline = doubts.map(d => ({
      id: d.id,
      date: d.createdAt,
      question: d.question,
      aiResponse: d.aiResponse,
      subject: d.subject,
      topic: d.topic,
      subTopic: d.subTopic,
      complexity: d.complexityLevel,
      status: d.status,
      modelUsed: d.modelUsed,
      confidenceScore: d.confidenceScore,
      inputMode: d.inputMode,
      rating: d.rating,
      responseTimeMs: d.responseTimeMs,
      followUps: d.followUps,
    }));

    const doubtsThisWeek = doubts.filter(d => d.createdAt >= sevenDaysAgo).length;

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        batch: student.batch,
        createdAt: student.createdAt,
        lastActive: lastDoubt?.createdAt || null,
      },
      overview: {
        totalDoubts: doubts.length,
        doubtsThisWeek,
        avgDifficulty: difficultyCount > 0 ? +(totalDifficulty / difficultyCount).toFixed(1) : 0,
        resolvedCount: doubts.filter(d => d.status === "resolved").length,
        unresolvedCount,
        voiceDoubts: doubts.filter(d => d.inputMode === "voice").length,
        textDoubts: doubts.filter(d => d.inputMode === "text").length,
      },
      weakness: {
        weakSubjects: weakSubjects.filter(s => s.confusionPercent > 30),
        weakTopics: weakTopics.filter(t => t.confusionPercent > 30),
        repeatedDoubts: topicRepeatCounts,
        overallConfusion: doubts.length > 0
          ? Math.round(doubts.reduce((sum, d) => sum + (d.confidenceScore != null ? (1 - d.confidenceScore) : 0), 0) / doubts.length * 100)
          : 0,
      },
      riskAssessment: {
        riskScore,
        riskLevel: riskScore >= 60 ? "critical" : riskScore >= 40 ? "high" : riskScore >= 20 ? "medium" : "low",
        factors: riskFactors,
        needsIntervention: riskScore >= 50,
      },
      trends: {
        learningTrend,
        doubtFrequency: trend,
        confusionTrend,
      },
      subjectDistribution: weakSubjects,
      topicDistribution: weakTopics.slice(0, 15),
      recentDoubts: doubts.slice(0, 10),
      timeline,
      allDoubts: doubts,
    });
  } catch (error) {
    console.error("Fetch student error:", error);
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}
