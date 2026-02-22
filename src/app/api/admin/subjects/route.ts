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

    const doubts = await prisma.doubt.findMany({
      where: { subject: { not: null } },
      select: {
        subject: true,
        topic: true,
        difficultyScore: true,
        confidenceScore: true,
        status: true,
        studentId: true,
      },
    });

    const subjectMap: Record<string, {
      doubts: number;
      totalConfusion: number;
      students: Set<string>;
      topics: Record<string, { doubts: number; totalConfusion: number; students: Set<string>; unresolved: number }>;
      unresolved: number;
    }> = {};

    for (const d of doubts) {
      const subj = d.subject!;
      if (!subjectMap[subj]) {
        subjectMap[subj] = { doubts: 0, totalConfusion: 0, students: new Set(), topics: {}, unresolved: 0 };
      }
      const s = subjectMap[subj];
      s.doubts++;
      s.totalConfusion += d.confidenceScore != null ? (1 - d.confidenceScore) : 0;
      s.students.add(d.studentId);
      if (d.status === "unresolved") s.unresolved++;

      if (d.topic) {
        if (!s.topics[d.topic]) {
          s.topics[d.topic] = { doubts: 0, totalConfusion: 0, students: new Set(), unresolved: 0 };
        }
        const t = s.topics[d.topic];
        t.doubts++;
        t.totalConfusion += d.confidenceScore != null ? (1 - d.confidenceScore) : 0;
        t.students.add(d.studentId);
        if (d.status === "unresolved") t.unresolved++;
      }
    }

    const subjects = Object.entries(subjectMap)
      .map(([subject, data]) => ({
        subject,
        totalDoubts: data.doubts,
        confusionScore: data.doubts > 0 ? Math.round((data.totalConfusion / data.doubts) * 100) : 0,
        studentsCount: data.students.size,
        unresolvedCount: data.unresolved,
        topics: Object.entries(data.topics)
          .map(([topic, tData]) => ({
            topic,
            totalDoubts: tData.doubts,
            confusionScore: tData.doubts > 0 ? Math.round((tData.totalConfusion / tData.doubts) * 100) : 0,
            studentsStruggling: tData.students.size,
            unresolvedCount: tData.unresolved,
          }))
          .sort((a, b) => b.confusionScore - a.confusionScore),
      }))
      .sort((a, b) => b.confusionScore - a.confusionScore);

    const allTopics = subjects.flatMap(s =>
      s.topics.map(t => ({ ...t, subject: s.subject }))
    ).sort((a, b) => b.confusionScore - a.confusionScore);

    return NextResponse.json({
      subjects,
      mostDifficultTopics: allTopics.slice(0, 10),
    });
  } catch (error) {
    console.error("Subjects error:", error);
    return NextResponse.json({ error: "Failed to fetch subject analytics" }, { status: 500 });
  }
}
