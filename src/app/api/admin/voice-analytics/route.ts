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

    const [totalDoubts, voiceDoubts, textDoubts, voiceResolved, textResolved, voiceAvgResponse, textAvgResponse, voiceHelpful, textHelpful, voiceRated, textRated] = await Promise.all([
      prisma.doubt.count(),
      prisma.doubt.count({ where: { inputMode: "voice" } }),
      prisma.doubt.count({ where: { inputMode: "text" } }),
      prisma.doubt.count({ where: { inputMode: "voice", status: "resolved" } }),
      prisma.doubt.count({ where: { inputMode: "text", status: "resolved" } }),
      prisma.doubt.aggregate({ _avg: { responseTimeMs: true }, where: { inputMode: "voice", responseTimeMs: { not: null } } }),
      prisma.doubt.aggregate({ _avg: { responseTimeMs: true }, where: { inputMode: "text", responseTimeMs: { not: null } } }),
      prisma.doubt.count({ where: { inputMode: "voice", rating: "helpful" } }),
      prisma.doubt.count({ where: { inputMode: "text", rating: "helpful" } }),
      prisma.doubt.count({ where: { inputMode: "voice", rating: { not: null } } }),
      prisma.doubt.count({ where: { inputMode: "text", rating: { not: null } } }),
    ]);

    return NextResponse.json({
      overview: {
        totalDoubts,
        voiceDoubts,
        textDoubts,
        voicePercent: totalDoubts > 0 ? Math.round((voiceDoubts / totalDoubts) * 100) : 0,
        textPercent: totalDoubts > 0 ? Math.round((textDoubts / totalDoubts) * 100) : 0,
      },
      performance: {
        voice: {
          total: voiceDoubts,
          resolved: voiceResolved,
          resolutionRate: voiceDoubts > 0 ? Math.round((voiceResolved / voiceDoubts) * 100) : 0,
          avgResponseMs: Math.round(voiceAvgResponse._avg.responseTimeMs || 0),
          satisfactionRate: voiceRated > 0 ? Math.round((voiceHelpful / voiceRated) * 100) : 0,
        },
        text: {
          total: textDoubts,
          resolved: textResolved,
          resolutionRate: textDoubts > 0 ? Math.round((textResolved / textDoubts) * 100) : 0,
          avgResponseMs: Math.round(textAvgResponse._avg.responseTimeMs || 0),
          satisfactionRate: textRated > 0 ? Math.round((textHelpful / textRated) * 100) : 0,
        },
      },
    });
  } catch (error) {
    console.error("Voice analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch voice analytics" }, { status: 500 });
  }
}
