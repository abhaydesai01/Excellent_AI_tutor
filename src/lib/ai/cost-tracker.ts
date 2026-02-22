import prisma from "../prisma";

// Pricing per 1M tokens (USD) — updated Feb 2026
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini":      { input: 0.15,  output: 0.60 },
  "gpt-4.1":          { input: 2.00,  output: 8.00 },
  "gpt-4.1-mini":     { input: 0.40,  output: 1.60 },
  "claude-opus-4-6":  { input: 15.00, output: 75.00 },
  "claude-sonnet-4":  { input: 3.00,  output: 15.00 },
};

// Fixed per-request pricing
const FIXED_PRICING: Record<string, number> = {
  "whisper-1": 0.006, // $0.006 per minute of audio
  "tts-1":     0.015, // $0.015 per 1K characters
  "tts-1-hd":  0.030, // $0.030 per 1K characters
};

export function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export function calculateWhisperCost(durationMs: number): number {
  const minutes = durationMs / 60_000;
  return minutes * FIXED_PRICING["whisper-1"];
}

export function calculateTtsCost(characterCount: number): number {
  return (characterCount / 1000) * FIXED_PRICING["tts-1"];
}

export async function logAiUsage(params: {
  userId?: string;
  doubtId?: string;
  service: string;
  model: string;
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd: number;
  durationMs?: number;
}) {
  try {
    const totalTokens = (params.inputTokens || 0) + (params.outputTokens || 0);
    await prisma.aiUsageLog.create({
      data: {
        userId: params.userId || null,
        doubtId: params.doubtId || null,
        service: params.service,
        model: params.model,
        provider: params.provider,
        inputTokens: params.inputTokens || 0,
        outputTokens: params.outputTokens || 0,
        totalTokens,
        costUsd: Math.round(params.costUsd * 1_000_000) / 1_000_000, // 6 decimal places
        durationMs: params.durationMs || null,
      },
    });
  } catch (e) {
    console.error("AI usage log error:", e);
  }
}
