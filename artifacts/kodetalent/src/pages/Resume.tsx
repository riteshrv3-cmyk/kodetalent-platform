import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, FileText, Plus, Trash2, Sparkles,
  Loader2, Building2, AlignLeft, ChevronRight, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
    color: "#4f46e5",
    badge: "bg-[#e0e7ff] text-[#4f46e5]",
  },
  {
    id: "tech",
    label: "Tech-Focused",
    desc: "Highlights your stack & GitHub",
    color: "#10b981",
    badge: "bg-[#d1fae5] text-[#059669]",
  },
  {
    id: "minimal",
    label: "Minimal",
    desc: "Ultra-clean typography",
    color: "#64748b",
    badge: "bg-[#f1f5f9] text-[#475569]",
  },
];

function templateBadge(templateId: string) {
  return TEMPLATES.find(t => t.id === templateId) ?? TEMPLATES[0];
}

// ─── PDF generators ───────────────────────────────────────────────────────────

function downloadClassicPDF(r: ResumeContent, filename: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const PW = 612, M = 45, CW = PW - 2 * M;
  let y = M;

  const line = (col = "#c7d2fe") => {
    doc.setDrawColor(col);
    doc.setLineWidth(0.5);
    doc.line(M, y, PW - M, y);
    y += 8;
  };

  const section = (title: string) => {
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(79, 70, 229);
    doc.text(title.toUpperCase(), M, y);
    y += 3;
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(1);
    doc.line(M, y, PW - M, y);
    y += 10;
    doc.setTextColor(15, 23, 42);
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(r.name.toUpperCase(), PW / 2, y, { align: "center" });
  y += 14;

  const contact = [r.email, r.phone, r.city, r.githubUrl, r.linkedinUrl].filter(Boolean) as string[];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(contact.join("  |  "), PW / 2, y, { align: "center" });
  y += 6;
  line();

  if (r.summary) {
    section("Professional Summary");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(r.summary, CW) as string[];
    for (const l of lines) { doc.text(l, M, y); y += 11; }
  }

  section("Education");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(r.degree, M, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${r.startYear}–${r.gradYear}`, PW - M, y, { align: "right" });
  y += 12;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${r.college}, ${r.city}${r.cgpa ? `  |  CGPA: ${r.cgpa}` : ""}`, M, y);
  y += 12;

  if (r.skillSections.length > 0) {
    section("Technical Skills");
    for (const s of r.skillSections) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const lbl = `${s.category}: `;
      doc.text(lbl, M, y);
      const lw = doc.getTextWidth(lbl);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      const wrapped = doc.splitTextToSize(s.items, CW - lw) as string[];
      doc.text(wrapped[0] ?? "", M + lw, y);
      y += 12;
    }
  }

  if (r.projects.length > 0) {
    section("Projects");
    for (const p of r.projects) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(p.title, M, y);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229);
      doc.text(p.tech, PW - M, y, { align: "right" });
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      for (const b of p.bullets) {
        const ls = doc.splitTextToSize(`• ${b}`, CW) as string[];
        for (const l of ls) { doc.text(l, M, y); y += 10; }
      }
      y += 4;
    }
  }

  if (r.certifications.length > 0 || r.achievements.length > 0) {
    section("Achievements & Certifications");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    for (const c of r.certifications) {
      doc.text(`• ${c.name} — ${c.issuer}${c.date ? ` (${c.date})` : ""}`, M, y);
      y += 11;
    }
    for (const a of r.achievements) {
      const ls = doc.splitTextToSize(`• ${a}`, CW) as string[];
      for (const l of ls) { doc.text(l, M, y); y += 11; }
    }
  }

  doc.save(filename);
}

