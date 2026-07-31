import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, Plus, Trash2, Sparkles,
  Loader2, Building2, AlignLeft, ChevronRight, X, Pencil,
  Check, PlusCircle, MinusCircle, Zap, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type jsPDF from "jspdf";
import { apiFetch } from "@/lib/api/authFetch";
import { upgradeContent, buildAtsReport } from "@workspace/resume-core";
import { renderResumePdf, TEMPLATE_REGISTRY, resolveTemplateConfig, preloadFonts } from "@/lib/resume-pdf";
import { ResumePreview, ResumeThumbnail, preloadPdfjs } from "@/components/resume/ResumePreview";

// ─── Types ────────────────────────────────────────────────────────────────────

// Raw shape of the `content` jsonb column as read from the API — a union of
// the legacy v1 flat shape and the pipeline's v2 shape (see upgradeContent()
// in @workspace/resume-core for the authoritative normalizer). Fields the UI
// still edits directly (skillSections.items, projects.tech/bullets,
// achievements) accept either shape; toCommaString()/toBulletString() below
// coerce whichever one shows up.
type LooseBullet = string | { text: string };
interface ResumeContent {
  name: string;
  email: string;
  phone?: string | null;
  city: string;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  degree: string;
  college: string;
  startYear: number;
  gradYear: number;
  cgpa?: string | null;
  summary: string;
  skillSections: { category: string; items: string | string[] }[];
  experience?: { company: string; role: string; period: string; bullets: LooseBullet[] }[];
  projects: { title: string; tech: string | string[]; bullets: LooseBullet[] }[];
  certifications: { name: string; issuer: string; date?: string }[];
  achievements: LooseBullet[];
  atsMeta?: unknown;
}

function toCommaString(v: string | string[] | undefined | null): string {
  return Array.isArray(v) ? v.join(", ") : v ?? "";
}
function toBulletString(b: LooseBullet): string {
  return typeof b === "string" ? b : b.text;
}

interface SavedResume {
  id: number;
  studentId: number;
  name: string;
  templateId: string;
  jdText?: string | null;
  companyName?: string | null;
  content: ResumeContent;
  createdAt: string;
}

// ─── Template definitions ─────────────────────────────────────────────────────
//
// TEMPLATE_REGISTRY (src/lib/resume-pdf) is the single source of truth for
// template id/label/description — it used to be duplicated here with
// slightly different wording, which is exactly the kind of drift a shared
// registry exists to prevent. resolveTemplateConfig() also fixes the old bug
// where an unrecognized templateId showed an "ATS Pro" badge but downloaded
// a Classic PDF (two different fallbacks for the same bad id).
const TEMPLATE_LIST = Object.values(TEMPLATE_REGISTRY);

// ─── Recommendation Engine ────────────────────────────────────────────────────

// Company/role/skill mapping is a static reference taxonomy (which stacks
// these companies are known to hire for) — not a live listing. It carries no
// salary figure or opening count, since neither can be verified per-student
// and both were previously invented numbers presented as fact.
interface RoleRec {
  company: string;
  role: string;
  tier: "tier1" | "tier2" | "startup";
  triggerSkills: string[];
  logo: string;
}

