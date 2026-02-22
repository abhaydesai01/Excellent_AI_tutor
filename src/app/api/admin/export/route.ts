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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "students";
    const format = searchParams.get("format") || "csv";
    const studentId = searchParams.get("studentId");

    let csvContent = "";

    if (type === "students") {
      const students = await prisma.user.findMany({
        where: { role: "student" },
        include: { _count: { select: { doubts: true } } },
      });
      csvContent = "Name,Email,Batch,Total Doubts,Joined\n";
      for (const s of students) {
        csvContent += `"${s.name}","${s.email}","${s.batch || ""}",${s._count.doubts},"${s.createdAt.toISOString()}"\n`;
      }
    } else if (type === "doubts") {
      const where: any = {};
      if (studentId) where.studentId = studentId;
      const doubts = await prisma.doubt.findMany({
        where,
        include: { student: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      csvContent = "Student,Question,Subject,Topic,Complexity,Model Used,Input Mode,Status,Rating,Response Time (ms),Date\n";
      for (const d of doubts) {
        csvContent += `"${d.student.name}","${d.question.replace(/"/g, '""')}","${d.subject || ""}","${d.topic || ""}","${d.complexityLevel || ""}","${d.modelUsed || ""}","${d.inputMode}","${d.status}","${d.rating || ""}",${d.responseTimeMs || ""},"${d.createdAt.toISOString()}"\n`;
      }
    } else if (type === "subjects") {
      const doubts = await prisma.doubt.findMany({
        where: { subject: { not: null } },
        select: { subject: true, topic: true, confidenceScore: true, status: true },
      });
      const map: Record<string, { count: number; confusion: number }> = {};
      for (const d of doubts) {
        const key = `${d.subject}|${d.topic || "General"}`;
        if (!map[key]) map[key] = { count: 0, confusion: 0 };
        map[key].count++;
        map[key].confusion += d.confidenceScore != null ? (1 - d.confidenceScore) : 0;
      }
      csvContent = "Subject,Topic,Total Doubts,Avg Confusion Score\n";
      for (const [key, data] of Object.entries(map)) {
        const [subject, topic] = key.split("|");
        const avgConfusion = data.count > 0 ? Math.round((data.confusion / data.count) * 100) : 0;
        csvContent += `"${subject}","${topic}",${data.count},${avgConfusion}%\n`;
      }
    }

    if (format === "csv") {
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${type}-report.csv"`,
        },
      });
    }

    return NextResponse.json({ content: csvContent, type, format });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
