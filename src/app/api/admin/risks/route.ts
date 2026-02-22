import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RiskStudent {
  id: string;
  name: string;
  email: string;
  batch: string | null;
  riskLevel: "high" | "medium" | "low";
  riskReasons: string[];
  totalDoubts: number;
  lastActive: Date | null;
}

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
            id: true,
            subject: true,
            topic: true,
            question: true,
            difficultyScore: true,
            confidenceScore: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const riskStudents: RiskStudent[] = [];

    for (const student of students) {
      const reasons: string[] = [];
      let riskScore = 0;

      // Check for inactivity
      const lastDoubt = student.doubts[0];
      if (!lastDoubt) {
        reasons.push("No doubt activity recorded");
        riskScore += 3;
      } else if (lastDoubt.createdAt < thirtyDaysAgo) {
        reasons.push("Inactive for 30+ days");
        riskScore += 3;
      } else if (lastDoubt.createdAt < sevenDaysAgo) {
        reasons.push("Inactive for 7+ days");
        riskScore += 1;
      }

      // Check for repeated topics (confusion indicator)
      const topicCounts: Record<string, number> = {};
      for (const d of student.doubts) {
        if (d.topic) topicCounts[d.topic] = (topicCounts[d.topic] || 0) + 1;
      }
      const repeatedTopics = Object.entries(topicCounts)
        .filter(([, count]) => count >= 3)
        .map(([topic]) => topic);
      if (repeatedTopics.length > 0) {
        reasons.push(`Repeated doubts in: ${repeatedTopics.join(", ")}`);
        riskScore += repeatedTopics.length * 2;
      }

      // Check for high difficulty scores
      const highDifficultyCount = student.doubts.filter(
        (d) => d.difficultyScore != null && d.difficultyScore >= 6
      ).length;
      if (highDifficultyCount >= 5) {
        reasons.push(`${highDifficultyCount} high-difficulty questions`);
        riskScore += 2;
      }

      // Check for low confidence scores
      const lowConfidenceCount = student.doubts.filter(
        (d) => d.confidenceScore != null && d.confidenceScore < 0.3
      ).length;
      if (lowConfidenceCount >= 3) {
        reasons.push(`${lowConfidenceCount} questions in unfamiliar areas`);
        riskScore += 2;
      }

      // Check for unresolved doubts
      const unresolvedCount = student.doubts.filter(
        (d) => d.status === "unresolved"
      ).length;
      if (unresolvedCount >= 3) {
        reasons.push(`${unresolvedCount} unresolved doubts`);
        riskScore += 2;
      }

      if (reasons.length > 0) {
        let riskLevel: "high" | "medium" | "low";
        if (riskScore >= 6) riskLevel = "high";
        else if (riskScore >= 3) riskLevel = "medium";
        else riskLevel = "low";

        riskStudents.push({
          id: student.id,
          name: student.name,
          email: student.email,
          batch: student.batch,
          riskLevel,
          riskReasons: reasons,
          totalDoubts: student.doubts.length,
          lastActive: lastDoubt?.createdAt || null,
        });
      }
    }

    riskStudents.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.riskLevel] - order[b.riskLevel];
    });

    return NextResponse.json({
      riskStudents,
      summary: {
        high: riskStudents.filter((s) => s.riskLevel === "high").length,
        medium: riskStudents.filter((s) => s.riskLevel === "medium").length,
        low: riskStudents.filter((s) => s.riskLevel === "low").length,
      },
    });
  } catch (error) {
    console.error("Risk detection error:", error);
    return NextResponse.json(
      { error: "Failed to fetch risk data" },
      { status: 500 }
    );
  }
}
