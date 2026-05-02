import { Router } from "express";
import { db } from "@workspace/db";
import { interviewSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  CreateInterviewSessionBody,
  GetNextInterviewQuestionBody,
} from "@workspace/api-zod";

const router = Router();

// POST /interview/sessions
router.post("/interview/sessions", async (req, res) => {
  const parsed = CreateInterviewSessionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { studentId, company, round } = parsed.data;

  try {
    const firstQuestion = await generateQuestion(company, round, 1, []);
    const [session] = await db.insert(interviewSessionsTable).values({
      studentId,
      company,
      round,
      questions: [firstQuestion],
      answers: [],
      completed: false,
    }).returning();

    return res.status(201).json(formatSession(session, firstQuestion, 1));
  } catch (err) {
    req.log.error({ err }, "Failed to create interview session");
    return res.status(500).json({ error: "Failed to create interview session" });
  }
});

// GET /interview/sessions/:id
router.get("/interview/sessions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [session] = await db.select().from(interviewSessionsTable).where(eq(interviewSessionsTable.id, id)).limit(1);
    if (!session) return res.status(404).json({ error: "Session not found" });
    const questions = session.questions as string[];
    const currentQ = questions[questions.length - 1] ?? null;
    return res.json(formatSession(session, currentQ, questions.length));
  } catch (err) {
    req.log.error({ err }, "Failed to get session");
    return res.status(500).json({ error: "Failed to get session" });
  }
});

// POST /interview/sessions/:id/question
router.post("/interview/sessions/:id/question", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = GetNextInterviewQuestionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const [session] = await db.select().from(interviewSessionsTable).where(eq(interviewSessionsTable.id, id)).limit(1);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const questions = session.questions as string[];
    const answers = session.answers as string[];
    answers.push(parsed.data.answer);

    const questionNumber = questions.length + 1;
    const completed = questionNumber > 5;

    if (completed) {
      await db.update(interviewSessionsTable).set({
        answers,
        completed: true,
      }).where(eq(interviewSessionsTable.id, id));
      return res.json({ question: null, questionNumber: 5, completed: true });
    }

    const nextQuestion = await generateQuestion(session.company, session.round, questionNumber, answers);
    questions.push(nextQuestion);

    await db.update(interviewSessionsTable).set({
      questions,
      answers,
    }).where(eq(interviewSessionsTable.id, id));

    return res.json({ question: nextQuestion, questionNumber, completed: false });
  } catch (err) {
    req.log.error({ err }, "Failed to get next question");
    return res.status(500).json({ error: "Failed to get next question" });
  }
});

// POST /interview/sessions/:id/evaluate
router.post("/interview/sessions/:id/evaluate", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [session] = await db.select().from(interviewSessionsTable).where(eq(interviewSessionsTable.id, id)).limit(1);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const questions = session.questions as string[];
    const answers = session.answers as string[];

    const evaluationPrompt = `You are an expert interviewer. Evaluate this mock interview for a ${session.company} ${session.round} interview.

Questions and Answers:
${questions.map((q, i) => `Q${i+1}: ${q}\nA${i+1}: ${answers[i] || "(no answer)"}`).join("\n\n")}

Respond with a JSON object (no markdown) with this exact structure:
{
  "overallScore": <number 0-100>,
  "communicationScore": <number 0-10>,
  "technicalScore": <number 0-10>,
  "confidenceScore": <number 0-10>,
  "weakPoint": "<one sentence about main weakness>",
  "strongPoint": "<one sentence about main strength>",
  "questionFeedback": [
    {
      "question": "<question text>",
      "studentAnswer": "<answer text>",
      "betterAnswer": "<improved answer>",
      "score": <number 0-10>
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: evaluationPrompt }],
    });

    const content = message.content[0];
    const text = content.type === "text" ? content.text : "{}";
    const evaluation = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());

    await db.update(interviewSessionsTable).set({
      overallScore: evaluation.overallScore,
      evaluation,
      completed: true,
    }).where(eq(interviewSessionsTable.id, id));

    return res.json(evaluation);
  } catch (err) {
    req.log.error({ err }, "Failed to evaluate interview");
    return res.status(500).json({ error: "Failed to evaluate interview" });
  }
});

async function generateQuestion(
  company: string,
  round: string,
  questionNumber: number,
  previousAnswers: string[]
): Promise<string> {
  const context = previousAnswers.length > 0
    ? `Previous answers: ${previousAnswers.slice(-2).join("; ")}`
    : "";

  const prompt = `You are an interviewer at ${company} conducting a ${round} interview for a software engineering position.
${context}
Generate question ${questionNumber} of 5 for this interview. Make it specific and realistic.
Return ONLY the question text, nothing else.`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  return content.type === "text" ? content.text.trim() : "Tell me about yourself.";
}

function formatSession(
  s: typeof interviewSessionsTable.$inferSelect,
  currentQuestion: string | null,
  questionNumber: number
) {
  return {
    id: s.id,
    studentId: s.studentId,
    company: s.company,
    round: s.round,
    questions: s.questions as string[],
    answers: s.answers as string[],
    overallScore: s.overallScore ?? null,
    currentQuestion,
    questionNumber,
    completed: s.completed,
    createdAt: s.createdAt.toISOString(),
  };
}

export default router;
