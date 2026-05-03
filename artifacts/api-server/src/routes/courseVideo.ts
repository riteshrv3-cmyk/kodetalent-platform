import { Router } from "express";

const router = Router();

const cache = new Map<string, { videoId: string; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 1000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function resolveBestVideo(query: string): Promise<string | null> {
  const cached = cache.get(query);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.videoId;

  // sp=EgIQAQ%3D%3D filters search results to videos only (no playlists / channels)
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    query,
  )}&sp=EgIQAQ%253D%253D&hl=en&gl=IN`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        "accept-language": "en-IN,en;q=0.9",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }

  // YouTube embeds many "videoId":"XXXXXXXXXXX" strings in the initial JSON.
  // The first occurrence is the top video result.
  const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
  if (!match) return null;
  const videoId = match[1];
  if (cache.size >= CACHE_MAX) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(query, { videoId, ts: Date.now() });
  return videoId;
}

router.get("/course/best-video", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) {
    return res.status(400).json({ error: "q is required" });
  }
  if (q.length > 200) {
    return res.status(400).json({ error: "q too long" });
  }
  try {
    const videoId = await resolveBestVideo(q);
    if (!videoId) {
      return res.json({ videoId: null, watchUrl: null });
    }
    return res.json({
      videoId,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  } catch (err) {
    req.log.error({ err }, "best-video lookup failed");
    return res.status(500).json({ error: "lookup failed" });
  }
});

export default router;
