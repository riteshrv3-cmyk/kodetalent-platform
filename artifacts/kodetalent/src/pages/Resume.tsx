import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, FileText, Plus, Trash2, Sparkles,
  Loader2, Building2, AlignLeft, ChevronRight, X, Pencil,
  Check, PlusCircle, MinusCircle
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
    doc.setTextColor(79, 70, 229);
    doc.text(title.toUpperCase(), ML, y);
    y += 4;
    doc.setDrawColor(79, 70, 229);
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
  doc.setTextColor(79, 70, 229);
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
      doc.setTextColor(79, 70, 229);
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

  doc.save(filename);
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

  doc.save(filename);
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
      const r = await fetch(`${BASE}/api/students/${studentId}/resumes/${resume.id}`, {
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
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-lg mx-auto bg-white rounded-t-3xl flex flex-col"
        style={{ maxHeight: "92vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#f1f5f9] shrink-0">
          <h2 className="font-black text-[#0f172a] text-lg flex items-center gap-2">
            <Pencil className="w-5 h-5 text-[#4f46e5]" />
            Edit Resume
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center">
            <X className="w-4 h-4 text-[#64748b]" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">

          {/* Summary */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[#64748b] uppercase tracking-wider">Professional Summary</label>
            <Textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={4}
              className="rounded-xl border-[#e2e8f0] font-medium text-sm resize-none"
            />
          </div>

          {/* Skills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#64748b] uppercase tracking-wider">Skill Sections</label>
              <button
                onClick={addSkillSection}
                className="flex items-center gap-1 text-[10px] font-bold text-[#4f46e5]"
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
                    className="rounded-lg border-[#e2e8f0] text-sm h-8"
                  />
                  <Input
                    value={s.items}
                    onChange={e => updateSkillItems(i, e.target.value)}
                    placeholder="Items (comma-separated)"
                    className="rounded-lg border-[#e2e8f0] text-sm h-8"
                  />
                </div>
                <button
                  onClick={() => removeSkillSection(i)}
                  className="mt-1 text-[#ef4444] shrink-0"
                >
                  <MinusCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Projects */}
          <div className="space-y-4">
            <label className="text-xs font-extrabold text-[#64748b] uppercase tracking-wider">Projects</label>
            {projects.map((p, pi) => (
              <div key={pi} className="bg-[#f8fafc] rounded-xl p-3 space-y-2 border border-[#e2e8f0]">
                <div className="flex gap-2">
                  <Input
                    value={p.title}
                    onChange={e => updateProjectTitle(pi, e.target.value)}
                    placeholder="Project title"
                    className="rounded-lg border-[#e2e8f0] text-sm h-8 flex-1"
                  />
                  <Input
                    value={p.tech}
                    onChange={e => updateProjectTech(pi, e.target.value)}
                    placeholder="Tech stack"
                    className="rounded-lg border-[#e2e8f0] text-sm h-8 flex-1"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Bullets</p>
                  {p.bullets.map((b, bi) => (
                    <div key={bi} className="flex gap-1.5 items-center">
                      <Textarea
                        value={b}
                        onChange={e => updateProjectBullet(pi, bi, e.target.value)}
                        rows={2}
                        className="flex-1 rounded-lg border-[#e2e8f0] text-xs resize-none"
                      />
                      <button onClick={() => removeProjectBullet(pi, bi)} className="text-[#ef4444] shrink-0">
                        <MinusCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addProjectBullet(pi)}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#4f46e5] mt-1"
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
              <label className="text-xs font-extrabold text-[#64748b] uppercase tracking-wider">Achievements</label>
              <button
                onClick={addAchievement}
                className="flex items-center gap-1 text-[10px] font-bold text-[#4f46e5]"
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
                  className="flex-1 rounded-lg border-[#e2e8f0] text-sm h-8"
                />
                <button onClick={() => removeAchievement(i)} className="text-[#ef4444] shrink-0">
                  <MinusCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-8 pt-3 border-t border-[#f1f5f9] shrink-0">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 rounded-2xl text-white font-black text-base shadow-[0_4px_16px_rgba(79,70,229,0.3)]"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
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

      <div className="flex gap-2">
        <Button
          onClick={onEdit}
          variant="outline"
          className="flex-1 h-9 rounded-xl font-bold text-xs border-[#e2e8f0] text-[#4f46e5]"
        >
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Edit
        </Button>
        <Button
          onClick={onDownload}
          className="flex-1 h-9 rounded-xl text-white font-bold text-xs"
          style={{ background: `linear-gradient(135deg, ${tmpl.color}, ${tmpl.color}cc)` }}
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
  const [editingResume, setEditingResume] = useState<SavedResume | null>(null);

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

  const handleResumeUpdated = (updated: SavedResume) => {
    setResumes(prev => prev.map(r => r.id === updated.id ? updated : r));
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
                  onEdit={() => setEditingResume(resume)}
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
