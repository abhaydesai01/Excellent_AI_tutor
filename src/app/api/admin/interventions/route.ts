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

    const students = await prisma.user.findMany({
      where: { role: "student" },
      include: {
        doubts: {
          orderBy: { createdAt: "desc" },
          select: {
            subject: true, topic: true, difficultyScore: true,
            confidenceScore: true, status: true, createdAt: true, rating: true,
          },
        },
      },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const needsAttention: any[] = [];
    const topicStruggles: Record<string, { count: number; students: Set<string> }> = {};

    for (const student of students) {
      let riskScore = 0;
      const weakSubjects: Record<string, number> = {};
      const weakTopics: Record<string, number> = {};
      const reasons: string[] = [];

      const lastDoubt = student.doubts[0];
      if (!lastDoubt) {
        riskScore += 20;
        reasons.push("No activity recorded");
      } else if (lastDoubt.createdAt < thirtyDaysAgo) {
        riskScore += 25;
        reasons.push("Inactive for 30+ days");
      } else if (lastDoubt.createdAt < sevenDaysAgo) {
        riskScore += 10;
        reasons.push("Inactive for 7+ days");
      }

      const topicCounts: Record<string, number> = {};
      for (const d of student.doubts) {
        if (d.topic) topicCounts[d.topic] = (topicCounts[d.topic] || 0) + 1;
        if (d.confidenceScore != null && d.confidenceScore < 0.4 && d.subject) {
          weakSubjects[d.subject] = (weakSubjects[d.subject] || 0) + 1;
        }
        if (d.confidenceScore != null && d.confidenceScore < 0.4 && d.topic) {
          weakTopics[d.topic] = (weakTopics[d.topic] || 0) + 1;
          const key = `${d.subject}::${d.topic}`;
          if (!topicStruggles[key]) topicStruggles[key] = { count: 0, students: new Set() };
          topicStruggles[key].count++;
          topicStruggles[key].students.add(student.id);
        }
      }

      const repeatedTopics = Object.entries(topicCounts).filter(([, c]) => c >= 3);
      if (repeatedTopics.length > 0) {
        riskScore += repeatedTopics.length * 10;
        reasons.push(`Repeated doubts: ${repeatedTopics.map(([t]) => t).join(", ")}`);
      }

      const highDiffCount = student.doubts.filter(d => d.difficultyScore != null && d.difficultyScore >= 6).length;
      if (highDiffCount >= 5) {
        riskScore += 15;
        reasons.push(`${highDiffCount} high-difficulty questions`);
      }

      const unresolvedCount = student.doubts.filter(d => d.status === "unresolved").length;
      if (unresolvedCount >= 2) {
        riskScore += unresolvedCount * 5;
        reasons.push(`${unresolvedCount} unresolved doubts`);
      }

      const notHelpfulCount = student.doubts.filter(d => d.rating === "not_helpful").length;
      if (notHelpfulCount >= 2) {
        riskScore += 10;
        reasons.push(`${notHelpfulCount} responses rated unhelpful`);
      }

      riskScore = Math.min(riskScore, 100);

      if (riskScore >= 20) {
        const topWeakSubject = Object.entries(weakSubjects).sort(([,a],[,b]) => b - a)[0];
        needsAttention.push({
          id: student.id,
          name: student.name,
          email: student.email,
          batch: student.batch,
          riskScore,
          riskLevel: riskScore >= 60 ? "critical" : riskScore >= 40 ? "high" : riskScore >= 20 ? "medium" : "low",
          weakSubject: topWeakSubject ? topWeakSubject[0] : null,
          weakTopics: Object.entries(weakTopics).sort(([,a],[,b]) => b - a).slice(0, 3).map(([t]) => t),
          reasons,
          totalDoubts: student.doubts.length,
          lastActive: lastDoubt?.createdAt || null,
        });
      }
    }

    needsAttention.sort((a, b) => b.riskScore - a.riskScore);

    const conceptRecommendations = Object.entries(topicStruggles)
      .map(([key, data]) => {
        const [subject, topic] = key.split("::");
        return { subject, topic, studentsStruggling: data.students.size, totalDoubts: data.count };
      })
      .filter(c => c.studentsStruggling >= 2)
      .sort((a, b) => b.studentsStruggling - a.studentsStruggling)
      .slice(0, 10);

    const aiSuggestions = needsAttention
      .filter(s => s.riskScore >= 50)
      .slice(0, 5)
      .map(s => ({
        studentName: s.name,
        riskScore: s.riskScore,
        suggestion: s.weakTopics.length > 0
          ? `Student ${s.name} is struggling with ${s.weakTopics.join(", ")} repeatedly. Recommend personal mentoring session.`
          : `Student ${s.name} shows ${s.reasons[0]?.toLowerCase()}. Recommend intervention.`,
      }));

    return NextResponse.json({
      studentsNeedingAttention: needsAttention,
      conceptRecommendations,
      aiSuggestions,
      summary: {
        critical: needsAttention.filter(s => s.riskLevel === "critical").length,
        high: needsAttention.filter(s => s.riskLevel === "high").length,
        medium: needsAttention.filter(s => s.riskLevel === "medium").length,
      },
    });
  } catch (error) {
    console.error("Interventions error:", error);
    return NextResponse.json({ error: "Failed to fetch interventions" }, { status: 500 });
  }
}