function downloadTechPDF(r: ResumeContent, filename: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const PW = 612, M = 45, CW = PW - 2 * M;
  let y = M;

  const section = (title: string) => {
    y += 10;
    doc.setFillColor(15, 23, 42);
    doc.rect(M, y - 11, CW, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), M + 6, y);
    y += 10;
    doc.setTextColor(15, 23, 42);
  };

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PW, 56, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(r.name.toUpperCase(), M, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const contact = [r.email, r.phone, r.githubUrl].filter(Boolean) as string[];
  doc.text(contact.join("  |  "), M, y + 28);
  y += 60;

  if (r.summary) {
    section("About");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    const ls = doc.splitTextToSize(r.summary, CW) as string[];
    for (const l of ls) { doc.text(l, M, y); y += 11; }
  }

  section("Education");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(r.degree, M, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${r.startYear}–${r.gradYear}`, PW - M, y, { align: "right" });
  y += 12;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${r.college}, ${r.city}${r.cgpa ? `  |  CGPA: ${r.cgpa}` : ""}`, M, y);
  y += 12;

  if (r.skillSections.length > 0) {
    section("Technical Skills");
    for (const s of r.skillSections) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const lbl = `${s.category}: `;
      doc.text(lbl, M, y);
      const lw = doc.getTextWidth(lbl);
      doc.setFont("courier", "normal");
      doc.setTextColor(16, 185, 129);
      const wrapped = doc.splitTextToSize(s.items, CW - lw) as string[];
      doc.text(wrapped[0] ?? "", M + lw, y);
      y += 12;
    }
  }

  if (r.projects.length > 0) {
    section("Projects");
    for (const p of r.projects) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(p.title, M, y);
      doc.setFont("courier", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129);
      doc.text(`[${p.tech}]`, PW - M, y, { align: "right" });
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      for (const b of p.bullets) {
        const ls = doc.splitTextToSize(`▸ ${b}`, CW) as string[];
        for (const l of ls) { doc.text(l, M, y); y += 10; }
      }
      y += 4;
    }
  }

  if (r.certifications.length > 0 || r.achievements.length > 0) {
    section("Achievements");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    for (const c of r.certifications) {
      doc.text(`▸ ${c.name} — ${c.issuer}${c.date ? ` (${c.date})` : ""}`, M, y);
      y += 11;
    }
    for (const a of r.achievements) {
      const ls = doc.splitTextToSize(`▸ ${a}`, CW) as string[];
      for (const l of ls) { doc.text(l, M, y); y += 11; }
    }
  }

  doc.save(filename);
}

function downloadMinimalPDF(r: ResumeContent, filename: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const PW = 612, M = 55, CW = PW - 2 * M;
  let y = M;

  const section = (title: string) => {
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(title.toUpperCase(), M, y);
    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(M, y, PW - M, y);
    y += 10;
    doc.setTextColor(15, 23, 42);
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(r.name, M, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const contact = [r.email, r.phone, r.city, r.githubUrl, r.linkedinUrl].filter(Boolean) as string[];
  doc.text(contact.join(" · "), M, y);
  y += 6;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.5);
  doc.line(M, y, PW - M, y);
  y += 10;

  if (r.summary) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const ls = doc.splitTextToSize(r.summary, CW) as string[];
    for (const l of ls) { doc.text(l, M, y); y += 12; }
  }

  section("Education");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(r.degree, M, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${r.startYear}–${r.gradYear}`, PW - M, y, { align: "right" });
  y += 12;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${r.college}, ${r.city}${r.cgpa ? `  ·  CGPA: ${r.cgpa}` : ""}`, M, y);
  y += 12;

  if (r.skillSections.length > 0) {
    section("Skills");
    for (const s of r.skillSections) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const lbl = `${s.category}  `;
      doc.text(lbl, M, y);
      const lw = doc.getTextWidth(lbl);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const wrapped = doc.splitTextToSize(s.items, CW - lw) as string[];
      doc.text(wrapped[0] ?? "", M + lw, y);
      y += 12;
    }
  }

  if (r.projects.length > 0) {
    section("Projects");
    for (const p of r.projects) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(p.title, M, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(p.tech, PW - M, y, { align: "right" });
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      for (const b of p.bullets) {
        const ls = doc.splitTextToSize(`– ${b}`, CW) as string[];
        for (const l of ls) { doc.text(l, M, y); y += 10; }
      }
      y += 4;
    }
  }

  if (r.certifications.length > 0 || r.achievements.length > 0) {
    section("Achievements");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    for (const c of r.certifications) {
      doc.text(`– ${c.name} — ${c.issuer}${c.date ? ` (${c.date})` : ""}`, M, y);
      y += 11;
    }
    for (const a of r.achievements) {
      const ls = doc.splitTextToSize(`– ${a}`, CW) as string[];
      for (const l of ls) { doc.text(l, M, y); y += 11; }
    }
  }

  doc.save(filename);
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