const ALL_RECS: RoleRec[] = [
  // Tier 1 — Product companies
  { company: "Google", role: "SDE-1", tier: "tier1", logo: "G", triggerSkills: ["python", "java", "c++", "dsa", "algorithms", "data structures"] },
  { company: "Microsoft", role: "SDE-1", tier: "tier1", logo: "M", triggerSkills: ["java", "c#", ".net", "azure", "python", "typescript", "dsa"] },
  { company: "Amazon", role: "SDE-1", tier: "tier1", logo: "A", triggerSkills: ["java", "python", "aws", "dsa", "distributed systems"] },
  { company: "Flipkart", role: "SDE-1", tier: "tier1", logo: "F", triggerSkills: ["java", "python", "react", "dsa", "kafka", "mysql"] },
  { company: "Atlassian", role: "Software Dev", tier: "tier1", logo: "AT", triggerSkills: ["java", "python", "javascript", "react", "jira"] },
  { company: "Adobe", role: "MTS-1", tier: "tier1", logo: "AD", triggerSkills: ["java", "c++", "python", "ml", "graphics", "javascript"] },
  // Data / ML
  { company: "Google", role: "Data Analyst", tier: "tier1", logo: "G", triggerSkills: ["python", "sql", "pandas", "machine learning", "bigquery", "data analytics"] },
  { company: "Meesho", role: "Data Analyst", tier: "tier2", logo: "ME", triggerSkills: ["python", "pandas", "sql", "machine learning", "tableau", "data analytics", "numpy"] },
  { company: "Juspay", role: "ML Engineer", tier: "tier2", logo: "JP", triggerSkills: ["machine learning", "python", "tensorflow", "pytorch", "data science", "ai", "ml"] },
  // Tier 2 — Indian unicorns
  { company: "Razorpay", role: "Backend Engineer", tier: "tier2", logo: "R", triggerSkills: ["node.js", "python", "java", "golang", "go", "postgresql", "redis"] },
  { company: "Swiggy", role: "SDE-1", tier: "tier2", logo: "SW", triggerSkills: ["react", "node.js", "python", "java", "golang", "mongodb"] },
  { company: "Zomato", role: "SDE-1", tier: "tier2", logo: "Z", triggerSkills: ["react", "node.js", "python", "redis", "kafka", "mysql"] },
  { company: "PhonePe", role: "SDE-1", tier: "tier2", logo: "PP", triggerSkills: ["java", "kotlin", "spring", "mysql", "kafka", "microservices"] },
  { company: "CRED", role: "SDE-1", tier: "tier2", logo: "CR", triggerSkills: ["kotlin", "swift", "react native", "java", "ios", "android", "mobile"] },
  { company: "Zerodha", role: "Software Dev", tier: "tier2", logo: "ZE", triggerSkills: ["python", "javascript", "react", "go", "golang", "postgresql"] },
  { company: "Groww", role: "SDE-1", tier: "tier2", logo: "GR", triggerSkills: ["react", "java", "kotlin", "spring", "android", "mysql"] },
  { company: "Ola", role: "SDE-1", tier: "tier2", logo: "OL", triggerSkills: ["react", "node.js", "python", "java", "kafka", "aws"] },
  // Frontend / Full-stack
  { company: "upGrad", role: "Full Stack Dev", tier: "startup", logo: "UG", triggerSkills: ["react", "node.js", "mongodb", "express", "javascript", "typescript", "nextjs"] },
  { company: "BrowserStack", role: "SDE-1", tier: "startup", logo: "BS", triggerSkills: ["java", "javascript", "react", "selenium", "qa", "testing", "automation"] },
  { company: "Freshworks", role: "SDE-1", tier: "startup", logo: "FW", triggerSkills: ["ruby", "react", "javascript", "python", "salesforce"] },
  { company: "Postman", role: "SDE-1", tier: "startup", logo: "PM", triggerSkills: ["javascript", "typescript", "react", "node.js", "api", "rest"] },
  { company: "Hasura", role: "Backend Dev", tier: "startup", logo: "HA", triggerSkills: ["graphql", "postgresql", "haskell", "node.js", "typescript", "api"] },
  // Cloud / DevOps
  { company: "Nutanix", role: "SDE-1", tier: "tier2", logo: "NU", triggerSkills: ["kubernetes", "docker", "cloud", "aws", "azure", "devops", "linux"] },
  { company: "Druva", role: "Cloud Dev", tier: "startup", logo: "DR", triggerSkills: ["aws", "go", "golang", "kubernetes", "docker", "cloud", "devops"] },
  // Cybersec
  { company: "Rubrik", role: "SDE-1", tier: "tier2", logo: "RU", triggerSkills: ["cybersecurity", "security", "python", "c++", "networking"] },
];

function getMatchScore(rec: RoleRec, userSkills: string[]): number {
  if (!userSkills.length) return 0;
  const lower = userSkills.map(s => s.toLowerCase());
  let hits = 0;
  for (const trigger of rec.triggerSkills) {
    if (lower.some(us => us.includes(trigger) || trigger.includes(us))) hits++;
  }
  return hits / rec.triggerSkills.length;
}

