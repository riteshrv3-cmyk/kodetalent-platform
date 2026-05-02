import { Router } from "express";
import { db } from "@workspace/db";
import { testSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { CreateTestSessionBody, SubmitTestBody } from "@workspace/api-zod";

const router = Router();

// POST /test/sessions
router.post("/test/sessions", async (req, res) => {
  const parsed = CreateTestSessionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { studentId, testType, difficulty } = parsed.data;

  try {
    const questions = await generateMCQs(testType, difficulty);
    const [session] = await db.insert(testSessionsTable).values({
      studentId,
      testType,
      difficulty,
      questions,
      total: 20,
      completed: false,
    }).returning();

    return res.status(201).json(formatSession(session));
  } catch (err) {
    req.log.error({ err }, "Failed to create test session");
    return res.status(500).json({ error: "Failed to create test session" });
  }
});

// GET /test/sessions/:id
router.get("/test/sessions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [session] = await db.select().from(testSessionsTable).where(eq(testSessionsTable.id, id)).limit(1);
    if (!session) return res.status(404).json({ error: "Session not found" });
    return res.json(formatSession(session));
  } catch (err) {
    req.log.error({ err }, "Failed to get test session");
    return res.status(500).json({ error: "Failed to get test session" });
  }
});

// POST /test/sessions/:id/submit
router.post("/test/sessions/:id/submit", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = SubmitTestBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const [session] = await db.select().from(testSessionsTable).where(eq(testSessionsTable.id, id)).limit(1);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const questions = session.questions as Array<{
      question: string;
      options: string[];
      correctIndex: number;
      topic: string;
    }>;
    const userAnswers = parsed.data.answers;

    let score = 0;
    const topicMap: Record<string, { correct: number; total: number }> = {};

    questions.forEach((q, i) => {
      const topic = q.topic || "General";
      if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
      topicMap[topic].total++;
      if (userAnswers[i] === q.correctIndex) {
        score++;
        topicMap[topic].correct++;
      }
    });

    const sectionBreakdown = Object.entries(topicMap).map(([topic, data]) => ({
      topic,
      correct: data.correct,
      total: data.total,
    }));

    const weakTopics = sectionBreakdown
      .filter(s => s.correct / s.total < 0.5)
      .map(s => s.topic);

    const percentage = Math.round((score / questions.length) * 100);
    const averageComparison = percentage >= 65 ? "Above average" : "Below average";

    await db.update(testSessionsTable).set({
      score,
      answers: userAnswers,
      completed: true,
    }).where(eq(testSessionsTable.id, id));

    return res.json({
      score,
      total: questions.length,
      percentage,
      sectionBreakdown,
      weakTopics,
      averageComparison: `${averageComparison} vs similar students`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to submit test");
    return res.status(500).json({ error: "Failed to submit test" });
  }
});

async function generateMCQs(
  testType: string,
  difficulty: string
): Promise<Array<{ question: string; options: string[]; correctIndex: number; topic: string }>> {
  const prompt = `Generate exactly 20 multiple choice questions for a ${testType} test at ${difficulty} difficulty level.
For Indian engineering students preparing for campus placements.

Return ONLY a JSON array (no markdown) with this exact structure:
[
  {
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "topic": "Topic name"
  }
]

Make questions realistic and relevant to ${testType} placement tests.`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  const text = content.type === "text" ? content.text : "[]";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

function formatSession(s: typeof testSessionsTable.$inferSelect) {
  return {
    id: s.id,
    studentId: s.studentId,
    testType: s.testType,
    difficulty: s.difficulty,
    questions: s.questions as Array<{
      question: string;
      options: string[];
      correctIndex: number;
      topic: string;
    }>,
    score: s.score ?? null,
    total: s.total,
    completed: s.completed,
    createdAt: s.createdAt.toISOString(),
  };
}

export default router;
