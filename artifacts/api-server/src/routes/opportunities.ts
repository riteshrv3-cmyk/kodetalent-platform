import { Router } from "express";

const router = Router();

type Kind = "jobs" | "internship" | "freelancing";

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

function normalizeRemoteOk(raw: RemoteOkRaw): Opportunity | null {
  if (!raw.position || !raw.company) return null;
  const url = raw.url || raw.apply_url || (raw.slug ? `https://remoteok.com/remote-jobs/${raw.slug}` : "");
  if (!url) return null;
  return {
    id: String(raw.id ?? raw.slug ?? `${raw.company}-${raw.position}`),
    title: raw.position,
    company: raw.company,
    logo: raw.company_logo || raw.logo || null,
    location: raw.location || "Remote",
    pay: fmtPay(raw.salary_min, raw.salary_max),
    postedAt: timeAgo(raw.date),
    tags: (raw.tags || []).slice(0, 4),
    url: url.startsWith("http") ? url : `https://remoteok.com${url}`,
    source: "RemoteOK",
  };
}

async function fetchRemoteOk(skill: string): Promise<Opportunity[]> {
  const tag = skill.trim().toLowerCase().replace(/[^a-z0-9.+-]/g, "");
  const url = tag
    ? `https://remoteok.com/api?tags=${encodeURIComponent(tag)}`
    : `https://remoteok.com/api`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const json: unknown = await res.json();
    if (!Array.isArray(json)) return [];
    // First element is metadata in RemoteOK responses.
    const items = (json as RemoteOkRaw[]).slice(1);
    return items
      .map(normalizeRemoteOk)
      .filter((x): x is Opportunity => x !== null);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
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
export function isRelevant(o: Pick<Opportunity, "title" | "tags">, skills: string[], role: string): boolean {
  const keywords = keywordSet(skills, role);
  if (keywords.length === 0) return true;

  const titleHay = ` ${o.title.toLowerCase()} `;
  const activeDenylist = TITLE_DENYLIST.filter(
    entry => !entry.trim().split(/\s+/).some(w => keywords.some(k => k.includes(w) || w.includes(k))),
  );
  if (activeDenylist.some(entry => titleHay.includes(entry))) return false;

  // A keyword in the title is a strong signal — keep.
  if (keywords.some(k => titleHay.includes(k))) return true;

  // A keyword only in the tags is weak (RemoteOK stuffs `react` etc. onto
  // couriers and merchandisers), so it must be backed by a title that at
  // least reads as a tech role.
  const tagHay = o.tags.join(" ").toLowerCase();
  return keywords.some(k => tagHay.includes(k)) && TECH_TITLE.test(o.title);
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

function buildFreelancePlatformLinks(skill: string, role: string): Opportunity[] {
  const q = encodeURIComponent(`${role} ${skill}`.trim());
  return [
    {
      id: "upwork-" + skill,
      title: `${role} contracts`,
      company: "Upwork",
      logo: null,
      location: "Worldwide · Remote",
      pay: "$15–80/hr typical",
      postedAt: "Live search",
      tags: [skill, "Freelance"],
      url: `https://www.upwork.com/nx/search/jobs/?q=${q}`,
      source: "Upwork",
    },
    {
      id: "toptal-" + skill,
      title: `Senior ${role} (vetted talent)`,
      company: "Toptal",
      logo: null,
      location: "Remote",
      pay: "Top 3% network",
      postedAt: "Live search",
      tags: [skill, "Senior"],
      url: `https://www.toptal.com/talent#${q}`,
      source: "Toptal",
    },
    {
      id: "freelancer-" + skill,
      title: `${role} projects`,
      company: "Freelancer.com",
      logo: null,
      location: "Worldwide",
      pay: "Project-based",
      postedAt: "Live search",
      tags: [skill, "Project"],
      url: `https://www.freelancer.com/jobs/?keyword=${q}`,
      source: "Freelancer",
    },
    {
      id: "fiverr-" + skill,
      title: `Sell ${role} services`,
      company: "Fiverr",
      logo: null,
      location: "Worldwide",
      pay: "Set your rate",
      postedAt: "Live search",
      tags: [skill, "Gig"],
      url: `https://www.fiverr.com/search/gigs?query=${q}`,
      source: "Fiverr",
    },
  ];
}

function buildInternshipPlatformLinks(skill: string, role: string): Opportunity[] {
  const q = encodeURIComponent(`${role} ${skill}`.trim());
  const slug = `${role.toLowerCase().replace(/\s+/g, "-")}-internship`;
  return [
    {
      id: "internshala-" + skill,
      title: `${role} internships in India`,
      company: "Internshala",
      logo: null,
      location: "India · Remote/On-site",
      pay: "₹10k–25k/mo typical",
      postedAt: "Live search",
      tags: [skill, "Intern"],
      url: `https://internshala.com/internships/${encodeURIComponent(slug)}`,
      source: "Internshala",
    },
    {
      id: "linkedin-intern-" + skill,
      title: `${role} intern (India)`,
      company: "LinkedIn",
      logo: null,
      location: "India",
      pay: "Varies",
      postedAt: "Live search",
      tags: [skill, "Intern"],
      url: `https://www.linkedin.com/jobs/search/?keywords=${q}%20intern&location=India&f_E=1`,
      source: "LinkedIn",
    },
  ];
}

function buildJobPlatformLinks(skill: string, role: string): Opportunity[] {
  const q = encodeURIComponent(`${role} ${skill}`.trim());
  return [
    {
      id: "naukri-" + skill,
      title: `${role} roles in India`,
      company: "Naukri",
      logo: null,
      location: "India",
      pay: "Varies",
      postedAt: "Live search",
      tags: [skill, "Full-time"],
      url: `https://www.naukri.com/${encodeURIComponent(role.toLowerCase().replace(/\s+/g, "-"))}-jobs`,
      source: "Naukri",
    },
    {
      id: "linkedin-" + skill,
      title: `${role} on LinkedIn (India)`,
      company: "LinkedIn",
      logo: null,
      location: "India",
      pay: "Varies",
      postedAt: "Live search",
      tags: [skill, "Full-time"],
      url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=India`,
      source: "LinkedIn",
    },
  ];
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
  const primarySkill = skills[0] || "";

  // Full skills list, not just primarySkill: the relevance filter below
  // depends on every skill, so results differ per skills set.
  const cacheKey = `${kind}::${skills.join(",")}::${role}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return res.json({ items: cached.data, cached: true });
  }

  try {
    let items: Opportunity[] = [];

    const remoteRaw = primarySkill ? await fetchRemoteOk(primarySkill) : [];
    // Topical gate first — RemoteOK's tag query and tags are both noisy, and
    // this feed is the first screen after onboarding.
    const remote = remoteRaw.filter(o => isRelevant(o, skills, role));

    if (kind === "freelancing") {
      // No reliable free freelance API — use platform-direct search links.
      // Also try RemoteOK contracts as a bonus.
      const freelance = remote.filter(isFreelanceLike).slice(0, 4);
      items = [...freelance, ...buildFreelancePlatformLinks(primarySkill, role || "Freelancer")];
    } else if (kind === "internship") {
      const interns = remote.filter(isInternshipLike).slice(0, 6);
      items = [...interns, ...buildInternshipPlatformLinks(primarySkill, role || "Intern")];
    } else {
      // jobs
      const jobs = remote
        .filter(o => !isInternshipLike(o))
        .slice(0, 10);
      items = [...jobs, ...buildJobPlatformLinks(primarySkill, role || "Engineer")];
    }

    setCache(cacheKey, items);
    return res.json({ items, cached: false });
  } catch (err) {
    req.log.error({ err }, "opportunities fetch failed");
    // Fallback to platform-direct only
    const fallback =
      kind === "freelancing"
        ? buildFreelancePlatformLinks(primarySkill, role || "Freelancer")
        : kind === "internship"
        ? buildInternshipPlatformLinks(primarySkill, role || "Intern")
        : buildJobPlatformLinks(primarySkill, role || "Engineer");
    return res.json({ items: fallback, cached: false, fallback: true });
  }
});

export default router;
