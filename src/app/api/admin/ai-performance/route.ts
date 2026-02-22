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
      totalAnswered,
      resolved,
      unresolved,
      avgResponse,
      modelUsage,
      helpfulCount,
      notHelpfulCount,
      totalRated,
      complexityDistribution,
    ] = await Promise.all([
      prisma.doubt.count({ where: { aiResponse: { not: null } } }),
      prisma.doubt.count({ where: { status: "resolved" } }),
      prisma.doubt.count({ where: { status: "unresolved" } }),
      prisma.doubt.aggregate({ _avg: { responseTimeMs: true }, where: { responseTimeMs: { not: null } } }),
      prisma.doubt.groupBy({
        by: ["modelUsed"],
        _count: { id: true },
        _avg: { responseTimeMs: true, confidenceScore: true },
        where: { modelUsed: { not: null } },
      }),
      prisma.doubt.count({ where: { rating: "helpful" } }),
      prisma.doubt.count({ where: { rating: "not_helpful" } }),
      prisma.doubt.count({ where: { rating: { not: null } } }),
      prisma.doubt.groupBy({
        by: ["complexityLevel"],
        _count: { id: true },
        where: { complexityLevel: { not: null } },
      }),
    ]);

    const resolutionRate = totalAnswered > 0 ? Math.round((resolved / totalAnswered) * 100) : 0;
    const escalationRate = totalAnswered > 0 ? Math.round((unresolved / totalAnswered) * 100) : 0;
    const satisfactionRate = totalRated > 0 ? Math.round((helpfulCount / totalRated) * 100) : 0;

    const modelDetails = modelUsage.map(m => {
      const tierMap: Record<string, { tier: string; label: string }> = {
        "gpt-4o-mini": { tier: "Tier 1", label: "GPT-4o Mini" },
        "gpt-4.1": { tier: "Tier 2", label: "GPT-4.1" },
        "claude-opus-4-6": { tier: "Tier 3", label: "Claude Opus 4.6" },
      };
      const info = tierMap[m.modelUsed!] || { tier: "Unknown", label: m.modelUsed! };
      const total = modelUsage.reduce((sum, x) => sum + x._count.id, 0);
      return {
        model: m.modelUsed,
        ...info,
        count: m._count.id,
        percentage: total > 0 ? Math.round((m._count.id / total) * 100) : 0,
        avgResponseMs: Math.round(m._avg.responseTimeMs || 0),
        avgConfidence: +(m._avg.confidenceScore || 0).toFixed(2),
      };
    });

    return NextResponse.json({
      resolution: {
        totalAnswered,
        resolved,
        unresolved,
        resolutionRate,
        escalationRate,
        avgResponseTimeMs: Math.round(avgResponse._avg.responseTimeMs || 0),
      },
      models: modelDetails,
      feedback: {
        totalRated,
        helpful: helpfulCount,
        notHelpful: notHelpfulCount,
        satisfactionRate,
      },
      complexity: complexityDistribution.map(c => ({
        level: c.complexityLevel,
        count: c._count.id,
      })),
    });
  } catch (error) {
    console.error("AI performance error:", error);
    return NextResponse.json({ error: "Failed to fetch AI performance" }, { status: 500 });
  }
}
