import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, Plus, Trash2, Sparkles,
  Loader2, Building2, AlignLeft, ChevronRight, X, Pencil,
  Check, PlusCircle, MinusCircle, TrendingUp, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { apiFetch } from "@/lib/api/authFetch";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  skillSections: { category: string; items: string }[];
  projects: { title: string; tech: string; bullets: string[] }[];
  certifications: { name: string; issuer: string; date?: string }[];
  achievements: string[];
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

const TEMPLATES = [
  {
    id: "classic",
    label: "Classic",
    desc: "Clean ATS-friendly layout",
    badge: "bg-brand-soft text-brand",
  },
  {
    id: "tech",
    label: "Tech-Focused",
    desc: "Highlights your stack & GitHub",
    badge: "bg-brand-soft text-brand",
  },
  {
    id: "minimal",
    label: "Minimal",
    desc: "Ultra-clean typography",
    badge: "bg-brand-soft text-brand",
  },
];

function templateBadge(templateId: string) {
  return TEMPLATES.find(t => t.id === templateId) ?? TEMPLATES[0];
}

// ─── Recommendation Engine ────────────────────────────────────────────────────

interface RoleRec {
  company: string;
  role: string;
  salaryRange: string;
  tier: "tier1" | "tier2" | "startup";
  triggerSkills: string[];
  logo: string;
  openings: string;
}

