import { Router } from "express";
import { db, curatedOpportunitiesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

const router = Router();

export type Kind = "jobs" | "internship" | "freelancing";

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  logo: string | null;
  location: string;
  pay: string | null;
  postedAt: string | null;
  tags: string[];
  url: string;
  source: string;
  /** True for the hand-built "search this platform" cards — not a real posting. */
  isSearchLink?: boolean;
}

interface RemoteOkRaw {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  company_logo?: string;
  logo?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  tags?: string[];
  url?: string;
  apply_url?: string;
  date?: string;
}

const cache = new Map<string, { data: Opportunity[]; ts: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 200;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function setCache(key: string, data: Opportunity[]) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now() });
}

function fmtPay(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return fmt(min ?? max ?? 0);
}

function timeAgo(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const sec = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d ago`;
  return `${Math.floor(day / 30)}mo ago`;
}

/**
 * Repairs text that was UTF-8 encoded but decoded as Latin-1 somewhere upstream,
 * which is how "Júnior" reaches us as "JÃºnior". Roughly 9% of RemoteOK's feed
 * arrives this way; the bytes are recoverable because the mangling is lossless.
 *
 * Only rewrites when the result is strictly better: the telltale sequences must
 * be present to begin with, and re-decoding must not produce U+FFFD. Text that
 * legitimately contains "Ã" (Portuguese "Ação") is left alone by the guard.
 */
export function repairMojibake(input: string): string {
  if (!input || !/[ÃÂâ][-¿ -⁯ -ÿ]/.test(input)) return input;
  try {
    const bytes = Uint8Array.from(input, ch => ch.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return decoded.includes("�") ? input : decoded;
  } catch {
    return input;
  }
}

/**
 * RemoteOK repeats the city in its location strings ("Toronto, Toronto,
 * Ontario, Canada" — 37% of their feed) and leaves trailing separators
 * ("Brasil, "). Both render as visible junk on the card.
 */
export function cleanLocation(input: string | null | undefined): string {
  const repaired = repairMojibake(String(input ?? "")).trim();
  if (!repaired) return "Remote";
  const seen = new Set<string>();
  const parts = repaired
    .split(",")
    .map(p => p.trim())
    .filter(p => p && p !== ".")
    .filter(p => {
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return parts.join(", ") || "Remote";
}

function normalizeRemoteOk(raw: RemoteOkRaw): Opportunity | null {
  if (!raw.position || !raw.company) return null;
  const url = raw.url || raw.apply_url || (raw.slug ? `https://remoteok.com/remote-jobs/${raw.slug}` : "");
  if (!url) return null;
  return {
    id: String(raw.id ?? raw.slug ?? `${raw.company}-${raw.position}`),
    title: repairMojibake(raw.position),
    company: repairMojibake(raw.company),
    logo: raw.company_logo || raw.logo || null,
    location: cleanLocation(raw.location),
    pay: fmtPay(raw.salary_min, raw.salary_max),
    postedAt: timeAgo(raw.date),
    tags: (raw.tags || []).slice(0, 4),
    url: url.startsWith("http") ? url : `https://remoteok.com${url}`,
    source: "RemoteOK",
  };
}

/** Shared timed GET returning parsed JSON, or null on any failure. */
async function fetchJson(url: string, timeoutMs = 6000): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRemoteOk(skill: string): Promise<Opportunity[]> {
  const tag = skill.trim().toLowerCase().replace(/[^a-z0-9.+-]/g, "");
  const url = tag
    ? `https://remoteok.com/api?tags=${encodeURIComponent(tag)}`
    : `https://remoteok.com/api`;
  const json = await fetchJson(url);
  if (!Array.isArray(json)) return [];
  // First element is metadata in RemoteOK responses.
  const items = (json as RemoteOkRaw[]).slice(1);
  return items
    .map(normalizeRemoteOk)
    .filter((x): x is Opportunity => x !== null);
}

interface RemotiveRaw {
  id?: number;
  url?: string;
  title?: string;
  company_name?: string;
  company_logo?: string;
  tags?: string[];
  job_type?: string; // "full_time" | "contract" | "internship" | ...
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
}

/**
 * Remotive's free API (remote jobs, searchable). Their terms require linking
 * to the job's Remotive URL and naming Remotive as the source — the card UI
 * does both (`url` + `source`). Jobs are delayed ~24h on their side.
 */
