import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateDoubtResponse } from "@/lib/ai/generate-response";
import { logActivity } from "@/lib/activity";
import { sendDoubtResponseEmail } from "@/lib/email-templates";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success: rateLimitOk } = rateLimit(`doubt:${session.user.id}`, 20, 60 * 1000);
    if (!rateLimitOk) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }

    const { question, imageUrl, inputMode } = await req.json();
    if (!question?.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    const doubt = await prisma.doubt.create({
      data: {
        studentId: session.user.id,
        question,
        imageUrl: imageUrl || null,
        inputMode: inputMode || "text",
        status: "pending",
      },
    });

    const aiResult = await generateDoubtResponse(question, session.user.id, doubt.id);

    const updatedDoubt = await prisma.doubt.update({
      where: { id: doubt.id },
      data: {
        aiResponse: aiResult.response,
        subject: aiResult.topicClassification.subject,
        topic: aiResult.topicClassification.topic,
        subTopic: aiResult.topicClassification.subTopic,
        difficultyScore: aiResult.difficultyScore,
        confidenceScore: aiResult.confidenceScore,
        complexityLevel: aiResult.complexityLevel,
        modelUsed: aiResult.modelUsed,
        status: "resolved",
        responseTimeMs: Date.now() - startTime,
      },
    });

    await logActivity(session.user.id, "doubt_asked", `Asked: ${question.substring(0, 100)}`, {
      doubtId: updatedDoubt.id,
      subject: updatedDoubt.subject,
      topic: updatedDoubt.topic,
      inputMode: updatedDoubt.inputMode,
      modelUsed: updatedDoubt.modelUsed,
      responseTimeMs: updatedDoubt.responseTimeMs,
    });

    if (session.user.email && updatedDoubt.aiResponse) {
      sendDoubtResponseEmail({
        to: session.user.email,
        studentName: session.user.name || "Student",
        question: updatedDoubt.question,
        aiResponse: updatedDoubt.aiResponse,
        subject: updatedDoubt.subject,
        topic: updatedDoubt.topic,
        modelUsed: updatedDoubt.modelUsed,
        doubtId: updatedDoubt.id,
      }).catch(() => {});
    }

    return NextResponse.json(updatedDoubt, { status: 201 });
  } catch (error) {
    console.error("Doubt creation error:", error);
    return NextResponse.json(
      { error: "Failed to process doubt" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = { studentId: session.user.id };
    if (subject) where.subject = subject;
    if (status) where.status = status;

    const [doubts, total] = await Promise.all([
      prisma.doubt.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.doubt.count({ where }),
    ]);

    return NextResponse.json({ doubts, total });
  } catch (error) {
    console.error("Fetch doubts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch doubts" },
      { status: 500 }
    );
  }
}
