import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { classifyComplexity, ComplexityLevel } from "./complexity-classifier";
import { selectModel, getFallbackModel, ModelConfig } from "./model-router";
import { classifyTopic, TopicClassification } from "./topic-classifier";
import { calculateTokenCost, logAiUsage } from "./cost-tracker";

const SYSTEM_PROMPT = `You are an expert academic tutor for Indian students preparing for NEET, JEE Main, and JEE Advanced exams. Your role is to:

1. Provide step-by-step solutions with clear explanations
2. Simplify complex concepts using analogies and examples
3. Suggest related concepts the student should review
4. Identify potential misconceptions
5. Format mathematical expressions clearly

Always structure your response as:
## Solution
[Step-by-step solution]

## Simplified Explanation
[Easy-to-understand explanation]

## Related Concepts
[List of related topics to review]

Be encouraging, patient, and thorough in your explanations.`;

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

interface ModelResponse {
  text: string;
  usage: TokenUsage;
}

export interface GenerateResult {
  response: string;
  modelUsed: string;
  complexityLevel: ComplexityLevel;
  difficultyScore: number;
  confidenceScore: number;
  topicClassification: TopicClassification;
  tokenUsage?: TokenUsage;
}

async function callOpenAI(model: string, question: string, maxTokens: number, imageBase64?: string): Promise<ModelResponse> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userContent: any[] = [{ type: "text", text: question }];
  if (imageBase64) {
    userContent.push({
      type: "image_url",
      image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` },
    });
  }

  const useModel = imageBase64 ? "gpt-4o" : model;

  const completion = await openai.chat.completions.create({
    model: useModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
  });
  return {
    text: completion.choices[0]?.message?.content || "Unable to generate response.",
    usage: {
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    },
  };
}

async function callAnthropic(model: string, question: string, maxTokens: number): Promise<ModelResponse> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: question }],
  });
  const block = message.content[0];
  const text = block.type === "text" ? block.text : "Unable to generate response.";
  return {
    text,
    usage: {
      inputTokens: message.usage?.input_tokens || 0,
      outputTokens: message.usage?.output_tokens || 0,
    },
  };
}

async function callModel(config: ModelConfig, question: string, imageBase64?: string): Promise<ModelResponse> {
  if (imageBase64) {
    return callOpenAI(config.model, question, config.maxTokens, imageBase64);
  }
  if (config.provider === "openai") {
    return callOpenAI(config.model, question, config.maxTokens);
  } else {
    return callAnthropic(config.model, question, config.maxTokens);
  }
}

export async function generateDoubtResponse(
  question: string,
  userId?: string,
  doubtId?: string,
  imageBase64?: string
): Promise<GenerateResult> {
  const questionForClassification = question || "Image-based question";
  const complexity = classifyComplexity(questionForClassification);
  const topicClassification = classifyTopic(questionForClassification);
  const modelConfig = selectModel(complexity.level);

  const prompt = imageBase64
    ? `${question || "Please analyze this image."}\n\nThe student has uploaded an image. Please carefully examine the image, identify any questions, problems, diagrams, or content shown, and provide a detailed step-by-step solution or explanation.`
    : question;

  let modelResponse: ModelResponse;
  let finalModel = modelConfig;
  const startTime = Date.now();

  try {
    modelResponse = await callModel(modelConfig, prompt, imageBase64);
  } catch (error) {
    const fallback = getFallbackModel(complexity.level);
    if (fallback) {
      finalModel = fallback;
      try {
        modelResponse = await callModel(fallback, prompt, imageBase64);
      } catch {
        return {
          response: generateFallbackResponse(question, topicClassification),
          modelUsed: finalModel.model,
          complexityLevel: complexity.level,
          difficultyScore: complexity.score,
          confidenceScore: topicClassification.confidence,
          topicClassification,
        };
      }
    } else {
      return {
        response: generateFallbackResponse(question, topicClassification),
        modelUsed: finalModel.model,
        complexityLevel: complexity.level,
        difficultyScore: complexity.score,
        confidenceScore: topicClassification.confidence,
        topicClassification,
      };
    }
  }

  const durationMs = Date.now() - startTime;
  const cost = calculateTokenCost(
    finalModel.model,
    modelResponse.usage.inputTokens,
    modelResponse.usage.outputTokens
  );

  await logAiUsage({
    userId,
    doubtId,
    service: "chat",
    model: finalModel.model,
    provider: finalModel.provider,
    inputTokens: modelResponse.usage.inputTokens,
    outputTokens: modelResponse.usage.outputTokens,
    costUsd: cost,
    durationMs,
  });

  return {
    response: modelResponse.text,
    modelUsed: finalModel.model,
    complexityLevel: complexity.level,
    difficultyScore: complexity.score,
    confidenceScore: topicClassification.confidence,
    topicClassification,
    tokenUsage: modelResponse.usage,
  };
}

function generateFallbackResponse(question: string, topic: TopicClassification): string {
  return `## Solution
I apologize, but I'm currently unable to process this question through our AI models. Please try again in a moment.

## Question Details
- **Subject**: ${topic.subject}
- **Topic**: ${topic.topic}
- **Detected Complexity**: This appears to be a ${topic.subject} question related to ${topic.topic}.

## What You Can Do
1. Try rephrasing your question
2. Break down the problem into smaller parts
3. Contact your mentor for personalized help

We've logged this question and our team will review it.`;
}