// matchPct is a real skill-overlap percentage against each company's listed
// stack — it can be 0, and is never padded with an artificial floor.
function getRecommendations(userSkills: string[]): (RoleRec & { matchPct: number })[] {
  const scored = ALL_RECS.map(rec => ({
    ...rec,
    matchPct: Math.round(getMatchScore(rec, userSkills) * 100),
  }));

  if (!userSkills.length) {
    // No skills yet: show a balanced mix with an honest 0% match rather than guessing.
    return scored
      .filter(r => ["Google", "Flipkart", "Razorpay", "Swiggy", "upGrad", "Freshworks"].includes(r.company))
      .slice(0, 8);
  }

  // Deduplicate by company+role, sort by match desc, keep top 8
  const seen = new Set<string>();
  return scored
    .filter(r => { const k = `${r.company}|${r.role}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.matchPct - a.matchPct)
    .slice(0, 8);
}

const TIER_META = {
  tier1: { label: "Tier 1" },
  tier2: { label: "Unicorn" },
  startup: { label: "Startup" },
};

function TargetRecommendations({
  studentId,
  onGenerate,
}: {
  studentId: number;
  onGenerate: (company: string, role: string) => void;
}) {
  const [recs, setRecs] = useState<(RoleRec & { matchPct: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/students/${studentId}/full-profile`)
      .then(r => r.ok ? r.json() : null)
      .then((profile: { skillSections?: { items: string }[] } | null) => {
        const skills = (profile?.skillSections ?? [])
          .flatMap(s => s.items.split(",").map(i => i.trim().toLowerCase()))
          .filter(Boolean);
        setRecs(getRecommendations(skills));
      })
      .catch(() => setRecs(getRecommendations([])))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-48 rounded-lg" />
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-44 rounded-2xl shrink-0" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Target Companies &amp; Roles</h2>
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted ml-auto">
          {recs.length} matches
        </span>
      </div>
      <p className="text-[12px] text-ink-muted -mt-1">Companies known to hire for this stack — match % is your skill overlap, not a live opening. Click to generate a tailored resume.</p>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
        {recs.map((rec, i) => {
          const tier = TIER_META[rec.tier];
          return (
            <motion.div
              key={`${rec.company}-${rec.role}-${i}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="shrink-0 w-44 bg-paper rounded-2xl shadow-soft overflow-hidden"
            >
              <div className="p-3 space-y-2.5">
                {/* Logo + Tier label */}
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-line text-ink font-bold text-[10px]">
                    {rec.logo}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    {tier.label}
                  </span>
                </div>

                {/* Company + Role */}
                <div>
                  <p className="font-bold text-ink text-[14px] leading-tight">{rec.company}</p>
                  <p className="text-[11px] text-ink-muted font-semibold leading-tight mt-0.5">{rec.role}</p>
                </div>

                {/* Match bar — real skill overlap with this company's known stack */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Skill match</span>
                    <span className="text-[11px] font-bold text-ink">{rec.matchPct}%</span>
                  </div>
                  <div className="h-1.5 bg-line rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${rec.matchPct}%` }}
                    />
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => onGenerate(rec.company, rec.role)}
                  className="w-full h-8 rounded-full bg-brand text-white font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <Zap className="w-3 h-3" />
                  Generate Resume
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PDF generation ───────────────────────────────────────────────────────────
//
// The four hand-rolled jsPDF templates that used to live here (ten arbitrary
// font sizes, four body grays, a broken bullet glyph, silently-dropped
// Experience/tech-stack content, bullets split mid-line across pages — see
// the resume-quality-overhaul plan for the full list) are gone. Rendering now
// goes through the shared typeset engine in src/lib/resume-pdf/, which both
// this download path and the live preview (Phase 3) use identically, so what
// a student sees on screen and what they download are pixel-for-pixel the
// same PDF bytes.
//
// upgradeContent() bridges the server's current v1 content shape (this file's
// ResumeContent type) into the engine's ResumeDocument (v2) — a pure,
// read-time conversion, so this keeps working unchanged once Phase 5 starts
// persisting v2 content directly.

async function downloadResumePDF(resume: SavedResume): Promise<void> {
  const doc = upgradeContent(resume.content);
  const { doc: pdfDoc, filename } = await renderResumePdf(doc, resume.templateId, {
    resumeName: resume.name,
    companyName: resume.companyName ?? null,
  });
  openPDF(pdfDoc, filename);
}

// Opens PDF in a new tab instead of direct download — avoids Chrome/Edge
// Safe Browsing "Virus detected" false-positive on blob downloads
function openPDF(doc: jsPDF, filename: string) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Short delay before revoke so browser has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── Edit Resume Sheet ────────────────────────────────────────────────────────

function EditResumeSheet({
  resume,
  studentId,
  onClose,
  onSaved,
}: {
  resume: SavedResume;
  studentId: number;
  onClose: () => void;
  onSaved: (updated: SavedResume) => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [templateId, setTemplateId] = useState(resume.templateId);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const [summary, setSummary] = useState(resume.content.summary ?? "");
  // The AI pipeline persists v2-shaped content (skill items / project tech as
  // string[], bullets/achievements as {text,evidence}) while this edit form
  // still operates on v1's flat strings — normalize on read so an untouched
  // v2 field round-trips through Save correctly instead of 400ing. Full v2
  // edit surface is Phase 6 scope.
  const [skillSections, setSkillSections] = useState(
    (resume.content.skillSections ?? []).map(s => ({ category: s.category, items: toCommaString(s.items) }))
  );
  const [projects, setProjects] = useState(
    (resume.content.projects ?? []).map(p => ({
      ...p,
      tech: toCommaString(p.tech),
      bullets: (p.bullets ?? []).map(toBulletString),
    }))
  );
  const [achievements, setAchievements] = useState((resume.content.achievements ?? []).map(toBulletString));

  // Reconstructed on every edit — feeds both the live preview and the live ATS
  // recompute, so what's shown always matches what Save will persist.
  const liveDoc = useMemo(() => upgradeContent({
    ...resume.content,
    summary,
    skillSections,
    projects,
    achievements,
  }), [resume.content, summary, skillSections, projects, achievements]);

  const atsReport = useMemo(
    () => buildAtsReport({ doc: liveDoc, jdText: resume.jdText ?? undefined }),
    [liveDoc, resume.jdText],
  );

  const updateSkillCategory = (i: number, val: string) => {
    setSkillSections(prev => prev.map((s, idx) => idx === i ? { ...s, category: val } : s));
  };
  const updateSkillItems = (i: number, val: string) => {
    setSkillSections(prev => prev.map((s, idx) => idx === i ? { ...s, items: val } : s));
  };
  const addSkillSection = () => setSkillSections(prev => [...prev, { category: "", items: "" }]);
  const removeSkillSection = (i: number) => setSkillSections(prev => prev.filter((_, idx) => idx !== i));

  const updateProjectTitle = (i: number, val: string) => {
    setProjects(prev => prev.map((p, idx) => idx === i ? { ...p, title: val } : p));
  };
  const updateProjectTech = (i: number, val: string) => {
    setProjects(prev => prev.map((p, idx) => idx === i ? { ...p, tech: val } : p));
  };
  const updateProjectBullet = (pi: number, bi: number, val: string) => {
    setProjects(prev => prev.map((p, idx) => idx === pi
      ? { ...p, bullets: p.bullets.map((b, bidx) => bidx === bi ? val : b) }
      : p
    ));
  };
  const addProjectBullet = (pi: number) => {
    setProjects(prev => prev.map((p, idx) => idx === pi
      ? { ...p, bullets: [...p.bullets, ""] }
      : p
    ));
  };
  const removeProjectBullet = (pi: number, bi: number) => {
    setProjects(prev => prev.map((p, idx) => idx === pi
      ? { ...p, bullets: p.bullets.filter((_, bidx) => bidx !== bi) }
      : p
    ));
  };

  const updateAchievement = (i: number, val: string) => {
    setAchievements(prev => prev.map((a, idx) => idx === i ? val : a));
  };
  const addAchievement = () => setAchievements(prev => [...prev, ""]);
  const removeAchievement = (i: number) => setAchievements(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await apiFetch(`/api/students/${studentId}/resumes/${resume.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { summary, skillSections, projects, achievements },
          ...(templateId !== resume.templateId ? { templateId } : {}),
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to save");
      }
      const updated = await r.json() as SavedResume;
      toast({ title: "Changes saved!" });
      onSaved(updated);
      onClose();
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const previewPanel = (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        {TEMPLATE_LIST.map(t => (
          <button
            key={t.id}
            onClick={() => setTemplateId(t.id)}
            className={`rounded-lg px-2 py-1.5 text-[10px] font-bold border transition-colors ${
              templateId === t.id ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ResumePreview resume={liveDoc} templateId={templateId} />
      {atsReport && (
        <div className="bg-brand-soft rounded-xl p-3">
          <p className="text-[11px] font-bold text-brand">ATS match {atsReport.scorePct}%</p>
          <p className="text-[10px] text-ink-muted mt-1">
            {atsReport.mustCoverage.matched}/{atsReport.mustCoverage.total} must-have keywords covered
          </p>
        </div>
      )}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-ink/40 flex items-end lg:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-lg lg:max-w-4xl mx-auto bg-paper rounded-t-3xl lg:rounded-3xl flex flex-col max-h-[92vh] lg:max-h-[85dvh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="pt-3 pb-1 flex justify-center shrink-0 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-line" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-line shrink-0">
          <h2 className="text-[18px] font-extrabold text-ink flex items-center gap-2">
            <Pencil className="w-4 h-4 text-ink" />
            Edit Resume
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMobilePreview(true)}
              className="lg:hidden h-8 px-3 rounded-full border border-line flex items-center gap-1.5 text-[11px] font-bold text-brand"
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full border border-line flex items-center justify-center">
              <X className="w-4 h-4 text-ink-muted" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden lg:flex lg:flex-row">
        <div className="overflow-y-auto h-full lg:flex-1 px-5 py-4 space-y-6">

          {/* Summary */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Professional Summary</label>
            <Textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={4}
              className="rounded-xl border border-line focus:border-brand text-ink text-sm resize-none"
            />
          </div>

          {/* Skills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Skill Sections</label>
              <button
                onClick={addSkillSection}
                className="flex items-center gap-1 text-[11px] font-bold text-brand"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {skillSections.map((s, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={s.category}
                    onChange={e => updateSkillCategory(i, e.target.value)}
                    placeholder="Category (e.g. Languages)"
                    className="rounded-lg border border-line focus:border-brand text-ink text-sm h-8"
                  />
                  <Input
                    value={s.items}
                    onChange={e => updateSkillItems(i, e.target.value)}
                    placeholder="Items (comma-separated)"
                    className="rounded-lg border border-line focus:border-brand text-ink text-sm h-8"
                  />
                </div>
                <button
                  onClick={() => removeSkillSection(i)}
                  className="mt-1 text-danger shrink-0"
                >
                  <MinusCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Projects */}
          <div className="space-y-4">
            <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Projects</label>
            {projects.map((p, pi) => (
              <div key={pi} className="bg-paper rounded-xl p-3 space-y-2 border border-line">
                <div className="flex gap-2">
                  <Input
                    value={p.title}
                    onChange={e => updateProjectTitle(pi, e.target.value)}
                    placeholder="Project title"
                    className="rounded-lg border border-line focus:border-brand text-ink text-sm h-8 flex-1"
                  />
                  <Input
                    value={p.tech}
                    onChange={e => updateProjectTech(pi, e.target.value)}
                    placeholder="Tech stack"
                    className="rounded-lg border border-line focus:border-brand text-ink text-sm h-8 flex-1"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Bullets</p>
                  {p.bullets.map((b, bi) => (
                    <div key={bi} className="flex gap-1.5 items-center">
                      <Textarea
                        value={b}
                        onChange={e => updateProjectBullet(pi, bi, e.target.value)}
                        rows={2}
                        className="flex-1 rounded-lg border border-line focus:border-brand text-ink text-xs resize-none"
                      />
                      <button onClick={() => removeProjectBullet(pi, bi)} className="text-danger shrink-0">
                        <MinusCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addProjectBullet(pi)}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand mt-1"
                  >
                    <PlusCircle className="w-3 h-3" /> Add bullet
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Achievements */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Achievements</label>
              <button
                onClick={addAchievement}
                className="flex items-center gap-1 text-[11px] font-bold text-brand"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {achievements.map((a, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <Input
                  value={a}
                  onChange={e => updateAchievement(i, e.target.value)}
                  placeholder="Achievement"
                  className="flex-1 rounded-lg border border-line focus:border-brand text-ink text-sm h-8"
                />
                <button onClick={() => removeAchievement(i)} className="text-danger shrink-0">
                  <MinusCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop split-view preview — same panel content reused in the mobile overlay below */}
        <div className="hidden lg:flex lg:flex-col lg:w-[320px] lg:shrink-0 lg:border-l lg:border-line lg:overflow-y-auto lg:p-4 lg:space-y-3">
          {previewPanel}
        </div>
        </div>

        <div className="px-5 pb-8 pt-3 border-t border-line shrink-0">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 rounded-full bg-brand text-white hover:bg-brand/90 font-bold text-[15px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showMobilePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-ink/60 flex items-center justify-center p-4 lg:hidden"
            onClick={() => setShowMobilePreview(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-paper rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-4 space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-ink text-sm">Live Preview</p>
                <button onClick={() => setShowMobilePreview(false)}>
                  <X className="w-4 h-4 text-ink-muted" />
                </button>
              </div>
              {previewPanel}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Resume Card ──────────────────────────────────────────────────────────────

function ResumeCard({
  resume,
  onDelete,
  onDownload,
  onEdit,
}: {
  resume: SavedResume;
  onDelete: () => void;
  onDownload: () => void;
  onEdit: () => void;
}) {
  const tmpl = resolveTemplateConfig(resume.templateId);
  const date = new Date(resume.createdAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
  const liveDoc = useMemo(() => upgradeContent(resume.content), [resume.content]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-paper rounded-2xl shadow-soft p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <ResumeThumbnail
          resume={liveDoc}
          templateId={resume.templateId}
          className="w-14 aspect-[1/1.414] rounded-md overflow-hidden shrink-0 border border-line"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink text-[15px] truncate">{resume.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand">
              {tmpl.label}
            </span>
            {resume.companyName && (
              <span className="text-[11px] text-ink-muted font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3" />{resume.companyName}
              </span>
            )}
            <span className="text-[11px] text-ink-muted">{date}</span>
          </div>
          {liveDoc.atsMeta && (
            <div className="mt-2" title={
              liveDoc.atsMeta.missing.length > 0
                ? `Missing: ${liveDoc.atsMeta.missing.map(m => m.term).join(", ")} — skill gaps to learn, not padded in`
                : "All extracted JD keywords are covered by your real profile"
            }>
              {/* Single-color brand pill, not a red/amber/green threshold ramp — the
                  design system reserves that ramp for completed/passing (done) and
                  error (danger) states only, never for a continuous score. */}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand">
                ATS match {liveDoc.atsMeta.scorePct}%
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
        >
          <Trash2 className="w-4 h-4 text-danger" />
        </button>
      </div>

      {resume.content.summary && (
        <p className="text-[12px] text-ink-muted line-clamp-2 mb-3 leading-relaxed">
          {resume.content.summary}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={onEdit}
          variant="outline"
          className="flex-1 h-9 rounded-full font-bold text-xs border border-line text-brand"
        >
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Edit
        </Button>
        <Button
          onClick={onDownload}
          className="flex-1 h-9 rounded-full bg-brand text-white hover:bg-brand/90 font-bold text-xs"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download PDF
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Generate Sheet ───────────────────────────────────────────────────────────

function GenerateSheet({
  onClose,
  onGenerated,
  studentId,
  initialCompany = "",
  initialRole = "",
  initialJd = "",
  initialTags = [],
}: {
  onClose: () => void;
  onGenerated: (r: SavedResume) => void;
  studentId: number;
  initialCompany?: string;
  initialRole?: string;
  initialJd?: string;
  initialTags?: string[];
}) {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState("ats");
  const [jdText, setJdText] = useState(initialJd);
  const [companyName, setCompanyName] = useState(initialCompany);
  const [resumeName, setResumeName] = useState(
    initialCompany && initialRole ? `${initialCompany} — ${initialRole}` : ""
  );
  const [generating, setGenerating] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<SavedResume | null>(null);
  const [finishing, setFinishing] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await apiFetch(`/api/students/${studentId}/resumes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId, jdText, companyName, resumeName,
          roleTitle: initialRole, jobTags: initialTags,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to generate");
      }
      const saved = await r.json() as SavedResume;
      toast({ title: "Resume generated!", description: saved.name });
      // Show a result step instead of closing immediately — template tiles
      // below re-render the real PDF instantly with zero further AI calls.
      setGeneratedResume(saved);
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const previewDoc = useMemo(
    () => (generatedResume ? upgradeContent(generatedResume.content) : null),
    [generatedResume],
  );

  const handleDone = async () => {
    if (!generatedResume) return;
    setFinishing(true);
    let finalResume = generatedResume;
    if (templateId !== generatedResume.templateId) {
      try {
        const r = await apiFetch(`/api/students/${studentId}/resumes/${generatedResume.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId }),
        });
        if (r.ok) finalResume = await r.json() as SavedResume;
      } catch {
        // Non-fatal — the resume was already generated and saved; keep its
        // original template rather than blocking the student here.
      }
    }
    setFinishing(false);
    onGenerated(finalResume);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-ink/40 flex items-end lg:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-lg mx-auto bg-paper rounded-t-3xl lg:rounded-3xl p-5 pb-8 space-y-5 max-h-[92dvh] lg:max-h-[85dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center -mt-2 mb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-line" />
        </div>

        {generatedResume && previewDoc ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-extrabold text-ink flex items-center gap-2">
                <Check className="w-4 h-4 text-brand" />
                Resume Ready
              </h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full border border-line flex items-center justify-center">
                <X className="w-4 h-4 text-ink-muted" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                Try a different look
                <span className="text-ink-muted normal-case font-medium ml-1">(instant — no AI call)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_LIST.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`rounded-xl p-3 text-left border transition-colors ${
                      templateId === t.id
                        ? "border-brand bg-brand-soft"
                        : "border-line bg-paper"
                    }`}
                  >
                    <p className="font-bold text-ink text-xs">{t.label}</p>
                    <p className="text-[10px] text-ink-muted mt-0.5 leading-tight">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <ResumePreview resume={previewDoc} templateId={templateId} className="max-w-[280px] mx-auto" />

            {previewDoc.atsMeta && (
              <div className="flex justify-center">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand">
                  ATS match {previewDoc.atsMeta.scorePct}%
                </span>
              </div>
            )}

            <Button
              onClick={handleDone}
              disabled={finishing}
              className="w-full h-12 rounded-full bg-brand text-white hover:bg-brand/90 font-bold text-[15px]"
            >
              {finishing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Finishing…
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Done
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-extrabold text-ink flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand" />
                Generate New Resume
              </h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full border border-line flex items-center justify-center">
                <X className="w-4 h-4 text-ink-muted" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Template</label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_LIST.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`rounded-xl p-3 text-left border transition-colors ${
                      templateId === t.id
                        ? "border-brand bg-brand-soft"
                        : "border-line bg-paper"
                    }`}
                  >
                    <p className="font-bold text-ink text-xs">{t.label}</p>
                    <p className="text-[10px] text-ink-muted mt-0.5 leading-tight">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Company Name
                <span className="text-ink-muted normal-case font-medium ml-1">(optional)</span>
              </label>
              <Input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Google, Flipkart, Razorpay"
                className="rounded-xl border border-line focus:border-brand text-ink"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1">
                <AlignLeft className="w-3 h-3" /> Job Description
                <span className="text-ink-muted normal-case font-medium ml-1">(optional — paste JD for tailored resume)</span>
              </label>
              <Textarea
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder="Paste job description here for an ATS-optimized, targeted resume..."
                rows={4}
                className="rounded-xl border border-line focus:border-brand text-ink text-sm resize-none"
              />
              {!jdText && (initialCompany || initialTags.length > 0) && (
                <p className="text-[11px] text-ink-muted">
                  Tip: paste the JD from the posting for the strongest tailoring.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                Resume Name
                <span className="text-ink-muted normal-case font-medium ml-1">(optional)</span>
              </label>
              <Input
                value={resumeName}
                onChange={e => setResumeName(e.target.value)}
                placeholder="e.g. Google SWE Resume, FAANG Attempt 1"
                className="rounded-xl border border-line focus:border-brand text-ink"
              />
            </div>

            <Button
              onClick={generate}
              disabled={generating}
              className="w-full h-12 rounded-full bg-brand text-white hover:bg-brand/90 font-bold text-[15px]"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI is building your resume…
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Resume
                </>
              )}
            </Button>
            {generating && (
              <p className="text-center text-[12px] text-ink-muted -mt-2">
                Using your real profile data — this takes 10–20 seconds
              </p>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Resume() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateFor, setGenerateFor] = useState<
    { company: string; role: string; jd?: string; tags?: string[] } | null
  >(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingResume, setEditingResume] = useState<SavedResume | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) { setLocation("/"); return; }
    setStudentId(parseInt(id, 10));
  }, [setLocation]);

  // Warm the font cache and pdf.js worker so the first live preview doesn't eat the delay.
  useEffect(() => {
    preloadFonts();
    preloadPdfjs();
  }, []);

  // Seeded by Opportunities/Pipeline via sessionStorage.resumeContext — consumed
  // once so a refresh or back-nav to /resume never reopens the sheet.
  useEffect(() => {
    const raw = sessionStorage.getItem("resumeContext");
    if (!raw) return;
    sessionStorage.removeItem("resumeContext");
    try {
      const ctx = JSON.parse(raw) as { company?: string; role?: string; jd?: string; tags?: string[] };
      setGenerateFor({
        company: ctx.company ?? "",
        role: ctx.role ?? "",
        jd: ctx.jd ?? "",
        tags: Array.isArray(ctx.tags) ? ctx.tags : [],
      });
    } catch {
      // malformed context — ignore, sheet simply doesn't auto-open
    }
  }, []);

  const fetchResumes = useCallback(async (id: number) => {
    try {
      const r = await apiFetch(`/api/students/${id}/resumes`);
      if (r.ok) {
        const data = await r.json() as SavedResume[];
        setResumes(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentId) fetchResumes(studentId);
  }, [studentId, fetchResumes]);

  // Powers the "add experience" nudge below — the resume pipeline can only
  // fill an Experience section from what's actually in the student's profile.
  const [experienceCount, setExperienceCount] = useState<number | null>(null);
  useEffect(() => {
    if (!studentId) return;
    apiFetch(`/api/students/${studentId}/full-profile`)
      .then(r => r.ok ? r.json() : null)
      .then((p: { experience?: unknown[] } | null) => setExperienceCount(Array.isArray(p?.experience) ? p.experience.length : 0))
      .catch(() => setExperienceCount(0));
  }, [studentId]);

  const handleGenerated = (saved: SavedResume) => {
    setResumes(prev => [saved, ...prev]);
  };

  const handleResumeUpdated = (updated: SavedResume) => {
    setResumes(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const handleDelete = async (resumeId: number) => {
    if (!studentId) return;
    setDeletingId(resumeId);
    try {
      const r = await apiFetch(`/api/students/${studentId}/resumes/${resumeId}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Failed to delete");
      setResumes(prev => prev.filter(r => r.id !== resumeId));
      toast({ title: "Resume deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 pb-28 max-w-md lg:max-w-3xl mx-auto space-y-4 min-h-screen bg-canvas">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 pb-28 max-w-md lg:max-w-3xl mx-auto space-y-5 min-h-screen bg-canvas">
        <Button
          variant="ghost"
          onClick={() => setLocation("/profile")}
          className="-ml-2 text-ink-muted font-bold"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-extrabold text-ink leading-[1.06] tracking-tight">
              My Resumes
            </h1>
            <p className="text-[13px] text-ink-muted mt-1">
              AI-generated from your real profile · ATS-friendly
            </p>
          </div>
          <motion.div whileTap={{ scale: 0.96 }}>
            <Button
              onClick={() => setGenerateFor({ company: "", role: "" })}
              className="rounded-full bg-brand text-white hover:bg-brand/90 font-bold px-4 h-10"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New
            </Button>
          </motion.div>
        </div>

        {/* ── Company & Role Recommendations */}
        {studentId && (
          <TargetRecommendations
            studentId={studentId}
            onGenerate={(company, role) => setGenerateFor({ company, role })}
          />
        )}

        {resumes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-8 space-y-3"
          >
            <p className="text-[15px] font-bold text-ink">No resumes yet</p>
            <p className="text-[13px] text-ink-muted leading-relaxed">
              Pick a company above or generate a blank resume to get started.
            </p>
            <Button
              onClick={() => setGenerateFor({ company: "", role: "" })}
              className="rounded-full bg-brand text-white hover:bg-brand/90 font-bold px-4 h-11"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate First Resume
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Your Resumes</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              <AnimatePresence mode="popLayout">
                {resumes.map(resume => (
                  <ResumeCard
                    key={resume.id}
                    resume={resume}
                    onDelete={() => {
                      if (deletingId !== resume.id) handleDelete(resume.id);
                    }}
                    onDownload={() => {
                      downloadResumePDF(resume).catch((e) => {
                        toast({ title: "Couldn't generate PDF", description: (e as Error).message, variant: "destructive" });
                      });
                    }}
                    onEdit={() => setEditingResume(resume)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        <div className="bg-paper rounded-2xl shadow-soft p-4">
          <p className="text-[14px] font-bold text-ink mb-1">Pro tip</p>
          <p className="text-[12px] text-ink-muted leading-relaxed">
            {experienceCount === 0
              ? "Your Experience section is empty — even an internship or a part-time freelance gig gives the AI real material to write from."
              : "Complete your Profile with real projects and certifications — the AI will use them to generate a much stronger, targeted resume for each company."}
          </p>
          <button
            onClick={() => {
              if (experienceCount === 0) {
                sessionStorage.setItem("profileScrollTo", "experience-section");
              }
              setLocation("/profile");
            }}
            className="mt-3 flex items-center gap-1 text-[12px] font-bold text-brand"
          >
            {experienceCount === 0 ? "Add experience" : "Update my profile"} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {generateFor !== null && studentId && (
          <GenerateSheet
            studentId={studentId}
            onClose={() => setGenerateFor(null)}
            onGenerated={handleGenerated}
            initialCompany={generateFor.company}
            initialRole={generateFor.role}
            initialJd={generateFor.jd}
            initialTags={generateFor.tags}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingResume && studentId && (
          <EditResumeSheet
            resume={editingResume}
            studentId={studentId}
            onClose={() => setEditingResume(null)}
            onSaved={handleResumeUpdated}
          />
        )}
      </AnimatePresence>
    </>
  );
}
