import { Router } from "express";
import { anthropic, AI_MODEL } from "@workspace/integrations-anthropic-ai";
import { cacheGetOrSet, sweepExpiredIfDue } from "../lib/aiCache";
import { rlAiHeavy } from "../middlewares/rateLimit";

const router = Router();

const COURSE_TTL_SECONDS = 30 * 24 * 60 * 60;

router.post("/course/generate", rlAiHeavy, async (req, res) => {
  const { subDomainName, domainName, skills } = req.body;
  if (!subDomainName || !domainName) {
    return res.status(400).json({ error: "subDomainName and domainName are required" });
  }

  const skillList = Array.isArray(skills) ? skills.join(", ") : skills || "core fundamentals";
  const skillKey = (Array.isArray(skills) ? [...skills].sort() : [String(skills ?? "")]);

  void sweepExpiredIfDue();

  try {
    const { value, cached } = await cacheGetOrSet(
      {
        namespace: "course-v1",
        keyParts: [String(subDomainName).toLowerCase().trim(), String(domainName).toLowerCase().trim(), skillKey.map(s => String(s).toLowerCase().trim())],
        ttlSeconds: COURSE_TTL_SECONDS,
      },
      async () => {
        const [modulesResp, practiceResp] = await Promise.all([
        anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 4096,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: `You are a course creator for Indian engineering students. Create a 5-module course for "${subDomainName}" (${domainName}).

Return ONLY valid compact JSON — no markdown, no whitespace between fields, no trailing commas — exactly:
{"modules":[{"id":"m1","title":"...","description":"...","duration":"...","emoji":"...","topics":["..."],"lessons":[{"id":"m1l1","title":"...","type":"video","duration":"...","description":"...","keyPoints":["...","..."],"searchQuery":"..."}]}]}

Rules:
- Exactly 5 modules, beginner to advanced
- Each module: 3 lessons (not 4)
- lesson type: one of video|reading|exercise|project
- lesson duration: "10 min" style
- lesson description: 1 sentence only
- keyPoints: exactly 2 short phrases
- searchQuery: specific YouTube search, e.g. "Python list comprehension tutorial"
- Skills to cover: ${skillList}
- All content must relate to ${subDomainName}`,
            },
          ],
        }),
        anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 3500,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: `You are a course creator for Indian engineering students. Generate study material for "${subDomainName}" (${domainName}).

Return ONLY valid compact JSON — no markdown, no whitespace between fields, no trailing commas — exactly:
{"flashcards":[{"id":"f1","front":"...","back":"...","topic":"..."}],"quizQuestions":[{"id":"q1","question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"A","explanation":"...","difficulty":"easy"}]}

Rules:
- Exactly 10 flashcards: mix definitions, how-to, interview Q&A for Indian companies (Flipkart, Razorpay, Swiggy)
- Exactly 5 quiz questions: 2 easy, 2 medium, 1 hard; "answer" = single letter A/B/C/D only
- Skills: ${skillList}`,
            },
          ],
        }),
        ]);

        const parseRaw = (raw: string) => {
          try { return JSON.parse(raw); }
          catch {
            const m = raw.match(/\{[\s\S]*\}/);
            if (!m) throw new Error("No JSON found in response");
            return JSON.parse(m[0]);
          }
        };

        const r1 = modulesResp.content[0];
        const r2 = practiceResp.content[0];
        if (r1.type !== "text" || r2.type !== "text") {
          throw new Error("Unexpected AI response type");
        }

        const modulesData = parseRaw(r1.text);
        const practiceData = parseRaw(r2.text);
        return { ...modulesData, ...practiceData };
      },
    );

    res.setHeader("X-Cache", cached ? "HIT" : "MISS");
    if (cached) req.log.info({ subDomainName }, "course cache HIT");
    return res.json(value);
  } catch (err) {
    req.log.error({ err }, "Course generation failed");
    return res.status(500).json({ error: "Course generation failed" });
  }
});

export default router;
