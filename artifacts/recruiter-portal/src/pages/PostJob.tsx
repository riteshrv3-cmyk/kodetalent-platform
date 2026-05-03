import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, ArrowLeft, Sparkles, Send, CheckSquare, Square, Github, Loader2, ArrowRight } from "lucide-react";

interface ParsedJob {
  role: string;
  seniority: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  minCgpa: number | null;
  workMode: string | null;
  summary: string;
}

interface Match {
  id: number;
  name: string;
  college: string;
  field: string;
  year: number;
  cgpa: string | null;
  workMode: string | null;
  profileStrength: number;
  overallScore: number;
  matchScore: number;
  matchReasons: string[];
  matchedSkills: string[];
  githubUrl: string | null;
}

export default function PostJob() {
  const [, setLocation] = useLocation();
  const recruiter = JSON.parse(localStorage.getItem("recruiter") || "{}");

  const [title, setTitle] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ jobId: number; parsed: ParsedJob; matches: Match[] } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkSent, setBulkSent] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (rawDescription.trim().length < 30) { setError("Paste a real job description (at least 30 chars)"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/recruiter-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruiterId: recruiter.id, title: title.trim() || undefined, rawDescription }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      const data = await res.json();
      setResult({ jobId: data.job.id, parsed: data.parsed, matches: data.matches });
      setSelected(new Set(data.matches.slice(0, 10).map((m: Match) => m.id)));
      setMessage(`Hi! We have an exciting ${data.job.title} opportunity at ${recruiter.company}. Your profile matched our search — would love to chat.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkInvite = async () => {
    if (!result || selected.size === 0) return;
    setBulkSending(true);
    try {
      const res = await fetch(`/api/recruiter-jobs/${result.jobId}/bulk-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(selected), message }),
      });
      const data = await res.json();
      setBulkSent(data.sent || 0);
    } catch {
      setError("Failed to send invites");
    } finally {
      setBulkSending(false);
    }
  };

  const matchColor = (score: number) => score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="bg-white border-b border-[#f0f4ff] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => setLocation("/dashboard")} className="text-[#64748b] hover:text-[#0f172a] p-1.5 rounded-lg hover:bg-[#f8fafc]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 bg-gradient-to-br from-[#4f46e5] to-[#6366f1] rounded-xl flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-black text-[#0f172a] text-lg">Post Job → Get Instant Matches</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {!result ? (
          <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="bg-white rounded-2xl border border-[#f0f4ff] p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-[#f59e0b]" />
              <h2 className="font-black text-xl text-[#0f172a]">Paste your JD. AI does the rest.</h2>
            </div>
            <p className="text-sm text-[#64748b] mb-6">We'll parse requirements and rank candidates from our talent pool in ~10 seconds.</p>

            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5 block">Job Title (optional)</label>
            <input type="text" placeholder="e.g. Backend Engineer Intern" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-medium mb-4 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5]" />

            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5 block">Job Description *</label>
            <textarea required value={rawDescription} onChange={e => setRawDescription(e.target.value)} rows={12}
              placeholder="Paste full JD here — role, responsibilities, required skills, CGPA cutoff, location, work mode, etc."
              className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] resize-none" />

            {error && <p className="text-[#ef4444] text-sm mt-3 font-medium">{error}</p>}

            <button type="submit" disabled={submitting}
              className="mt-5 w-full sm:w-auto bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white font-black px-7 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(124,58,237,0.35)] hover:shadow-[0_12px_32px_rgba(124,58,237,0.45)] transition-all active:scale-[0.98] disabled:opacity-60">
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Matching candidates...</> : <>Find Matches <ArrowRight className="w-5 h-5" /></>}
            </button>
          </motion.form>
        ) : (
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#0f172a] to-[#312e81] text-white rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-[#fbbf24]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#fbbf24]">AI parsed</span>
              </div>
              <h2 className="font-black text-2xl mb-2">{result.parsed.role}</h2>
              <p className="text-white/80 text-sm mb-4">{result.parsed.summary}</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-bold bg-white/10 backdrop-blur px-3 py-1.5 rounded-lg">{result.parsed.seniority}</span>
                {result.parsed.workMode && <span className="text-xs font-bold bg-white/10 backdrop-blur px-3 py-1.5 rounded-lg">{result.parsed.workMode}</span>}
                {result.parsed.minCgpa && <span className="text-xs font-bold bg-white/10 backdrop-blur px-3 py-1.5 rounded-lg">CGPA ≥ {result.parsed.minCgpa}</span>}
              </div>
              {result.parsed.mustHaveSkills.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-black uppercase text-white/50 mb-1.5">Must Have</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.parsed.mustHaveSkills.map(s => <span key={s} className="text-xs font-bold bg-[#fbbf24]/20 text-[#fbbf24] px-2.5 py-1 rounded-lg">{s}</span>)}
                  </div>
                </div>
              )}
            </motion.div>

            {bulkSent > 0 ? (
              <div className="bg-[#10b981]/10 border-2 border-[#10b981]/30 rounded-2xl p-6 text-center">
                <CheckSquare className="w-12 h-12 text-[#10b981] mx-auto mb-3" />
                <h3 className="font-black text-xl text-[#0f172a] mb-1">{bulkSent} invites sent! 🎉</h3>
                <p className="text-sm text-[#64748b] mb-4">Students will see your invite in their inbox. Track responses on the dashboard.</p>
                <button onClick={() => setLocation("/dashboard")} className="bg-[#10b981] text-white font-black px-5 py-2.5 rounded-xl text-sm">Back to Dashboard</button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-[#f0f4ff] p-5 sticky top-20 z-20 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-[#0f172a]">{selected.size} of {result.matches.length} selected</p>
                      <p className="text-xs text-[#94a3b8]">Top matches ranked by AI</p>
                    </div>
                    <button onClick={bulkInvite} disabled={selected.size === 0 || bulkSending}
                      className="bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white font-black px-5 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all">
                      {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Bulk Invite {selected.size > 0 && `(${selected.size})`}
                    </button>
                  </div>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                    placeholder="Personal message to candidates..."
                    className="w-full mt-3 px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30" />
                </div>

                <div className="space-y-3">
                  {result.matches.map((m, i) => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                      className={`bg-white rounded-2xl border-2 transition-all p-4 cursor-pointer ${selected.has(m.id) ? "border-[#4f46e5] shadow-[0_4px_24px_rgba(79,70,229,0.15)]" : "border-[#f0f4ff] hover:border-[#e0e7ff]"}`}
                      onClick={() => toggleSelect(m.id)}>
                      <div className="flex items-start gap-4">
                        <button className="mt-1 flex-shrink-0">
                          {selected.has(m.id) ? <CheckSquare className="w-5 h-5 text-[#4f46e5]" /> : <Square className="w-5 h-5 text-[#cbd5e1]" />}
                        </button>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center text-white font-black flex-shrink-0">
                          {m.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="min-w-0">
                              <h3 className="font-black text-[#0f172a] truncate">{m.name}</h3>
                              <p className="text-xs text-[#64748b] truncate">{m.college} · {m.field} · Year {m.year}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-2xl font-black" style={{ color: matchColor(m.matchScore) }}>{m.matchScore}</div>
                              <div className="text-[9px] font-black uppercase text-[#94a3b8]">match</div>
                            </div>
                          </div>
                          {m.matchReasons.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {m.matchReasons.map((r, idx) => (
                                <span key={idx} className="text-[10px] font-bold bg-[#10b981]/10 text-[#10b981] px-2 py-0.5 rounded-md">✓ {r}</span>
                              ))}
                            </div>
                          )}
                          {m.matchedSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {m.matchedSkills.map(s => (
                                <span key={s} className="text-[10px] font-bold bg-[#eef2ff] text-[#4f46e5] px-2 py-0.5 rounded-md">{s}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-[#94a3b8]">
                            <span>Profile {m.profileStrength}%</span>
                            <span>·</span>
                            <span>AI {m.overallScore}</span>
                            {m.cgpa && <><span>·</span><span>CGPA {m.cgpa}</span></>}
                            {m.githubUrl && <><span>·</span><span className="flex items-center gap-1"><Github className="w-3 h-3" /> GitHub</span></>}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {result.matches.length === 0 && (
                  <div className="bg-white rounded-2xl border border-[#f0f4ff] p-12 text-center">
                    <p className="text-4xl mb-3">🤔</p>
                    <p className="font-black text-[#0f172a] mb-1">No strong matches yet</p>
                    <p className="text-sm text-[#94a3b8]">Try widening your skill requirements or check back as more students join.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
