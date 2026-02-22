import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { calculateWhisperCost, logAiUsage } from "@/lib/ai/cost-tracker";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      response_format: "json",
    });

    const estimatedDurationMs = audioFile.size ? Math.round(audioFile.size / 16) : 30000;

    const voiceSession = await prisma.voiceSession.create({
      data: {
        userId: session.user.id,
        transcription: transcription.text,
        durationMs: estimatedDurationMs,
      },
    });

    const whisperCost = calculateWhisperCost(estimatedDurationMs);
    await logAiUsage({
      userId: session.user.id,
      service: "whisper-stt",
      model: "whisper-1",
      provider: "openai",
      costUsd: whisperCost,
      durationMs: estimatedDurationMs,
    });

    await logActivity(session.user.id, "voice_transcribe", "Voice input transcribed", {
      voiceSessionId: voiceSession.id,
      textLength: transcription.text.length,
    });

    return NextResponse.json({
      text: transcription.text,
      voiceSessionId: voiceSession.id,
      success: true,
    });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