const ALL_RECS: RoleRec[] = [
  // Tier 1 — Product companies
  { company: "Google", role: "SDE-1", salaryRange: "₹25–45 LPA", tier: "tier1", logo: "G", triggerSkills: ["python", "java", "c++", "dsa", "algorithms", "data structures"], openings: "35+" },
  { company: "Microsoft", role: "SDE-1", salaryRange: "₹22–40 LPA", tier: "tier1", logo: "M", triggerSkills: ["java", "c#", ".net", "azure", "python", "typescript", "dsa"], openings: "20+" },
  { company: "Amazon", role: "SDE-1", salaryRange: "₹20–38 LPA", tier: "tier1", logo: "A", triggerSkills: ["java", "python", "aws", "dsa", "distributed systems"], openings: "50+" },
  { company: "Flipkart", role: "SDE-1", salaryRange: "₹18–32 LPA", tier: "tier1", logo: "F", triggerSkills: ["java", "python", "react", "dsa", "kafka", "mysql"], openings: "25+" },
  { company: "Atlassian", role: "Software Dev", salaryRange: "₹20–35 LPA", tier: "tier1", logo: "AT", triggerSkills: ["java", "python", "javascript", "react", "jira"], openings: "10+" },
  { company: "Adobe", role: "MTS-1", salaryRange: "₹18–30 LPA", tier: "tier1", logo: "AD", triggerSkills: ["java", "c++", "python", "ml", "graphics", "javascript"], openings: "15+" },
  // Data / ML
  { company: "Google", role: "Data Analyst", salaryRange: "₹18–30 LPA", tier: "tier1", logo: "G", triggerSkills: ["python", "sql", "pandas", "machine learning", "bigquery", "data analytics"], openings: "20+" },
  { company: "Meesho", role: "Data Analyst", salaryRange: "₹10–18 LPA", tier: "tier2", logo: "ME", triggerSkills: ["python", "pandas", "sql", "machine learning", "tableau", "data analytics", "numpy"], openings: "12+" },
  { company: "Juspay", role: "ML Engineer", salaryRange: "₹14–24 LPA", tier: "tier2", logo: "JP", triggerSkills: ["machine learning", "python", "tensorflow", "pytorch", "data science", "ai", "ml"], openings: "8+" },
  // Tier 2 — Indian unicorns
  { company: "Razorpay", role: "Backend Engineer", salaryRange: "₹14–26 LPA", tier: "tier2", logo: "R", triggerSkills: ["node.js", "python", "java", "golang", "go", "postgresql", "redis"], openings: "18+" },
  { company: "Swiggy", role: "SDE-1", salaryRange: "₹14–24 LPA", tier: "tier2", logo: "SW", triggerSkills: ["react", "node.js", "python", "java", "golang", "mongodb"], openings: "22+" },
  { company: "Zomato", role: "SDE-1", salaryRange: "₹13–22 LPA", tier: "tier2", logo: "Z", triggerSkills: ["react", "node.js", "python", "redis", "kafka", "mysql"], openings: "15+" },
  { company: "PhonePe", role: "SDE-1", salaryRange: "₹16–28 LPA", tier: "tier2", logo: "PP", triggerSkills: ["java", "kotlin", "spring", "mysql", "kafka", "microservices"], openings: "20+" },
  { company: "CRED", role: "SDE-1", salaryRange: "₹15–25 LPA", tier: "tier2", logo: "CR", triggerSkills: ["kotlin", "swift", "react native", "java", "ios", "android", "mobile"], openings: "10+" },
  { company: "Zerodha", role: "Software Dev", salaryRange: "₹12–22 LPA", tier: "tier2", logo: "ZE", triggerSkills: ["python", "javascript", "react", "go", "golang", "postgresql"], openings: "8+" },
  { company: "Groww", role: "SDE-1", salaryRange: "₹12–22 LPA", tier: "tier2", logo: "GR", triggerSkills: ["react", "java", "kotlin", "spring", "android", "mysql"], openings: "12+" },
  { company: "Ola", role: "SDE-1", salaryRange: "₹12–20 LPA", tier: "tier2", logo: "OL", triggerSkills: ["react", "node.js", "python", "java", "kafka", "aws"], openings: "15+" },
  // Frontend / Full-stack
  { company: "upGrad", role: "Full Stack Dev", salaryRange: "₹10–18 LPA", tier: "startup", logo: "UG", triggerSkills: ["react", "node.js", "mongodb", "express", "javascript", "typescript", "nextjs"], openings: "10+" },
  { company: "BrowserStack", role: "SDE-1", salaryRange: "₹12–22 LPA", tier: "startup", logo: "BS", triggerSkills: ["java", "javascript", "react", "selenium", "qa", "testing", "automation"], openings: "8+" },
  { company: "Freshworks", role: "SDE-1", salaryRange: "₹10–18 LPA", tier: "startup", logo: "FW", triggerSkills: ["ruby", "react", "javascript", "python", "salesforce"], openings: "12+" },
  { company: "Postman", role: "SDE-1", salaryRange: "₹14–24 LPA", tier: "startup", logo: "PM", triggerSkills: ["javascript", "typescript", "react", "node.js", "api", "rest"], openings: "6+" },
  { company: "Hasura", role: "Backend Dev", salaryRange: "₹12–22 LPA", tier: "startup", logo: "HA", triggerSkills: ["graphql", "postgresql", "haskell", "node.js", "typescript", "api"], openings: "5+" },
  // Cloud / DevOps
  { company: "Nutanix", role: "SDE-1", salaryRange: "₹18–28 LPA", tier: "tier2", logo: "NU", triggerSkills: ["kubernetes", "docker", "cloud", "aws", "azure", "devops", "linux"], openings: "10+" },
  { company: "Druva", role: "Cloud Dev", salaryRange: "₹14–22 LPA", tier: "startup", logo: "DR", triggerSkills: ["aws", "go", "golang", "kubernetes", "docker", "cloud", "devops"], openings: "8+" },
  // Cybersec
  { company: "Rubrik", role: "SDE-1", salaryRange: "₹16–26 LPA", tier: "tier2", logo: "RU", triggerSkills: ["cybersecurity", "security", "python", "c++", "networking"], openings: "6+" },
];

function getMatchScore(rec: RoleRec, userSkills: string[]): number {
  if (!userSkills.length) return 0.5;
  const lower = userSkills.map(s => s.toLowerCase());
  let hits = 0;
  for (const trigger of rec.triggerSkills) {
    if (lower.some(us => us.includes(trigger) || trigger.includes(us))) hits++;
  }
  return hits / rec.triggerSkills.length;
}