// ─── Resume Card ──────────────────────────────────────────────────────────────

function ResumeCard({
  resume,
  onDelete,
  onDownload,
}: {
  resume: SavedResume;
  onDelete: () => void;
  onDownload: () => void;
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
      className="bg-white rounded-2xl p-4 shadow-sm border border-[#f1f5f9]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-black text-[#0f172a] text-sm truncate">{resume.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tmpl.badge}`}>
              {tmpl.label}
            </span>
            {resume.companyName && (
              <span className="text-[10px] text-[#64748b] font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3" />{resume.companyName}
              </span>
            )}
            <span className="text-[10px] text-[#94a3b8]">{date}</span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-full bg-[#fee2e2] flex items-center justify-center shrink-0 active:scale-95 transition-transform"
        >
          <Trash2 className="w-3.5 h-3.5 text-[#ef4444]" />
        </button>
      </div>

      {resume.content.summary && (
        <p className="text-xs text-[#64748b] line-clamp-2 mb-3 leading-relaxed">
          {resume.content.summary}
        </p>
      )}

      <Button
        onClick={onDownload}
        className="w-full h-9 rounded-xl text-white font-bold text-xs"
        style={{ background: `linear-gradient(135deg, ${tmpl.color}, ${tmpl.color}cc)` }}
      >
        <Download className="w-3.5 h-3.5 mr-1.5" />
        Download PDF
      </Button>
    </motion.div>
  );
}

// ─── Generate Sheet ───────────────────────────────────────────────────────────

function GenerateSheet({
  onClose,
  onGenerated,
  studentId,
}: {
  onClose: () => void;
  onGenerated: (r: SavedResume) => void;
  studentId: number;
}) {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState("classic");
  const [jdText, setJdText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await fetch(`${BASE}/api/students/${studentId}/resumes`, {
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
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-5 pb-8 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-black text-[#0f172a] text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#4f46e5]" />
            Generate New Resume
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center">
            <X className="w-4 h-4 text-[#64748b]" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-extrabold text-[#64748b] uppercase tracking-wider">Template</label>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`rounded-xl p-3 text-left border-2 transition-all ${
                  templateId === t.id
                    ? "border-[#4f46e5] bg-[#e0e7ff]"
                    : "border-[#e2e8f0] bg-white"
                }`}
              >
                <p className="font-black text-[#0f172a] text-xs">{t.label}</p>
                <p className="text-[9px] text-[#64748b] mt-0.5 leading-tight">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-extrabold text-[#64748b] uppercase tracking-wider flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Company Name
            <span className="text-[#94a3b8] normal-case font-medium ml-1">(optional)</span>
          </label>
          <Input
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="e.g. Google, Flipkart, Razorpay"
            className="rounded-xl border-[#e2e8f0] font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-extrabold text-[#64748b] uppercase tracking-wider flex items-center gap-1">
            <AlignLeft className="w-3 h-3" /> Job Description
            <span className="text-[#94a3b8] normal-case font-medium ml-1">(optional — paste JD for tailored resume)</span>
          </label>
          <Textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder="Paste job description here for an ATS-optimized, targeted resume..."
            rows={4}
            className="rounded-xl border-[#e2e8f0] font-medium text-sm resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-extrabold text-[#64748b] uppercase tracking-wider">
            Resume Name
            <span className="text-[#94a3b8] normal-case font-medium ml-1">(optional)</span>
          </label>
          <Input
            value={resumeName}
            onChange={e => setResumeName(e.target.value)}
            placeholder="e.g. Google SWE Resume, FAANG Attempt 1"
            className="rounded-xl border-[#e2e8f0] font-medium"
          />
        </div>

        <Button
          onClick={generate}
          disabled={generating}
          className="w-full h-13 rounded-2xl text-white font-black text-base shadow-[0_4px_16px_rgba(79,70,229,0.3)]"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
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
          <p className="text-center text-xs text-[#64748b] -mt-2">
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
  const [showGenerate, setShowGenerate] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) { setLocation("/"); return; }
    setStudentId(parseInt(id, 10));
  }, [setLocation]);

  const fetchResumes = useCallback(async (id: number) => {
    try {
      const r = await fetch(`${BASE}/api/students/${id}/resumes`);
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

  const handleDelete = async (resumeId: number) => {
    if (!studentId) return;
    setDeletingId(resumeId);
    try {
      const r = await fetch(`${BASE}/api/students/${studentId}/resumes/${resumeId}`, {
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
      <div className="p-4 pb-28 max-w-md mx-auto space-y-4 min-h-screen bg-[#f8fafc]">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 pb-28 max-w-md mx-auto space-y-5 min-h-screen bg-[#f8fafc]">
        <Button
          variant="ghost"
          onClick={() => setLocation("/profile")}
          className="-ml-2 text-[#64748b] font-bold"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#0f172a] flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#4f46e5]" /> My Resumes
            </h1>
            <p className="text-[#64748b] text-xs font-medium mt-0.5">
              AI-generated from your real profile · ATS-friendly
            </p>
          </div>
          <motion.div whileTap={{ scale: 0.96 }}>
            <Button
              onClick={() => setShowGenerate(true)}
              className="rounded-full text-white font-bold shadow-[0_4px_16px_rgba(79,70,229,0.3)] px-4 h-10"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New
            </Button>
          </motion.div>
        </div>

        {resumes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-[#e0e7ff] text-center space-y-4"
          >
            <div className="w-16 h-16 bg-[#e0e7ff] rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-[#4f46e5]" />
            </div>
            <div>
              <p className="font-black text-[#0f172a] text-base">No resumes yet</p>
              <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                Generate your first ATS-friendly resume. Paste a JD to tailor it for a specific role.
              </p>
            </div>
            <Button
              onClick={() => setShowGenerate(true)}
              className="rounded-full text-white font-bold px-6 h-11"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate First Resume
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {resumes.map(resume => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  onDelete={() => {
                    if (deletingId !== resume.id) handleDelete(resume.id);
                  }}
                  onDownload={() => downloadResumePDF(resume)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        <Card className="border-0 shadow-sm rounded-2xl bg-[#fef3c7]">
          <CardContent className="p-4">
            <p className="text-sm font-black text-[#92400e] mb-1">💡 Pro tip</p>
            <p className="text-xs text-[#78350f] leading-relaxed">
              Add your real projects and certifications in your Profile first — the AI will use them to create a stronger, more accurate resume. Paste the JD of the role you're applying for to get a tailored version.
            </p>
            <button
              onClick={() => setLocation("/profile")}
              className="mt-3 flex items-center gap-1 text-xs font-black text-[#d97706]"
            >
              Update my profile <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {showGenerate && studentId && (
          <GenerateSheet
            studentId={studentId}
            onClose={() => setShowGenerate(false)}
            onGenerated={handleGenerated}
          />
        )}
      </AnimatePresence>
    </>
  );
}
