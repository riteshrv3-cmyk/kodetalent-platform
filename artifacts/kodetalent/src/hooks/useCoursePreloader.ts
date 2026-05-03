import { useEffect } from "react";
import { ALL_SUBDOMAINS } from "@/data/domains";

const CACHE_VERSION = "v2";
const BATCH_SIZE = 3;
const MAX_PER_SESSION = 30;
const STATUS_KEY = "course_preload_status";

// Module-level singleton — only one preloader runs across the app lifetime
let preloaderStarted = false;

function getCacheKey(subDomainId: string) {
  return `course_content_${CACHE_VERSION}_${subDomainId}`;
}

function getStatusMap(): Record<string, "done" | "error"> {
  try { return JSON.parse(localStorage.getItem(STATUS_KEY) || "{}"); }
  catch { return {}; }
}

function setStatus(id: string, status: "done" | "error") {
  const map = getStatusMap();
  map[id] = status;
  localStorage.setItem(STATUS_KEY, JSON.stringify(map));
}

async function generateOne(subDomainId: string, subDomainName: string, domainName: string, skills: string[]) {
  const key = getCacheKey(subDomainId);
  if (localStorage.getItem(key)) {
    setStatus(subDomainId, "done");
    return;
  }
  try {
    const resp = await fetch("/api/course/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subDomainName, domainName, skills }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    localStorage.setItem(key, JSON.stringify(data));
    setStatus(subDomainId, "done");
  } catch {
    setStatus(subDomainId, "error");
  }
}

async function runPreloader() {
  if (preloaderStarted) return;
  preloaderStarted = true;

  const statusMap = getStatusMap();

  // Only process subdomains not yet successfully generated
  // Cap per session so we don't hammer the AI endpoint when 100 courses are pending.
  const allPending = ALL_SUBDOMAINS.filter(
    sd => !localStorage.getItem(getCacheKey(sd.id)) && statusMap[sd.id] !== "done"
  );
  const pending = allPending.slice(0, MAX_PER_SESSION);

  if (pending.length === 0) return;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(sd => generateOne(sd.id, sd.name, sd.domain.name, sd.skills))
    );
    // Small pause between batches to be kind to the API
    if (i + BATCH_SIZE < pending.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

export function isCourseReady(subDomainId: string): boolean {
  return !!localStorage.getItem(getCacheKey(subDomainId));
}

export function useCoursePreloader() {
  useEffect(() => {
    // Defer start so the page renders first
    const t = setTimeout(() => { runPreloader(); }, 1500);
    return () => clearTimeout(t);
  }, []);
}
