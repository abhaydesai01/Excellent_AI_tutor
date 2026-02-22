export type ComplexityLevel = "easy" | "medium" | "hard" | "expert";

interface ClassificationResult {
  level: ComplexityLevel;
  score: number;
  reasons: string[];
}

const EQUATION_PATTERNS = [
  /[=+\-*/^√∫∑∏]/,
  /\d+\s*[+\-*/^]\s*\d+/,
  /\\frac|\\int|\\sum|\\sqrt/,
  /\b(sin|cos|tan|log|ln|lim|derivative|integral)\b/i,
  /\b(equation|formula|solve|calculate|compute|evaluate)\b/i,
];

const HARD_KEYWORDS = [
  "jee advanced", "jee main", "neet", "derivation", "prove that",
  "multi-step", "complex", "advanced", "numerical", "integration",
  "differentiation", "organic mechanism", "quantum", "thermodynamics",
  "electromagnetic", "nuclear", "relativity",
];

const EXPERT_KEYWORDS = [
  "olympiad", "research", "graduate level", "phd", "advanced topology",
  "abstract algebra", "real analysis", "complex analysis",
];

export function classifyComplexity(question: string): ClassificationResult {
  const lower = question.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Length-based scoring
  if (question.length > 500) {
    score += 2;
    reasons.push("Long question text");
  } else if (question.length > 200) {
    score += 1;
    reasons.push("Medium-length question");
  }

  // Equation detection
  const equationCount = EQUATION_PATTERNS.filter(p => p.test(question)).length;
  if (equationCount >= 3) {
    score += 3;
    reasons.push("Multiple mathematical expressions detected");
  } else if (equationCount >= 1) {
    score += 1;
    reasons.push("Mathematical expressions detected");
  }

  // Hard keyword detection
  const hardMatches = HARD_KEYWORDS.filter(k => lower.includes(k));
  if (hardMatches.length > 0) {
    score += hardMatches.length * 2;
    reasons.push(`Advanced keywords: ${hardMatches.join(", ")}`);
  }

  // Expert keyword detection
  const expertMatches = EXPERT_KEYWORDS.filter(k => lower.includes(k));
  if (expertMatches.length > 0) {
    score += expertMatches.length * 3;
    reasons.push(`Expert-level keywords: ${expertMatches.join(", ")}`);
  }

  // Multi-step detection
  if (/step\s*[1-9]|part\s*[a-e(]/i.test(question)) {
    score += 2;
    reasons.push("Multi-step problem detected");
  }

  // Determine level
  let level: ComplexityLevel;
  if (score >= 8) {
    level = "expert";
  } else if (score >= 5) {
    level = "hard";
  } else if (score >= 2) {
    level = "medium";
  } else {
    level = "easy";
  }

  return { level, score, reasons };
}
