import { ComplexityLevel } from "./complexity-classifier";

export interface ModelConfig {
  provider: "openai" | "anthropic";
  model: string;
  tier: number;
  maxTokens: number;
}

const MODEL_MAP: Record<ComplexityLevel, ModelConfig> = {
  easy: {
    provider: "openai",
    model: process.env.TIER1_MODEL || "gpt-4o-mini",
    tier: 1,
    maxTokens: 2048,
  },
  medium: {
    provider: "openai",
    model: process.env.TIER1_MODEL || "gpt-4o-mini",
    tier: 1,
    maxTokens: 2048,
  },
  hard: {
    provider: "openai",
    model: process.env.TIER2_MODEL || "gpt-4.1",
    tier: 2,
    maxTokens: 4096,
  },
  expert: {
    provider: "anthropic",
    model: process.env.TIER3_MODEL || "claude-opus-4-6",
    tier: 3,
    maxTokens: 4096,
  },
};

const FALLBACK_CHAIN: ComplexityLevel[] = ["easy", "medium", "hard", "expert"];

export function selectModel(complexity: ComplexityLevel): ModelConfig {
  return MODEL_MAP[complexity];
}

export function getFallbackModel(currentComplexity: ComplexityLevel): ModelConfig | null {
  const currentIndex = FALLBACK_CHAIN.indexOf(currentComplexity);
  if (currentIndex < FALLBACK_CHAIN.length - 1) {
    return MODEL_MAP[FALLBACK_CHAIN[currentIndex + 1]];
  }
  return null;
}

export function getModelForAnalytics(): ModelConfig {
  return MODEL_MAP.expert;
}
