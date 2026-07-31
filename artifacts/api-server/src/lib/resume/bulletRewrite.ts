import { callJson } from "./callJson";

export type BulletRewriteAction = "shorter" | "add_number" | "jd_wording" | "different_verb";

export const BULLET_REWRITE_ACTIONS: readonly BulletRewriteAction[] = ["shorter", "add_number", "jd_wording", "different_verb"];

const ACTION_INSTRUCTIONS: Record<BulletRewriteAction, string> = {
  shorter:
    "Make it materially shorter — 10-16 words, one line. Keep the technology name and the core action. Drop qualifiers and filler, never substance.",
  add_number:
    "Add a concrete number or scope ONLY if one is genuinely derivable from the evidence rows below (a count of items, services, users, environments explicitly stated there). If no number is grounded in the evidence, use a concrete scope phrase instead (e.g. \"across three services\") — never invent a percentage or metric.",
  jd_wording:
    "Reword it using the job description's own terminology below, without changing what actually happened — swap synonyms for the JD's exact words where they describe the same real thing.",
  different_verb:
    "Rewrite the opening verb to a different, strong action verb. Avoid generic filler verbs like Utilized, Leveraged, Spearheaded, or Assisted. Keep the meaning identical.",
};

const SYSTEM_PROMPT = `You rewrite a single resume bullet for an Indian engineering student's resume.

THE ONE RULE: do not introduce any new claim, technology, number, or fact beyond what is already stated in
the current bullet text and the cited evidence rows you are given. You may only reuse the evidence IDs
already attached to this bullet — never invent a new one. If you cannot satisfy the request without adding
an unsupported claim, make the smallest edit that satisfies it without adding anything new.

Never use filler verbs (Utilised, Leveraged, Spearheaded, Assisted, Helped). Never use self-adjectives
(robust, scalable, seamless). One line preferred, two max, under 28 words.

Respond with valid JSON only — no markdown, no explanation. Shape: { "text": "...", "evidence": ["ledger IDs, a subset of the ones given below"] }`;

export interface RewriteBulletOptions {
  currentText: string;
  evidenceText: string;
  action: BulletRewriteAction;
  jdText?: string;
  signal?: AbortSignal;
}

interface RewriteBulletRaw {
  text: unknown;
  evidence: unknown;
}

export interface RewriteBulletResult {
  text: string;
  evidence: string[];
}

export async function rewriteBullet(opts: RewriteBulletOptions): Promise<RewriteBulletResult> {
  const jdSection = opts.jdText?.trim()
    ? `\nJob description (for wording reference only — do not add facts from it):\n${opts.jdText.slice(0, 3000)}`
    : "";

  const user = `Current bullet: "${opts.currentText}"

Evidence rows this bullet may cite (its existing evidence — reuse a subset, never a new ID):
${opts.evidenceText}
${jdSection}

Task: ${ACTION_INSTRUCTIONS[opts.action]}

Return the rewritten bullet as JSON.`;

  const raw = await callJson<RewriteBulletRaw>({
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 300,
    temperature: 0.3,
    signal: opts.signal,
    stageName: "bullet-rewrite",
  });

  const text = typeof raw.text === "string" ? raw.text.slice(0, 400).trim() : "";
  const evidence = Array.isArray(raw.evidence) ? raw.evidence.filter((e): e is string => typeof e === "string") : [];
  return { text, evidence };
}
