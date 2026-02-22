import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { calculateTtsCost, logAiUsage } from "@/lib/ai/cost-tracker";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, voice, voiceSessionId } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const cleanText = text
      .replace(/##\s*/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/-\s+/g, ". ")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .slice(0, 4096);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice || "nova",
      input: cleanText,
      speed: 1.0,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    if (voiceSessionId) {
      await prisma.voiceSession.update({
        where: { id: voiceSessionId },
        data: { ttsGenerated: true },
      }).catch(() => {});
    }

    const ttsCost = calculateTtsCost(cleanText.length);
    await logAiUsage({
      userId: session.user.id,
      service: "tts",
      model: "tts-1",
      provider: "openai",
      costUsd: ttsCost,
    });

    await logActivity(session.user.id, "voice_tts", "TTS audio generated", {
      voiceSessionId,
      textLength: cleanText.length,
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate speech" },
      { status: 500 }
    );
  }
}
