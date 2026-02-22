import { Router, Response } from "express";
import { AuthRequest } from "../auth";
import prisma from "../../src/lib/prisma";
import { generateDoubtResponse } from "../../src/lib/ai/generate-response";
import { logActivity } from "../../src/lib/activity";
import { sendDoubtResponseEmail } from "../../src/lib/email-templates";
import { rateLimit } from "../../src/lib/rate-limit";

export const doubtRoutes = Router();

// POST /api/doubts
doubtRoutes.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const { success: rateLimitOk } = rateLimit(`doubt:${user.id}`, 20, 60 * 1000);
    if (!rateLimitOk) {
      return res.status(429).json({ error: "Too many requests. Please wait a moment." });
    }

    const { question, imageUrl, inputMode } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const startTime = Date.now();

    const doubt = await prisma.doubt.create({
      data: {
        studentId: user.id,
        question,
        imageUrl: imageUrl || null,
        inputMode: inputMode || "text",
        status: "pending",
      },
    });

    const aiResult = await generateDoubtResponse(question, user.id, doubt.id);

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

    await logActivity(user.id, "doubt_asked", `Asked: ${question.substring(0, 100)}`, {
      doubtId: updatedDoubt.id,
      subject: updatedDoubt.subject,
      topic: updatedDoubt.topic,
      inputMode: updatedDoubt.inputMode,
      modelUsed: updatedDoubt.modelUsed,
      responseTimeMs: updatedDoubt.responseTimeMs,
    });

    if (user.email && updatedDoubt.aiResponse) {
      sendDoubtResponseEmail({
        to: user.email,
        studentName: user.name || "Student",
        question: updatedDoubt.question,
        aiResponse: updatedDoubt.aiResponse,
        subject: updatedDoubt.subject,
        topic: updatedDoubt.topic,
        modelUsed: updatedDoubt.modelUsed,
        doubtId: updatedDoubt.id,
      }).catch(() => {});
    }

    return res.status(201).json(updatedDoubt);
  } catch (error) {
    console.error("Doubt creation error:", error);
    return res.status(500).json({ error: "Failed to process doubt" });
  }
});

// GET /api/doubts
doubtRoutes.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { subject, status, limit = "50", offset = "0" } = req.query;

    const where: any = { studentId: user.id };
    if (subject) where.subject = subject;
    if (status) where.status = status;

    const [doubts, total] = await Promise.all([
      prisma.doubt.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.doubt.count({ where }),
    ]);

    return res.json({ doubts, total });
  } catch (error) {
    console.error("Fetch doubts error:", error);
    return res.status(500).json({ error: "Failed to fetch doubts" });
  }
});

// GET /api/doubts/:id
doubtRoutes.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const doubt = await prisma.doubt.findUnique({
      where: { id },
      include: { followUps: { orderBy: { createdAt: "asc" } } },
    });
    if (!doubt) return res.status(404).json({ error: "Doubt not found" });

    return res.json(doubt);
  } catch (error) {
    console.error("Fetch doubt error:", error);
    return res.status(500).json({ error: "Failed to fetch doubt" });
  }
});

// PATCH /api/doubts/:id
doubtRoutes.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const doubt = await prisma.doubt.update({
      where: { id: req.params.id as string },
      data: { status },
    });
    return res.json(doubt);
  } catch (error) {
    console.error("Update doubt error:", error);
    return res.status(500).json({ error: "Failed to update doubt" });
  }
});

// POST /api/doubts/:id/followup
doubtRoutes.post("/:id/followup", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { question } = req.body;
    const id = req.params.id as string;

    if (!question?.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const doubt = await prisma.doubt.findUnique({ where: { id } });
    if (!doubt) return res.status(404).json({ error: "Doubt not found" });

    const contextQuestion = `Context: The student previously asked "${doubt.question}" and received this answer. Now they have a follow-up question: ${question}`;
    const aiResult = await generateDoubtResponse(contextQuestion, user.id, id);

    const followUp = await prisma.followUp.create({
      data: { doubtId: id, question, answer: aiResult.response },
    });

    await prisma.doubt.update({
      where: { id },
      data: { followUpCount: { increment: 1 } },
    });

    await logActivity(user.id, "followup_asked", "Follow-up on doubt", {
      doubtId: id, followUpId: followUp.id,
    });

    return res.status(201).json(followUp);
  } catch (error) {
    console.error("Follow-up error:", error);
    return res.status(500).json({ error: "Failed to process follow-up" });
  }
});

// POST /api/doubts/:id/rate
doubtRoutes.post("/:id/rate", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { rating } = req.body;

    if (!["helpful", "not_helpful"].includes(rating)) {
      return res.status(400).json({ error: "Invalid rating" });
    }

    const doubt = await prisma.doubt.update({
      where: { id },
      data: { rating },
    });

    await logActivity(user.id, "doubt_rated", `Rated ${rating}`, { doubtId: id, rating });

    return res.json(doubt);
  } catch (error) {
    console.error("Rating error:", error);
    return res.status(500).json({ error: "Failed to rate doubt" });
  }
});