function getRecommendations(userSkills: string[]): (RoleRec & { matchPct: number })[] {
  const scored = ALL_RECS.map(rec => ({
    ...rec,
    matchPct: Math.round((0.55 + getMatchScore(rec, userSkills) * 0.45) * 100),
  }));

  if (!userSkills.length) {
    // Default: show a balanced mix
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
      <p className="text-[12px] text-ink-muted -mt-1">Based on your skills — click to instantly generate a tailored resume</p>

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

                {/* Salary */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-ink-muted" />
                    <span className="text-[11px] font-semibold text-ink">{rec.salaryRange}</span>
                  </div>
                </div>

                {/* Match bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Match</span>
                    <span className="text-[11px] font-bold text-ink">{rec.matchPct}%</span>
                  </div>
                  <div className="h-1.5 bg-line rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${rec.matchPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-ink-muted">{rec.openings} openings</p>
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

// ─── PDF generators ───────────────────────────────────────────────────────────

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

function downloadClassicPDF(r: ResumeContent, filename: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const PW = 612, PH = 792, ML = 48, MR = 48, MT = 44, MB = 44;
  const CW = PW - ML - MR;
  let y = MT;

  const checkPage = (needed = 20) => {
    if (y + needed > PH - MB) { doc.addPage(); y = MT; }
  };

  const section = (title: string) => {
    checkPage(38);
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 15, 16);
    doc.text(title.toUpperCase(), ML, y);
    y += 4;
    doc.setDrawColor(15, 15, 16);
    doc.setLineWidth(0.75);
    doc.line(ML, y, PW - MR, y);
    y += 11;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
  };

  const bullet = (text: string, indent = 0, color: [number, number, number] = [55, 65, 81]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...color);
    const bx = ML + indent;
    const bw = CW - indent;
    const lines = doc.splitTextToSize(text, bw) as string[];
    for (let i = 0; i < lines.length; i++) {
      checkPage(13);
      doc.text(lines[i], bx, y);
      y += 12;
    }
  };

  // ── Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(r.name.toUpperCase(), PW / 2, y, { align: "center" });
  y += 4;

  // ── Role / title line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 15, 16);
  doc.text(r.degree, PW / 2, y + 10, { align: "center" });
  y += 22;

  // ── Contact line
  const contact = [r.email, r.phone, r.city, r.githubUrl, r.linkedinUrl, r.portfolioUrl]
    .filter(Boolean) as string[];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const contactStr = contact.join("  |  ");
  const contactLines = doc.splitTextToSize(contactStr, CW) as string[];
  for (const cl of contactLines) {
    doc.text(cl, PW / 2, y, { align: "center" });
    y += 11;
  }
  y += 2;

  // ── Header rule
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.75);
  doc.line(ML, y, PW - MR, y);
  y += 4;

  // ── Summary
  if (r.summary) {
    section("Professional Summary");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    const ls = doc.splitTextToSize(r.summary, CW) as string[];
    for (const l of ls) { checkPage(13); doc.text(l, ML, y); y += 12; }
  }

  // ── Education
  section("Education");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const degreeW = doc.getTextWidth(r.degree);
  doc.text(r.degree, ML, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${r.startYear} – ${r.gradYear}`, PW - MR, y, { align: "right" });
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  const eduSub = `${r.college}, ${r.city}${r.cgpa ? `  ·  CGPA ${r.cgpa}` : ""}`;
  doc.text(eduSub, ML, y);
  if (degreeW) { /* suppress unused warning */ }
  y += 4;

  // ── Technical Skills
  if (r.skillSections.length > 0) {
    section("Technical Skills");
    for (const s of r.skillSections) {
      checkPage(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const lbl = `${s.category}: `;
      const lw = doc.getTextWidth(lbl);
      doc.text(lbl, ML, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      const wrapped = doc.splitTextToSize(s.items, CW - lw) as string[];
      for (let wi = 0; wi < wrapped.length; wi++) {
        checkPage(13);
        if (wi === 0) {
          doc.text(wrapped[wi], ML + lw, y);
          y += 12;
        } else {
          doc.text(wrapped[wi], ML + lw, y);
          y += 12;
        }
      }
    }
  }

  // ── Projects
  if (r.projects.length > 0) {
    section("Projects");
    for (const p of r.projects) {
      checkPage(44);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(p.title, ML, y);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 15, 16);
      const techW = doc.getTextWidth(p.tech);
      if (techW < CW * 0.45) {
        doc.text(p.tech, PW - MR, y, { align: "right" });
      }
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(55, 65, 81);
      for (const b of p.bullets) {
        const ls = doc.splitTextToSize(`\u2022  ${b}`, CW - 6) as string[];
        for (let li = 0; li < ls.length; li++) {
          checkPage(13);
          doc.text(ls[li], ML + (li > 0 ? 8 : 0), y);
          y += 12;
        }
      }
      y += 5;
    }
  }

  // ── Achievements & Certifications
  if (r.certifications.length > 0 || r.achievements.length > 0) {
    section("Achievements & Certifications");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    for (const c of r.certifications) {
      bullet(`\u2022  ${c.name} — ${c.issuer}${c.date ? ` (${c.date})` : ""}`);
    }
    for (const a of r.achievements) {
      bullet(`\u2022  ${a}`);
    }
  }

  openPDF(doc, filename);
}

function downloadTechPDF(r: ResumeContent, filename: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const PW = 612, PH = 792, ML = 45, MR = 45, MB = 44;
  const CW = PW - ML - MR;
  let y = 0;

  const checkPage = (needed = 20) => {
    if (y + needed > PH - MB) { doc.addPage(); y = 44; }
  };

  // Section header: explicit rect then content — no more y-11 overlap bug
  const section = (title: string) => {
    checkPage(44);
    y += 16;
    const rectTop = y;
    const rectH = 20;
    doc.setFillColor(15, 23, 42);
    doc.rect(ML, rectTop, CW, rectH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    // Baseline at rectTop + 14 (centered in 20pt rect)
    doc.text(title.toUpperCase(), ML + 8, rectTop + 14);
    y = rectTop + rectH + 10;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
  };

  // ── Full-width dark header bar
  const HEADER_H = 66;
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PW, HEADER_H, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.setTextColor(255, 255, 255);
  doc.text(r.name.toUpperCase(), ML, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const contactParts = [r.email, r.phone, r.city, r.githubUrl, r.linkedinUrl]
    .filter(Boolean) as string[];
  const contactLine = contactParts.join("  ·  ");
  const contactWrapped = doc.splitTextToSize(contactLine, CW) as string[];
  doc.text(contactWrapped[0] ?? "", ML, 44);
  if (contactWrapped[1]) {
    doc.text(contactWrapped[1], ML, 57);
  }

  // ── Accent stripe
  doc.setFillColor(16, 185, 129);
  doc.rect(0, HEADER_H, PW, 3, "F");
  y = HEADER_H + 3 + 16;

  // ── Summary
  if (r.summary) {
    section("About");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    const ls = doc.splitTextToSize(r.summary, CW) as string[];
    for (const l of ls) { checkPage(13); doc.text(l, ML, y); y += 12; }
  }

  // ── Education
  section("Education");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(r.degree, ML, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${r.startYear} – ${r.gradYear}`, PW - MR, y, { align: "right" });
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${r.college}, ${r.city}${r.cgpa ? `  ·  CGPA ${r.cgpa}` : ""}`, ML, y);
  y += 4;

  // ── Technical Skills
  if (r.skillSections.length > 0) {
    section("Technical Skills");
    for (const s of r.skillSections) {
      checkPage(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const lbl = `${s.category}: `;
      const lw = doc.getTextWidth(lbl);
      doc.text(lbl, ML, y);
      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      doc.setTextColor(16, 185, 129);
      const wrapped = doc.splitTextToSize(s.items, CW - lw) as string[];
      for (let wi = 0; wi < wrapped.length; wi++) {
        checkPage(13);
        doc.text(wrapped[wi], ML + lw, y);
        y += 12;
      }
    }
  }

  // ── Projects
  if (r.projects.length > 0) {
    section("Projects");
    for (const p of r.projects) {
      checkPage(44);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(p.title, ML, y);
      doc.setFont("courier", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129);
      const tag = `[ ${p.tech} ]`;
      if (doc.getTextWidth(tag) < CW * 0.5) {
        doc.text(tag, PW - MR, y, { align: "right" });
      }
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(55, 65, 81);
      for (const b of p.bullets) {
        const ls = doc.splitTextToSize(`\u25b8  ${b}`, CW - 6) as string[];
        for (let li = 0; li < ls.length; li++) {
          checkPage(13);
          doc.text(ls[li], ML + (li > 0 ? 10 : 0), y);
          y += 12;
        }
      }
      y += 5;
    }
  }

  // ── Achievements
  if (r.certifications.length > 0 || r.achievements.length > 0) {
    section("Achievements & Certifications");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    for (const c of r.certifications) {
      const ls = doc.splitTextToSize(
        `\u25b8  ${c.name} — ${c.issuer}${c.date ? ` (${c.date})` : ""}`, CW
      ) as string[];
      for (const l of ls) { checkPage(13); doc.text(l, ML, y); y += 12; }
    }
    for (const a of r.achievements) {
      const ls = doc.splitTextToSize(`\u25b8  ${a}`, CW) as string[];
      for (const l of ls) { checkPage(13); doc.text(l, ML, y); y += 12; }
    }
  }

  openPDF(doc, filename);
}

function downloadMinimalPDF(r: ResumeContent, filename: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const PW = 612, PH = 792, ML = 54, MR = 54, MT = 48, MB = 44;
  const CW = PW - ML - MR;
  let y = MT;

  const checkPage = (needed = 20) => {
    if (y + needed > PH - MB) { doc.addPage(); y = MT; }
  };

  const section = (title: string) => {
    checkPage(38);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(title.toUpperCase(), ML, y);
    y += 5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(ML, y, PW - MR, y);
    y += 11;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
  };

  // ── Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.text(r.name, ML, y);
  y += 4;

  // ── Degree under name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(r.degree, ML, y + 11);
  y += 22;

  // ── Contact
  const contact = [r.email, r.phone, r.city, r.githubUrl, r.linkedinUrl, r.portfolioUrl]
    .filter(Boolean) as string[];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const contactStr = contact.join("  ·  ");
  const contactLines = doc.splitTextToSize(contactStr, CW) as string[];
  for (const cl of contactLines) { doc.text(cl, ML, y); y += 11; }
  y += 3;

  // ── Bold rule
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.25);
  doc.line(ML, y, PW - MR, y);
  y += 6;

  // ── Summary
  if (r.summary) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const ls = doc.splitTextToSize(r.summary, CW) as string[];
    for (const l of ls) { checkPage(13); doc.text(l, ML, y); y += 12; }
    y += 2;
  }

  // ── Education
  section("Education");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(r.degree, ML, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${r.startYear} – ${r.gradYear}`, PW - MR, y, { align: "right" });
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${r.college}, ${r.city}${r.cgpa ? `  ·  CGPA ${r.cgpa}` : ""}`, ML, y);
  y += 4;

  // ── Skills
  if (r.skillSections.length > 0) {
    section("Skills");
    for (const s of r.skillSections) {
      checkPage(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const lbl = `${s.category}:  `;
      const lw = doc.getTextWidth(lbl);
      doc.text(lbl, ML, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const wrapped = doc.splitTextToSize(s.items, CW - lw) as string[];
      for (let wi = 0; wi < wrapped.length; wi++) {
        checkPage(13);
        doc.text(wrapped[wi], ML + lw, y);
        y += 12;
      }
    }
  }

  // ── Projects
  if (r.projects.length > 0) {
    section("Projects");
    for (const p of r.projects) {
      checkPage(44);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(p.title, ML, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      if (doc.getTextWidth(p.tech) < CW * 0.45) {
        doc.text(p.tech, PW - MR, y, { align: "right" });
      }
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      for (const b of p.bullets) {
        const ls = doc.splitTextToSize(`\u2013  ${b}`, CW - 6) as string[];
        for (let li = 0; li < ls.length; li++) {
          checkPage(13);
          doc.text(ls[li], ML + (li > 0 ? 10 : 0), y);
          y += 12;
        }
      }
      y += 5;
    }
  }

  // ── Achievements
  if (r.certifications.length > 0 || r.achievements.length > 0) {
    section("Achievements");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    for (const c of r.certifications) {
      const ls = doc.splitTextToSize(
        `\u2013  ${c.name} — ${c.issuer}${c.date ? ` (${c.date})` : ""}`, CW
      ) as string[];
      for (const l of ls) { checkPage(13); doc.text(l, ML, y); y += 12; }
    }
    for (const a of r.achievements) {
      const ls = doc.splitTextToSize(`\u2013  ${a}`, CW) as string[];
      for (const l of ls) { checkPage(13); doc.text(l, ML, y); y += 12; }
    }
  }

  openPDF(doc, filename);
}

function downloadResumePDF(resume: SavedResume) {
  const filename = `${resume.content.name.replace(/\s+/g, "_")}_${resume.name.replace(/\s+/g, "_")}.pdf`;
  if (resume.templateId === "tech") {
    downloadTechPDF(resume.content, filename);
  } else if (resume.templateId === "minimal") {
    downloadMinimalPDF(resume.content, filename);
  } else {
    downloadClassicPDF(resume.content, filename);
  }
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

  const [summary, setSummary] = useState(resume.content.summary ?? "");
  const [skillSections, setSkillSections] = useState(
    (resume.content.skillSections ?? []).map(s => ({ ...s }))
  );
  const [projects, setProjects] = useState(
    (resume.content.projects ?? []).map(p => ({ ...p, bullets: [...(p.bullets ?? [])] }))
  );
  const [achievements, setAchievements] = useState([...(resume.content.achievements ?? [])]);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-ink/40 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-lg mx-auto bg-paper rounded-t-3xl flex flex-col"
        style={{ maxHeight: "92vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-line" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-line shrink-0">
          <h2 className="text-[17px] font-extrabold text-ink flex items-center gap-2">
            <Pencil className="w-4 h-4 text-ink" />
            Edit Resume
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-line flex items-center justify-center">
            <X className="w-4 h-4 text-ink-muted" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">

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
  const tmpl = templateBadge(resume.templateId);
  const date = new Date(resume.createdAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-paper rounded-2xl shadow-soft p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink text-[15px] truncate">{resume.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tmpl.badge}`}>
              {tmpl.label}
            </span>
            {resume.companyName && (
              <span className="text-[11px] text-ink-muted font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3" />{resume.companyName}
              </span>
            )}
            <span className="text-[11px] text-ink-muted">{date}</span>
          </div>
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
}: {
  onClose: () => void;
  onGenerated: (r: SavedResume) => void;
  studentId: number;
  initialCompany?: string;
  initialRole?: string;
}) {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState("classic");
  const [jdText, setJdText] = useState("");
  const [companyName, setCompanyName] = useState(initialCompany);
  const [resumeName, setResumeName] = useState(
    initialCompany && initialRole ? `${initialCompany} — ${initialRole}` : ""
  );
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await apiFetch(`/api/students/${studentId}/resumes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, jdText, companyName, resumeName }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to generate");
      }
      const saved = await r.json() as SavedResume;
      toast({ title: "Resume generated!", description: saved.name });
      onGenerated(saved);
      onClose();
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-ink/40 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-lg mx-auto bg-paper rounded-t-3xl p-5 pb-8 space-y-5 max-h-[92dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center -mt-2 mb-1">
          <div className="w-10 h-1 rounded-full bg-line" />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold text-ink flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" />
            Generate New Resume
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-line flex items-center justify-center">
            <X className="w-4 h-4 text-ink-muted" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Template</label>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map(t => (
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
                <p className="text-[10px] text-ink-muted mt-0.5 leading-tight">{t.desc}</p>
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
  const [generateFor, setGenerateFor] = useState<{ company: string; role: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingResume, setEditingResume] = useState<SavedResume | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) { setLocation("/"); return; }
    setStudentId(parseInt(id, 10));
  }, [setLocation]);

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
      <div className="p-4 pb-28 max-w-md mx-auto space-y-4 min-h-screen bg-canvas">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 pb-28 max-w-md mx-auto space-y-5 min-h-screen bg-canvas">
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
            <AnimatePresence mode="popLayout">
              {resumes.map(resume => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  onDelete={() => {
                    if (deletingId !== resume.id) handleDelete(resume.id);
                  }}
                  onDownload={() => downloadResumePDF(resume)}
                  onEdit={() => setEditingResume(resume)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="bg-paper rounded-2xl shadow-soft p-4">
          <p className="text-[14px] font-bold text-ink mb-1">Pro tip</p>
          <p className="text-[12px] text-ink-muted leading-relaxed">
            Complete your Profile with real projects and certifications — the AI will use them to generate a much stronger, targeted resume for each company.
          </p>
          <button
            onClick={() => setLocation("/profile")}
            className="mt-3 flex items-center gap-1 text-[12px] font-bold text-brand"
          >
            Update my profile <ChevronRight className="w-3.5 h-3.5" />
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
