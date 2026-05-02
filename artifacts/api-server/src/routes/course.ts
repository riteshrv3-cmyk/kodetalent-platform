import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

router.post("/course/generate", async (req, res) => {
  const { subDomainName, domainName, skills } = req.body;
  if (!subDomainName || !domainName) {
    return res.status(400).json({ error: "subDomainName and domainName are required" });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 5000,
      messages: [
        {
          role: "user",
          content: `You are a world-class course creator for Indian engineering students preparing for tech jobs. Create a complete Coursera-style course for "${subDomainName}" in ${domainName}.

Key skills to cover: ${Array.isArray(skills) ? skills.join(", ") : skills || "core fundamentals"}

Return ONLY valid JSON — no markdown, no explanation, no code fences — in EXACTLY this format:

{
  "modules": [
    {
      "id": "m1",
      "title": "string",
      "description": "string",
      "duration": "string",
      "emoji": "string",
      "topics": ["string"],
      "lessons": [
        {
          "id": "m1l1",
          "title": "string",
          "type": "video",
          "duration": "string",
          "description": "string",
          "keyPoints": ["string", "string", "string"],
          "searchQuery": "string"
        }
      ]
    }
  ],
  "flashcards": [
    { "id": "f1", "front": "string", "back": "string", "topic": "string" }
  ],
  "quizQuestions": [
    { "id": "q1", "question": "string", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "string", "difficulty": "easy" }
  ]
}

Rules for modules:
- Exactly 5 modules progressing beginner → advanced, each with a relevant emoji
- Each module has 3-4 lessons
- lesson "type" must be one of: "video", "reading", "exercise", "project"
- lesson "duration" like "12 min", "20 min", "45 min"
- lesson "description": 2-3 sentence explanation of what the student will learn
- lesson "keyPoints": exactly 3 concise bullet-point takeaways (no bullet symbol, just text)
- lesson "searchQuery": a precise YouTube search query to find the best free tutorial for this lesson, e.g. "React hooks useState useEffect tutorial 2024" — make it specific and searchable

Rules for flashcards:
- Exactly 12 flashcards covering core concepts, tools, and interview Q&A
- Mix: definitions, how-to, why/when, common mistakes, real interview questions at Indian companies

Rules for quiz:
- Exactly 5 questions: 2 easy, 2 medium, 1 hard
- "answer" must be ONLY the letter A, B, C, or D

All content specific to ${subDomainName} — practical, interview-relevant, zero filler.`,
        },
      ],
    });

    const raw = response.content[0];
    if (raw.type !== "text") {
      return res.status(500).json({ error: "Unexpected AI response type" });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw.text);
    } catch {
      const match = raw.text.match(/\{[\s\S]*\}/);
      if (!match) return res.status(500).json({ error: "Could not parse AI response as JSON" });
      parsed = JSON.parse(match[0]);
    }

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Course generation failed");
    res.status(500).json({ error: "Course generation failed" });
  }
});

export default router;
