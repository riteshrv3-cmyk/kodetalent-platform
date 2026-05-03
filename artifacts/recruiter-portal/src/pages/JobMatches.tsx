import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, ArrowLeft, Send, CheckSquare, Square, Github, Loader2, Sparkles } from "lucide-react";

interface Match {
  id: number; name: string; college: string; field: string; year: number;
  cgpa: string | null; workMode: string | null;
  profileStrength: number; overallScore: number;
  matchScore: number; matchReasons: string[]; matchedSkills: string[];
  githubUrl: string | null;
}
interface Job {
  id: number; title: string; rawDescription: string; invitesSent: number;
  parsedRequirements: { role: string; mustHaveSkills: string[]; summary: string; seniority: string; workMode: string | null; minCgpa: number | null } | null;
}

export default function JobMatches({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const jobId = Number(id);
  const recruiter = JSON.parse(localStorage.getItem("recruiter") || "{}");
  const [data, setData] = useState<{ job: Job; matches: Match[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkSent, setBulkSent] = useState(0);

  useEffect(() => {
    fetch(`/api/recruiter-jobs/${jobId}/matches`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setMessage(`Hi! We have an exciting ${d.job?.title || "opportunity"} at ${recruiter.company}. Your profile matched our search — would love to chat.`);
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  const toggleSelect = (i: number) => {
    setSelected(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  };

  const bulkInvite = async () => {
    if (!data || selected.size === 0) return;
    setBulkSending(true);
    try {
      const res = await fetch(`/api/recruiter-jobs/${jobId}/bulk-invite`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(selected), message }),
      });
      const j = await res.json();
      setBulkSent(j.sent || 0);
    } finally { setBulkSending(false); }
  };

  const matchColor = (s: number) => s >= 70 ? "#10b981" : s >= 40 ? "#f59e0b" : "#ef4444";

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
          <h1 className="font-black text-[#0f172a] text-lg truncate">{data?.job?.title || "Job Matches"}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}</div>
        ) : !data ? (
          <p className="text-[#94a3b8]">Job not found.</p>
        ) : (
          <>
            {data.job.parsedRequirements && (
              <div className="bg-gradient-to-br from-[#0f172a] to-[#312e81] text-white rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#fbbf24]" />
                  <span className="text-xs font-black uppercase text-[#fbbf24]">AI parsed</span>
                </div>
                <p className="text-sm text-white/80 mb-3">{data.job.parsedRequirements.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.job.parsedRequirements.mustHaveSkills.map(s => (
                    <span key={s} className="text-xs font-bold bg-[#fbbf24]/20 text-[#fbbf24] px-2.5 py-1 rounded-lg">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {bulkSent > 0 ? (
              <div className="bg-[#10b981]/10 border-2 border-[#10b981]/30 rounded-2xl p-6 text-center">
                <CheckSquare className="w-12 h-12 text-[#10b981] mx-auto mb-3" />
                <h3 className="font-black text-xl text-[#0f172a] mb-1">{bulkSent} invites sent! 🎉</h3>
                <button onClick={() => setLocation("/dashboard")} className="mt-3 bg-[#10b981] text-white font-black px-5 py-2.5 rounded-xl text-sm">Back to Dashboard</button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-[#f0f4ff] p-5 sticky top-20 z-20 shadow-sm mb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-[#0f172a]">{selected.size} of {data.matches.length} selected</p>
                      <p className="text-xs text-[#94a3b8]">{data.job.invitesSent} invites already sent on this job</p>
                    </div>
                    <button onClick={bulkInvite} disabled={selected.size === 0 || bulkSending}
                      className="bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white font-black px-5 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50">
                      {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Bulk Invite {selected.size > 0 && `(${selected.size})`}
                    </button>
                  </div>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                    className="w-full mt-3 px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30" />
                </div>

                <div className="space-y-3">
                  {data.matches.map((m, i) => (
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
                              <p className="text-xs text-[#64748b] truncate">{m.college} · Year {m.year}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-2xl font-black" style={{ color: matchColor(m.matchScore) }}>{m.matchScore}</div>
                              <div className="text-[9px] font-black uppercase text-[#94a3b8]">match</div>
                            </div>
                          </div>
                          {m.matchReasons.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {m.matchReasons.map((r, idx) => <span key={idx} className="text-[10px] font-bold bg-[#10b981]/10 text-[#10b981] px-2 py-0.5 rounded-md">✓ {r}</span>)}
                            </div>
                          )}
                          {m.matchedSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {m.matchedSkills.map(s => <span key={s} className="text-[10px] font-bold bg-[#eef2ff] text-[#4f46e5] px-2 py-0.5 rounded-md">{s}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
