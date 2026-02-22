import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateDoubtResponse } from "@/lib/ai/generate-response";
import { logActivity } from "@/lib/activity";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { question } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const doubt = await prisma.doubt.findUnique({ where: { id } });
    if (!doubt) {
      return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
    }

    const contextQuestion = `Context: The student previously asked "${doubt.question}" and received this answer. Now they have a follow-up question: ${question}`;
    const aiResult = await generateDoubtResponse(contextQuestion, session.user.id, id);

    const followUp = await prisma.followUp.create({
      data: {
        doubtId: id,
        question,
        answer: aiResult.response,
      },
    });

    await prisma.doubt.update({
      where: { id },
      data: { followUpCount: { increment: 1 } },
    });

    await logActivity(session.user.id, "followup_asked", `Follow-up on doubt`, {
      doubtId: id,
      followUpId: followUp.id,
    });

    return NextResponse.json(followUp, { status: 201 });
  } catch (error) {
    console.error("Follow-up error:", error);
    return NextResponse.json(
      { error: "Failed to process follow-up" },
      { status: 500 }
    );
  }
}
