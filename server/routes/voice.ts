import { Router, Response } from "express";
import multer from "multer";
import { AuthRequest } from "../auth";
import prisma from "../../src/lib/prisma";
import OpenAI, { toFile } from "openai";
import { logActivity } from "../../src/lib/activity";
import { calculateWhisperCost, calculateTtsCost, logAiUsage } from "../../src/lib/ai/cost-tracker";

export const voiceRoutes = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// POST /api/voice/transcribe
voiceRoutes.post("/transcribe", upload.single("audio"), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    if (!req.file) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const file = await toFile(req.file.buffer, req.file.originalname || "audio.webm", {
      type: req.file.mimetype,
    });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
      response_format: "json",
    });

    const estimatedDurationMs = req.file.size ? Math.round(req.file.size / 16) : 30000;

    const voiceSession = await prisma.voiceSession.create({
      data: {
        userId: user.id,
        transcription: transcription.text,
        durationMs: estimatedDurationMs,
      },
    });

    const whisperCost = calculateWhisperCost(estimatedDurationMs);
    await logAiUsage({
      userId: user.id,
      service: "whisper-stt",
      model: "whisper-1",
      provider: "openai",
      costUsd: whisperCost,
      durationMs: estimatedDurationMs,
    });

    await logActivity(user.id, "voice_transcribe", "Voice input transcribed", {
      voiceSessionId: voiceSession.id,
      textLength: transcription.text.length,
    });

    return res.json({
      text: transcription.text,
      voiceSessionId: voiceSession.id,
      success: true,
    });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return res.status(500).json({ error: error?.message || "Failed to transcribe audio" });
  }
});

// POST /api/voice/tts
voiceRoutes.post("/tts", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { text, voice, voiceSessionId } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: "Text is required" });
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
      userId: user.id,
      service: "tts",
      model: "tts-1",
      provider: "openai",
      costUsd: ttsCost,
    });

    await logActivity(user.id, "voice_tts", "TTS audio generated", {
      voiceSessionId,
      textLength: cleanText.length,
    });

    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Length", buffer.length.toString());
    return res.send(buffer);
  } catch (error: any) {
    console.error("TTS error:", error);
    return res.status(500).json({ error: error?.message || "Failed to generate speech" });
  }
});