async function fetchRemotive(query: string): Promise<Opportunity[]> {
  const q = query.trim();
  if (!q) return [];
  const json = await fetchJson(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=20`,
  );
  const jobs = (json as { jobs?: RemotiveRaw[] } | null)?.jobs;
  if (!Array.isArray(jobs)) return [];
  return jobs
    .filter(j => j.title && j.company_name && j.url)
    .map(j => ({
      id: `rmv-${j.id ?? `${j.company_name}-${j.title}`}`,
      title: repairMojibake(j.title!),
      company: repairMojibake(j.company_name!),
      logo: j.company_logo || null,
      location: cleanLocation(j.candidate_required_location),
      pay: j.salary || null,
      postedAt: timeAgo(j.publication_date),
      // Surface job_type as a tag so the internship/freelance heuristics see it.
      tags: [...(j.tags || []).slice(0, 3), ...(j.job_type ? [j.job_type.replace("_", " ")] : [])],
      url: j.url!,
      source: "Remotive",
    }));
}

interface AdzunaRaw {
  id?: string;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  redirect_url?: string;
  created?: string;
}

function fmtPayInr(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const lakh = (n: number) => `₹${(n / 100_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (min && max) return `${lakh(min)}–${lakh(max)}`;
  return lakh(min ?? max ?? 0);
}

/**
 * Adzuna's India index — the one source here with on-site Indian listings.
 * Free tier, but keyed: create an app at developer.adzuna.com and set
 * ADZUNA_APP_ID / ADZUNA_APP_KEY. Silently skipped while the keys are absent
 * so the feed still works keyless (RemoteOK + Remotive + platform links).
 */
async function fetchAdzunaIndia(query: string): Promise<Opportunity[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const q = query.trim();
  if (!appId || !appKey || !q) return [];
  const url =
    `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${encodeURIComponent(appId)}` +
    `&app_key=${encodeURIComponent(appKey)}&results_per_page=10&what=${encodeURIComponent(q)}` +
    `&content-type=application/json`;
  const json = await fetchJson(url);
  const results = (json as { results?: AdzunaRaw[] } | null)?.results;
  if (!Array.isArray(results)) return [];
  return results
    .filter(r => r.title && r.redirect_url)
    .map(r => ({
      id: `adz-${r.id ?? r.redirect_url}`,
      // Adzuna wraps matched terms in <strong> tags.
      title: repairMojibake(r.title!.replace(/<\/?strong>/g, "")),
      company: repairMojibake(r.company?.display_name || "Company on Adzuna"),
      logo: null,
      location: cleanLocation(r.location?.display_name) || "India",
      pay: fmtPayInr(r.salary_min, r.salary_max),
      postedAt: timeAgo(r.created),
      tags: ["India"],
      url: r.redirect_url!,
      source: "Adzuna",
    }));
}

/**
 * Titles that mark a post as a clearly-non-engineering function. RemoteOK's own
 * tags are unreliable (a "Business Development Manager" post ships with react/
 * front-end tags), so this list is checked against the TITLE only. Each entry
 * is skipped when its words overlap the student's chosen role/skills — a
 * Product Mgmt student must still see "Product Manager" titles, a DevRel/Tech
 * Writing student must still see writer roles.
 */
const TITLE_DENYLIST = [
  "business development",
  "sales",
  "marketing",
  "account manager",
  "account executive",
  "recruiter",
  "talent",
  "human resources",
  " hr ",
  "medical",
  "nurse",
  "clinical",
  "legal",
  "customer support",
  "customer success",
  "copywriter",
  "content writer",
  "community manager",
  "virtual assistant",
  "growth manager",
  "operations manager",
];

const ROLE_STOPWORDS = new Set(["and", "or", "the", "of", "in", "a", "an"]);

/**
 * Employment-type tags carry no topical signal — every full-time posting has
 * one. They matter to the internship/freelance heuristics, so they stay on the
 * Opportunity, but they must not count toward "is this the role you searched
 * for". Leaving them in meant the token "full" (from "Full Stack") matched the
 * tag "full time" on every full-time job, so a Full Stack search returned
 * service-desk and DevOps postings.
 */
const EMPLOYMENT_TYPE_TAGS = new Set([
  "full time", "full-time", "part time", "part-time", "contract", "freelance",
  "internship", "temporary", "permanent", "full", "time", "part",
]);

function topicalTags(tags: string[]): string[] {
  return tags.filter(t => !EMPLOYMENT_TYPE_TAGS.has(t.toLowerCase().trim()));
}

/** Whole-word containment, so "full" cannot match inside "fullfilment". */
function hasWord(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

function keywordSet(skills: string[], role: string): string[] {
  const words = [
    ...skills.map(s => s.toLowerCase().trim()),
    ...role.toLowerCase().split(/[\s/>-]+/),
  ];
  return words.filter(w => w.length > 1 && !ROLE_STOPWORDS.has(w));
}

/**
 * Topical relevance gate for RemoteOK results. RemoteOK's tag query falls back
 * to the general feed when the tag matches loosely, so without this the role
 * feed surfaces ops/marketing/BD posts on what is now the first screen a
 * student lands on after onboarding. Exported for direct testing.
 */
/**
 * Denylist-only check, for sources whose own search is already topical
 * (Adzuna matches the query against title+description server-side): reject
 * clearly-non-engineering titles but don't demand a literal keyword hit.
 */
export function passesTitleDenylist(
  o: Pick<Opportunity, "title">,
  skills: string[],
  role: string,
): boolean {
  const keywords = keywordSet(skills, role);
  if (keywords.length === 0) return true;
  const titleHay = ` ${o.title.toLowerCase()} `;
  const activeDenylist = TITLE_DENYLIST.filter(
    entry => !entry.trim().split(/\s+/).some(w => keywords.some(k => k.includes(w) || w.includes(k))),
  );
  return !activeDenylist.some(entry => titleHay.includes(entry));
}

export function isRelevant(o: Pick<Opportunity, "title" | "tags">, skills: string[], role: string): boolean {
  const keywords = keywordSet(skills, role);
  if (keywords.length === 0) return true;

  if (!passesTitleDenylist(o, skills, role)) return false;

  const titleHay = ` ${o.title.toLowerCase()} `;

  // A keyword in the title is a strong signal — keep.
  if (keywords.some(k => hasWord(titleHay, k))) return true;

  // A keyword only in the tags is weak (RemoteOK stuffs `react` etc. onto
  // couriers and merchandisers), so it must be backed by a title that at
  // least reads as a tech role. Employment-type tags are stripped first —
  // they are metadata, not topic.
  const tagHay = topicalTags(o.tags).join(" ").toLowerCase();
  return keywords.some(k => hasWord(tagHay, k)) && TECH_TITLE.test(o.title);
}

/** Backstop for tag-only matches: does the title itself read as a tech role? */
const TECH_TITLE =
  /\b(developer|engineer(ing)?|programmer|software|swe|sde|front.?end|back.?end|full.?stack|devops|sre|architect|machine learning|data (scien|engineer|analy)|qa|tester|testing|security|cloud|mobile|ios|android|web|ux|ui|designer|analyst|scientist)\b/i;

function isInternshipLike(o: Opportunity): boolean {
  const hay = `${o.title} ${o.tags.join(" ")}`.toLowerCase();
  return /\b(intern|internship|trainee|graduate|entry.?level|junior|jr\.?)\b/.test(hay);
}

function isFreelanceLike(o: Opportunity): boolean {
  const hay = `${o.title} ${o.tags.join(" ")}`.toLowerCase();
  return /\b(contract|freelance|freelancer|consultant|part.?time|hourly)\b/.test(hay);
}

/**
 * Titles that require years of prior experience a student cannot have.
 * A fresher opening a "jobs" feed should not have the first screen be
 * Staff/Principal/Director roles — that reads as "this platform has
 * nothing for me," which is fatal for a college launch.
 */
const SENIOR_TITLE = /\b(senior|staff|principal|lead|director|head of|vp\b|chief|architect|manager)\b/i;

export function isEntryFriendly(o: Opportunity): boolean {
  const hay = `${o.title} ${o.tags.join(" ")}`.toLowerCase();
  if (/\b(junior|jr\.?|entry.?level|graduate|associate|new grad|campus)\b/.test(hay)) return true;
  return !SENIOR_TITLE.test(o.title);
}

function isIndiaLocation(o: Opportunity): boolean {
  return /india/i.test(o.location) || o.source === "Adzuna";
}

// Search-link cards never claim a pay band, a posting age, or vetted status —
// they are a deep link into another site's search results, not a listing.
function buildFreelancePlatformLinks(skill: string, role: string): Opportunity[] {
  const q = encodeURIComponent(`${role} ${skill}`.trim());
  return [
    {
      id: "upwork-" + skill,
      title: `Search Upwork for ${role} contracts`,
      company: "Upwork",
      logo: null,
      location: "Worldwide · Remote",
      pay: null,
      postedAt: null,
      tags: [skill, "Freelance"],
      url: `https://www.upwork.com/nx/search/jobs/?q=${q}`,
      source: "Upwork",
      isSearchLink: true,
    },
    {
      id: "freelancer-" + skill,
      title: `Search Freelancer.com for ${role} projects`,
      company: "Freelancer.com",
      logo: null,
      location: "Worldwide",
      pay: null,
      postedAt: null,
      tags: [skill, "Project"],
      url: `https://www.freelancer.com/jobs/?keyword=${q}`,
      source: "Freelancer",
      isSearchLink: true,
    },
    {
      id: "fiverr-" + skill,
      title: `Browse Fiverr for ${role} gigs`,
      company: "Fiverr",
      logo: null,
      location: "Worldwide",
      pay: null,
      postedAt: null,
      tags: [skill, "Gig"],
      url: `https://www.fiverr.com/search/gigs?query=${q}`,
      source: "Fiverr",
      isSearchLink: true,
    },
  ];
}

function buildInternshipPlatformLinks(skill: string, role: string): Opportunity[] {
  const q = encodeURIComponent(`${role} ${skill}`.trim());
  const slug = `${role.toLowerCase().replace(/\s+/g, "-")}-internship`;
  return [
    {
      id: "internshala-" + skill,
      title: `Search Internshala for ${role} internships`,
      company: "Internshala",
      logo: null,
      location: "India · Remote/On-site",
      pay: null,
      postedAt: null,
      tags: [skill, "Intern"],
      url: `https://internshala.com/internships/${encodeURIComponent(slug)}`,
      source: "Internshala",
      isSearchLink: true,
    },
    {
      id: "linkedin-intern-" + skill,
      title: `Search LinkedIn for ${role} interns (India)`,
      company: "LinkedIn",
      logo: null,
      location: "India",
      pay: null,
      postedAt: null,
      tags: [skill, "Intern"],
      url: `https://www.linkedin.com/jobs/search/?keywords=${q}%20intern&location=India&f_E=1`,
      source: "LinkedIn",
      isSearchLink: true,
    },
  ];
}

function buildJobPlatformLinks(skill: string, role: string): Opportunity[] {
  const q = encodeURIComponent(`${role} ${skill}`.trim());
  return [
    {
      id: "naukri-" + skill,
      title: `Search Naukri for ${role} roles (India)`,
      company: "Naukri",
      logo: null,
      location: "India",
      pay: null,
      postedAt: null,
      tags: [skill, "Full-time"],
      url: `https://www.naukri.com/${encodeURIComponent(role.toLowerCase().replace(/\s+/g, "-"))}-jobs`,
      source: "Naukri",
      isSearchLink: true,
    },
    {
      id: "linkedin-" + skill,
      title: `Search LinkedIn for ${role} (India)`,
      company: "LinkedIn",
      logo: null,
      location: "India",
      pay: null,
      postedAt: null,
      tags: [skill, "Full-time"],
      url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=India`,
      source: "LinkedIn",
      isSearchLink: true,
    },
  ];
}

/**
 * Hand-curated picks for this kind/role, newest first. A row with an empty
 * `role` targets every role; otherwise it matches when either string contains
 * the other (so a "Frontend" pick surfaces for "Frontend Developer" and vice
 * versa). Failures here are non-fatal: curation is an enhancement, and a DB
 * hiccup must never take down the whole feed.
 */
async function fetchCurated(kind: Kind, role: string): Promise<Opportunity[]> {
  try {
    const rows = await db
      .select()
      .from(curatedOpportunitiesTable)
      .where(and(eq(curatedOpportunitiesTable.kind, kind), eq(curatedOpportunitiesTable.active, true)))
      .orderBy(desc(curatedOpportunitiesTable.createdAt))
      .limit(20);

    const target = role.toLowerCase().trim();
    return rows
      .filter(r => {
        const rowRole = (r.role ?? "").toLowerCase().trim();
        if (!rowRole || !target) return true;
        return rowRole.includes(target) || target.includes(rowRole);
      })
      .slice(0, 5)
      .map(r => ({
        id: `curated-${r.id}`,
        title: r.title,
        company: r.company,
        logo: r.logo,
        location: r.location,
        pay: r.pay,
        postedAt: timeAgo(r.createdAt.toISOString()),
        tags: Array.isArray(r.tags) ? (r.tags as string[]).slice(0, 4) : [],
        url: r.url,
        source: r.source,
      }));
  } catch {
    return [];
  }
}

/**
 * Core fetch+filter+rank logic, shared by the public /opportunities route and
 * the student-matched endpoint below — one place that knows how to turn
 * (kind, role, skills) into a ranked list, regardless of caller.
 */
export async function getOpportunities(
  kind: Kind,
  role: string,
  skills: string[],
): Promise<{ items: Opportunity[]; cached: boolean; fallback?: boolean }> {
  const aggregated = await getAggregated(kind, role, skills);
  // Curated picks are merged OUTSIDE the aggregated cache, on every request.
  // Baking them into the cached payload would make a freshly-added pick wait
  // out the hour-long TTL before any student saw it — which defeats the point
  // of curating by hand.
  const curated = await fetchCurated(kind, role);
  return { ...aggregated, items: [...curated, ...aggregated.items] };
}

async function getAggregated(
  kind: Kind,
  role: string,
  skills: string[],
): Promise<{ items: Opportunity[]; cached: boolean; fallback?: boolean }> {
  const primarySkill = skills[0] || "";

  // Full skills list, not just primarySkill: the relevance filter below
  // depends on every skill, so results differ per skills set.
  const cacheKey = `${kind}::${skills.join(",")}::${role}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { items: cached.data, cached: true };
  }

  try {
    let items: Opportunity[] = [];

    // Search-based sources do best with the role name; RemoteOK is tag-based
    // so it keeps the primary skill. Internship searches append the word so
    // Remotive/Adzuna surface actual intern postings. Jobs searches also fire
    // a second "entry level" query — most students opening this feed are
    // freshers, and a plain role search skews toward senior openings.
    const query = role || primarySkill;
    const searchQuery = kind === "internship" ? `${query} intern` : query;
    const entryQuery = `entry level ${query}`;

    const settled = await Promise.allSettled([
      primarySkill ? fetchRemoteOk(primarySkill) : Promise.resolve([]),
      fetchRemotive(searchQuery),
      fetchAdzunaIndia(searchQuery),
      kind === "jobs" ? fetchRemotive(entryQuery) : Promise.resolve([]),
      kind === "jobs" ? fetchAdzunaIndia(entryQuery) : Promise.resolve([]),
    ]);
    const [remoteOk, remotive, adzuna, remotiveEntry, adzunaEntry] = settled.map(s =>
      s.status === "fulfilled" ? s.value : [],
    );

    // Adzuna's own search is topical, so it only needs the denylist;
    // RemoteOK/Remotive results are noisy and get the full keyword gate.
    const gatedAdzuna = [...adzuna, ...adzunaEntry].filter(o => passesTitleDenylist(o, skills, role));
    const gatedRemotive = [...remotive, ...remotiveEntry].filter(o => isRelevant(o, skills, role));
    const gatedRemoteOk = remoteOk.filter(o => isRelevant(o, skills, role));

    // Round-robin across sources (India-first) so no single board fills the
    // cap and pushes the others' relevant listings out.
    //
    // Two levels of deduping. The exact key kills byte-identical reposts. The
    // family key handles the common case of one role fanned out across offices
    // — "Staff Software Engineer, Product (Belo Horizonte)" through
    // "(Florianópolis)" was consuming 6 of 13 job slots from a single employer.
    // Stripping the parenthetical entirely would also merge genuinely different
    // roles ("Engineer (Frontend)" vs "(Backend)"), so the family is capped at
    // two rather than collapsed to one.
    const seen = new Set<string>();
    const familyCount = new Map<string, number>();
    const MAX_PER_FAMILY = 2;
    const real: Opportunity[] = [];
    const pools = [gatedAdzuna, gatedRemotive, gatedRemoteOk];
    const maxLen = Math.max(...pools.map(p => p.length), 0);
    for (let i = 0; i < maxLen; i++) {
      for (const pool of pools) {
        const o = pool[i];
        if (!o) continue;
        const company = o.company.toLowerCase().trim();
        const key = `${o.title.toLowerCase().trim()}|${company}`;
        if (seen.has(key)) continue;
        const family = `${o.title
          .toLowerCase()
          .replace(/\s*\([^)]*\)\s*/g, " ")
          .replace(/[^a-z0-9 ]/g, " ")
          .replace(/\s+/g, " ")
          .trim()}|${company}`;
        const count = familyCount.get(family) ?? 0;
        if (count >= MAX_PER_FAMILY) continue;
        familyCount.set(family, count + 1);
        seen.add(key);
        real.push(o);
      }
    }

    if (kind === "freelancing") {
      const freelance = real.filter(isFreelanceLike).slice(0, 6);
      items = [...freelance, ...buildFreelancePlatformLinks(primarySkill, role || "Freelancer")];
    } else if (kind === "internship") {
      const interns = real.filter(isInternshipLike).slice(0, 8);
      items = [...interns, ...buildInternshipPlatformLinks(primarySkill, role || "Intern")];
    } else {
      // jobs — the primary user is a fresher, so entry-friendly and India-based
      // listings lead.
      //
      // Sorting alone was not enough. The remote boards that still answer
      // without an Adzuna key skew heavily senior, so a "push seniors down"
      // ranking still handed students a full page of Staff/Lead roles — 11 of
      // 13 on a Full Stack search. Ranking cannot fix a supply problem; the
      // count has to be capped. Seniors are allowed in only up to the number of
      // entry-friendly roles found, with a small floor so a niche role still
      // returns something rather than nothing.
      // Excludes freelance-like posts as well as internships. The three tabs
      // are presented as distinct kinds of work, so a contract gig appearing
      // under both "Jobs" and "Freelancing" reads as the feed repeating itself.
      const candidates = real.filter(o => !isInternshipLike(o) && !isFreelanceLike(o));
      const byIndiaFirst = (a: Opportunity, b: Opportunity) =>
        Number(isIndiaLocation(b)) - Number(isIndiaLocation(a));
      const entryLevel = candidates.filter(isEntryFriendly).sort(byIndiaFirst);
      const seniorLevel = candidates.filter(o => !isEntryFriendly(o)).sort(byIndiaFirst);

      const MIN_SENIOR_FALLBACK = 3;
      const seniorAllowance = Math.max(MIN_SENIOR_FALLBACK, entryLevel.length);
      const jobs = [
        ...entryLevel.slice(0, 12),
        ...seniorLevel.slice(0, Math.max(0, Math.min(seniorAllowance, 12 - entryLevel.length))),
      ];
      items = [...jobs, ...buildJobPlatformLinks(primarySkill, role || "Engineer")];
    }

    setCache(cacheKey, items);
    return { items, cached: false };
  } catch (err) {
    // Fallback to platform-direct only
    const fallback =
      kind === "freelancing"
        ? buildFreelancePlatformLinks(primarySkill, role || "Freelancer")
        : kind === "internship"
        ? buildInternshipPlatformLinks(primarySkill, role || "Intern")
        : buildJobPlatformLinks(primarySkill, role || "Engineer");
    return { items: fallback, cached: false, fallback: true };
  }
}

router.get("/opportunities", async (req, res) => {
  const kindRaw = String(req.query.kind || "").trim();
  const role = String(req.query.role || "").trim();
  const skillsRaw = String(req.query.skills || "").trim();
  if (!["jobs", "internship", "freelancing"].includes(kindRaw)) {
    return res.status(400).json({ error: "kind must be jobs|internship|freelancing" });
  }
  const kind = kindRaw as Kind;
  const skills = skillsRaw ? skillsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

  try {
    const result = await getOpportunities(kind, role, skills);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "opportunities fetch failed");
    return res.json({ items: [], cached: false, fallback: true });
  }
});

export default router;
