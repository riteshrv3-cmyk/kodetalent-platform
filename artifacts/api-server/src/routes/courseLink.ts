import { Router } from "express";

const router = Router();

type Kind = "reading" | "exercise" | "project";

/**
 * Builds a direct-to-platform URL for a learning resource.
 *
 * We deliberately do NOT scrape Google/Bing/DDG here — those endpoints
 * are unreliable from server IPs and frequently rate-limit. Instead we
 * land the student directly on the most-relevant platform's own search
 * results page, which is one click from the actual resource and always
 * works.
 */
function buildLink(query: string, kind: Kind): string {
  const q = query.trim();
  const enc = encodeURIComponent(q);
  const lower = q.toLowerCase();

  if (kind === "reading") {
    // Pick the best documentation site for the topic.
    const isWeb = /\b(html|css|javascript|js|typescript|ts|react|node|web|dom|fetch|browser|api|http|json|jsx|nextjs|next\.js)\b/.test(lower);
    const isPython = /\bpython\b/.test(lower);
    const isJava = /\bjava\b/.test(lower) && !/\bjavascript\b/.test(lower);
    const isCpp = /\bc\+\+|cpp\b/.test(lower);
    const isSql = /\bsql|postgres|mysql|database\b/.test(lower);

    if (isWeb)    return `https://developer.mozilla.org/en-US/search?q=${enc}`;
    if (isPython) return `https://www.w3schools.com/python/default.asp`.replace("default.asp", "") + "?s=" + enc;
    if (isJava)   return `https://www.geeksforgeeks.org/search/?gq=${enc}+java`;
    if (isCpp)    return `https://www.geeksforgeeks.org/search/?gq=${enc}+cpp`;
    if (isSql)    return `https://www.w3schools.com/sql/default.asp`;
    // GeeksforGeeks is broad and Indian-audience friendly — great default.
    return `https://www.geeksforgeeks.org/search/?gq=${enc}`;
  }

  if (kind === "exercise") {
    const looksAlgo = /\b(dp|dynamic programming|tree|graph|array|string|sort|search|recursion|hash|stack|queue|linked list|bit|binary|leetcode)\b/.test(lower);
    const looksSql = /\bsql|query|join\b/.test(lower);

    if (looksSql)  return `https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=&badge_type=sql&search=${enc}`;
    if (looksAlgo) return `https://leetcode.com/problemset/?search=${enc}`;
    return `https://www.hackerrank.com/search?q=${enc}`;
  }

  // kind === "project"
  // GitHub topic+repo search sorted by stars — lands on real, popular open-source projects.
  return `https://github.com/search?q=${enc}+tutorial&type=repositories&s=stars&o=desc`;
}

router.get("/course/best-link", (req, res) => {
  const q = String(req.query.q || "").trim();
  const kindRaw = String(req.query.kind || "").trim();
  if (!q) return res.status(400).json({ error: "q is required" });
  if (q.length > 200) return res.status(400).json({ error: "q too long" });
  if (!["reading", "exercise", "project"].includes(kindRaw)) {
    return res.status(400).json({ error: "kind must be reading|exercise|project" });
  }
  const url = buildLink(q, kindRaw as Kind);
  return res.json({ url });
});

export default router;
