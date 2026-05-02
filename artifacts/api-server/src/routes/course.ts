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
      max_tokens: 3500,
      messages: [
        {
          role: "user",
          content: `You are a world-class course creator for Indian engineering students preparing for tech jobs. Create a focused mini-course for "${subDomainName}" in ${domainName}.

Key skills to cover: ${Array.isArray(skills) ? skills.join(", ") : skills || "core fundamentals"}

Return ONLY valid JSON — no markdown, no explanation, no code fences — in EXACTLY this format:

{
  "modules": [
    { "id": "m1", "title": "string", "description": "string", "duration": "string", "emoji": "string", "topics": ["string"] }
  ],
  "flashcards": [
    { "id": "f1", "front": "string", "back": "string", "topic": "string" }
  ],
  "quizQuestions": [
    { "id": "q1", "question": "string", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "string", "difficulty": "easy" }
  ]
}

Rules:
- 5 modules (beginner → advanced) with relevant emoji, 2-3 topics each, realistic duration like "45 min" or "1.5 hrs"
- 12 flashcards: mix of concept definitions, how-to questions, and "why/when" application questions tailored to interview prep at Indian product companies (TCS, Flipkart, Swiggy, Razorpay, etc.)
- 5 quiz questions: 2 easy (recall), 2 medium (understanding), 1 hard (application/analysis); "answer" must be ONLY the letter "A", "B", "C", or "D"
- All content specific to ${subDomainName} — practical, concise, interview-relevant
- No filler — every word should help the student get hired`,
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
