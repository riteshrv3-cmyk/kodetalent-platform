// Term normalization shared by keyword extraction, ATS scoring, and the
// fabrication gate's forbidden-term scan. The goal is exact, predictable
// matching — no substring matching, no fuzzy scoring.

/** Canonical name -> alternate spellings/casings a JD or resume might use. */
export const ALIASES: Record<string, string[]> = {
  "node.js": ["node", "nodejs", "node js"],
  "react": ["react.js", "reactjs"],
  "vue": ["vue.js", "vuejs"],
  "next.js": ["nextjs", "next"],
  "postgresql": ["postgres", "psql", "pg"],
  "javascript": ["js", "es6", "ecmascript"],
  "typescript": ["ts"],
  "c++": ["cpp"],
  "c#": ["csharp", "c sharp"],
  ".net": ["dotnet", "dot net"],
  "rest apis": ["rest api", "restful api", "restful apis", "rest"],
  "ci/cd": ["ci cd", "continuous integration", "continuous deployment"],
  "scikit-learn": ["sklearn"],
  "kubernetes": ["k8s"],
  "amazon web services": ["aws"],
  "google cloud platform": ["gcp"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  "golang": ["go"],
  "objective-c": ["objective c", "objc"],
};

/** Reverse lookup: alias -> canonical term, built once. */
const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(ALIASES)) {
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias.toLowerCase(), canonical);
  }
}

/**
 * Normalize a term for exact matching: lowercase, trim, collapse whitespace,
 * map known aliases to their canonical form. Atomic tokens like "c++"/"c#"/
 * ".net"/"node.js" are preserved (not split on punctuation) because they are
 * looked up as whole strings, never tokenized further.
 */
export function normTerm(raw: string): string {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return ALIAS_TO_CANONICAL.get(trimmed) ?? trimmed;
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for",
  "with", "is", "are", "was", "were", "be", "been", "being", "this", "that",
  "as", "by", "from", "it", "its", "will", "would", "should", "can", "could",
]);

/**
 * Tokenize text into normalized 1/2/3-grams for exact-set-membership matching.
 * This is what makes ATS scoring precise: "C" cannot match "Scala" (no
 * substring test), and JSON key names never appear here because this only
 * ever runs on `renderPlainText()` output, never on a serialized object.
 */
export function tokenizeToNgrams(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s.+#-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const grams = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    const w1 = words[i];
    if (!STOPWORDS.has(w1)) grams.add(normTerm(w1));
    if (i + 1 < words.length) {
      const w2 = words[i + 1];
      grams.add(normTerm(`${w1} ${w2}`));
      if (i + 2 < words.length) {
        const w3 = words[i + 2];
        grams.add(normTerm(`${w1} ${w2} ${w3}`));
      }
    }
  }
  return grams;
}
