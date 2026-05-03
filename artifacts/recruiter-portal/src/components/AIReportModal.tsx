import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, CheckCircle2, AlertTriangle, Clock, IndianRupee, MessageSquareWarning, Shield, ShieldAlert, ShieldX, Copy, Check } from "lucide-react";

type Report = {
  verdict: "strong-fit" | "decent-fit" | "stretch";
  fitScore: number;
  headline: string;
  whyFits: string[];
  concerns: string[];
  verifiedSkills: { skill: string; score: number; evidence: string }[];
  timeToProductivity: string;
  salaryEstimate: string;
  interviewQuestions: string[];
  ghostingRisk: "low" | "medium" | "high";
  ghostingNote: string;
};

interface Props {
  studentId: number;
  studentName: string;
  onClose: () => void;
}

export default function AIReportModal({ studentId, studentName, onClose }: Props) {
  const [step, setStep] = useState<"input" | "loading" | "report" | "error">("input");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobTags, setJobTags] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!jobTitle.trim()) return;
    setStep("loading");
    setError("");
    try {
      const r = await fetch("/api/ai/candidate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          jobTitle: jobTitle.trim(),
          company: company.trim() || undefined,
          jobTags: jobTags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || "Failed to generate");
      const data = await r.json();
      setReport(data);
      setStep("report");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setStep("error");
    }
  }

  function copyReport() {
    if (!report) return;
    const txt = [
      `AI CANDIDATE REPORT — ${studentName}`,
      `Role: ${jobTitle}${company ? ` at ${company}` : ""}`,
      `Verdict: ${report.verdict.toUpperCase()} · Fit Score: ${report.fitScore}/100`,
      ``,
      report.headline,
      ``,
      `WHY FITS:`,
      ...report.whyFits.map(w => `  ✓ ${w}`),
      ``,
      `CONCERNS:`,
      ...report.concerns.map(c => `  ⚠ ${c}`),
      ``,
      `VERIFIED SKILLS:`,
      ...report.verifiedSkills.map(s => `  • ${s.skill} (${s.score}/100): ${s.evidence}`),
      ``,
      `Time to productivity: ${report.timeToProductivity}`,
      `Salary estimate: ${report.salaryEstimate}`,
      `Ghosting risk: ${report.ghostingRisk.toUpperCase()} — ${report.ghostingNote}`,
      ``,
      `INTERVIEW QUESTIONS TO VALIDATE:`,
      ...report.interviewQuestions.map((q, i) => `  ${i + 1}. ${q}`),
    ].join("\n");
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const verdictMeta = report
    ? report.verdict === "strong-fit"
      ? { color: "#10b981", bg: "#d1fae5", text: "STRONG FIT", emoji: "🎯" }
      : report.verdict === "decent-fit"
      ? { color: "#f97316", bg: "#ffedd5", text: "DECENT FIT", emoji: "👀" }
      : { color: "#ef4444", bg: "#fee2e2", text: "STRETCH HIRE", emoji: "⚠️" }
    : null;

  const ghostMeta = report
    ? report.ghostingRisk === "low"
      ? { Icon: Shield, color: "#10b981", text: "Low risk" }
      : report.ghostingRisk === "medium"
      ? { Icon: ShieldAlert, color: "#f97316", text: "Medium risk" }
      : { Icon: ShieldX, color: "#ef4444", text: "High risk" }
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden"
        data-testid="ai-report-modal"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#ec4899] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/80">AI Candidate Report</p>
                <p className="text-base font-black">{studentName}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 transition flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
              <div>
                <p className="text-sm font-bold text-[#0f172a] mb-1">Generate a 1-page hiring report</p>
                <p className="text-xs text-[#64748b]">Tell us the role you're hiring for. Our AI will give you a candid fit analysis, salary estimate, time-to-productivity, ghosting risk, and 3 interview questions to validate this candidate.</p>
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-[#64748b] uppercase tracking-wide mb-1.5">Role you're hiring for *</label>
                <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Frontend Engineer" autoFocus
                  className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#64748b] uppercase tracking-wide mb-1.5">Company</label>
                  <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Razorpay"
                    className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#64748b] uppercase tracking-wide mb-1.5">Required skills</label>
                  <input value={jobTags} onChange={e => setJobTags(e.target.value)} placeholder="React, TypeScript, …"
                    className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30" />
                </div>
              </div>
              <button
                onClick={generate}
                disabled={!jobTitle.trim()}
                className="w-full h-12 rounded-xl font-extrabold text-white text-sm shadow-lg disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#4f46e5,#ec4899)" }}
                data-testid="button-generate-report"
              >
                <Sparkles className="w-4 h-4 inline mr-1.5" /> Generate AI Report
              </button>
              <p className="text-[11px] text-[#94a3b8] text-center">Powered by Claude · Cached for 7 days · Avg 5-8 sec</p>
            </motion.div>
          )}

          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-6 py-16 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#ec4899] flex items-center justify-center mb-4">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              </div>
              <p className="text-sm font-extrabold text-[#0f172a] mb-1">Analysing {studentName}…</p>
              <p className="text-xs text-[#64748b] max-w-xs">Cross-referencing skills, projects, GitHub activity, and commitment score against your role…</p>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-6 py-12 flex flex-col items-center text-center">
              <AlertTriangle className="w-10 h-10 text-[#ef4444] mb-3" />
              <p className="text-sm font-bold text-[#0f172a] mb-1">Could not generate report</p>
              <p className="text-xs text-[#64748b] mb-4">{error}</p>
              <button onClick={() => setStep("input")} className="px-5 py-2 bg-[#0f172a] text-white rounded-xl text-sm font-bold">
                Try again
              </button>
            </motion.div>
          )}

          {step === "report" && report && verdictMeta && ghostMeta && (
            <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Verdict + Fit Score */}
              <div className="flex items-center gap-4 pb-4 border-b border-[#f1f5f9]">
                <div className="relative w-[88px] h-[88px] flex-shrink-0">
                  <svg width="88" height="88" className="-rotate-90">
                    <circle cx="44" cy="44" r="36" fill="none" stroke={verdictMeta.bg} strokeWidth="8" />
                    <motion.circle cx="44" cy="44" r="36" fill="none" stroke={verdictMeta.color} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 36}
                      initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 36 - (report.fitScore / 100) * 2 * Math.PI * 36 }}
                      transition={{ duration: 1.1, ease: "easeOut" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black" style={{ color: verdictMeta.color }}>{report.fitScore}</span>
                    <span className="text-[9px] font-extrabold text-[#64748b] uppercase">Fit</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: verdictMeta.bg, color: verdictMeta.color }}>
                    {verdictMeta.emoji} {verdictMeta.text}
                  </span>
                  <p className="text-sm font-bold text-[#0f172a] mt-2 leading-snug">{report.headline}</p>
                </div>
              </div>

              {/* Quick metrics */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-[#f0fdf4] rounded-xl p-3 border border-[#bbf7d0]">
                  <Clock className="w-3.5 h-3.5 text-[#10b981] mb-1" />
                  <p className="text-[9px] font-extrabold text-[#64748b] uppercase">Productive in</p>
                  <p className="text-sm font-black text-[#0f172a]">{report.timeToProductivity}</p>
                </div>
                <div className="bg-[#fefce8] rounded-xl p-3 border border-[#fef08a]">
                  <IndianRupee className="w-3.5 h-3.5 text-[#ca8a04] mb-1" />
                  <p className="text-[9px] font-extrabold text-[#64748b] uppercase">Salary expectation</p>
                  <p className="text-sm font-black text-[#0f172a]">{report.salaryEstimate}</p>
                </div>
                <div className="rounded-xl p-3 border" style={{ background: ghostMeta.color + "15", borderColor: ghostMeta.color + "55" }}>
                  <ghostMeta.Icon className="w-3.5 h-3.5 mb-1" style={{ color: ghostMeta.color }} />
                  <p className="text-[9px] font-extrabold text-[#64748b] uppercase">Ghosting risk</p>
                  <p className="text-sm font-black" style={{ color: ghostMeta.color }}>{ghostMeta.text}</p>
                </div>
              </div>

              {/* Why fits */}
              {report.whyFits.length > 0 && (
                <div>
                  <p className="text-[11px] font-extrabold text-[#10b981] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Why this candidate fits
                  </p>
                  <ul className="space-y-1.5">
                    {report.whyFits.map((w, i) => (
                      <li key={i} className="text-sm text-[#0f172a] leading-snug pl-5 relative">
                        <span className="absolute left-0 top-0.5 text-[#10b981] font-black">✓</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {report.concerns.length > 0 && (
                <div>
                  <p className="text-[11px] font-extrabold text-[#ef4444] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Honest concerns
                  </p>
                  <ul className="space-y-1.5">
                    {report.concerns.map((c, i) => (
                      <li key={i} className="text-sm text-[#0f172a] leading-snug pl-5 relative">
                        <span className="absolute left-0 top-0.5 text-[#ef4444] font-black">⚠</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Verified skills */}
              {report.verifiedSkills.length > 0 && (
                <div>
                  <p className="text-[11px] font-extrabold text-[#6366f1] uppercase tracking-wider mb-2">Verified skills</p>
                  <div className="space-y-2">
                    {report.verifiedSkills.map((s, i) => (
                      <div key={i} className="bg-[#f8fafc] rounded-xl p-3 border border-[#e2e8f0]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-extrabold text-[#0f172a]">{s.skill}</span>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: s.score >= 70 ? "#10b981" : s.score >= 40 ? "#f97316" : "#ef4444" }}>
                            {s.score}/100
                          </span>
                        </div>
                        <p className="text-xs text-[#64748b] leading-snug">{s.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ghosting note */}
              {report.ghostingNote && (
                <div className="bg-[#fef9c3] border border-[#fde047] rounded-xl p-3 flex gap-2">
                  <MessageSquareWarning className="w-4 h-4 text-[#a16207] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#713f12] leading-snug font-medium">{report.ghostingNote}</p>
                </div>
              )}

              {/* Interview questions */}
              {report.interviewQuestions.length > 0 && (
                <div>
                  <p className="text-[11px] font-extrabold text-[#0f172a] uppercase tracking-wider mb-2">Sharp questions to validate</p>
                  <ol className="space-y-2">
                    {report.interviewQuestions.map((q, i) => (
                      <li key={i} className="text-sm text-[#0f172a] leading-snug bg-gradient-to-br from-[#faf5ff] to-[#fdf2f8] rounded-xl p-3 border border-[#f3e8ff]">
                        <span className="font-black text-[#7c3aed] mr-1.5">Q{i + 1}.</span>{q}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex gap-2 pt-2 sticky bottom-0 bg-white">
                <button onClick={copyReport} className="flex-1 h-11 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] font-bold text-sm flex items-center justify-center gap-1.5 transition">
                  {copied ? <><Check className="w-4 h-4 text-[#10b981]" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy report</>}
                </button>
                <button onClick={() => { setStep("input"); setReport(null); }} className="flex-1 h-11 rounded-xl text-white font-bold text-sm" style={{ background: "linear-gradient(135deg,#4f46e5,#ec4899)" }}>
                  Run for another role
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
