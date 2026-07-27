/**
 * Extracts the first balanced `{...}` JSON object from a Claude response, tolerating
 * markdown fences and trailing prose after the object (Claude sometimes adds commentary).
 * Lifted from the jd-gap parser (the most robust of several duplicated inline versions).
 */
export function extractJson<T = unknown>(raw: string): T {
  const stripped = raw.replace(/```json\n?|\n?```/g, "").trim();
  const start = stripped.indexOf("{");
  let depth = 0;
  let end = -1;
  let inStr = false;
  let esc = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  const jsonStr = start >= 0 && end > 0 ? stripped.slice(start, end) : stripped;
  return JSON.parse(jsonStr) as T;
}
