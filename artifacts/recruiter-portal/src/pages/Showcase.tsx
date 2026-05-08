import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, ArrowRight, Lock, Github, Users, GraduationCap, TrendingUp,
  CircleDashed, Workflow, MousePointerClick, CheckCircle, X,
  Timer, FileStack, BarChart3, Layers, ShieldCheck, Sparkles
} from "lucide-react";

interface MaskedCandidate {
  id: number;
  initials: string;
  maskedName: string;
  college: string;
  field: string;
  year: number;
  profileStrength: number;
  overallScore: number;
  topSkills: string[];
  hasGithub: boolean;
}

const PAIN_POINTS = [
  { icon: FileStack, text: "100 resumes, 6 are actually good" },
  { icon: Layers, text: "ATS + screener + sheets + Calendly = 4 tabs open always" },
  { icon: Timer, text: "Takes 3 weeks to shortlist 10 candidates" },
];

const WITH_KODETALENT = [
  { step: "1", title: "Open verified talent pool", desc: "Every candidate has a GitHub, project proof, and AI score — not just a PDF" },
  { step: "2", title: "AI ranks by fit — instantly", desc: "No manual screening. System scores commitment, skills, and project quality" },
  { step: "3", title: "Shortlist in 48 hours", desc: "One-click shortlist. Invite sent. Recruiter looks sharp, candidate gets fast response" },
];

const MARKET_STATS = [
  { value: "1,200+", label: "verified student profiles", icon: Users, color: "#4f46e5" },
  { value: "15+", label: "colleges covered", icon: GraduationCap, color: "#10b981" },
  { value: "90%+", label: "profiles with real project data", icon: Github, color: "#0f172a" },
  { value: "48 hrs", label: "median time to shortlist", icon: TrendingUp, color: "#f59e0b" },
];

export default function Showcase() {
  const [, setLocation] = useLocation();
  const [candidates, setCandidates] = useState<MaskedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePainIdx, setActivePainIdx] = useState(0);
  const [funnelView, setFunnelView] = useState<"without" | "with">("without");

  useEffect(() => {
    fetch(`/api/talent-pool/showcase`)
      .then(async r => r.ok ? r.json() : { candidates: [] })
      .then(data => setCandidates(data.candidates || []))
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      setActivePainIdx(i => (i + 1) % PAIN_POINTS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-[Plus_Jakarta_Sans,sans-serif]">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#f97316] rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-black text-white text-base">KodeTalent</span>
            <span className="hidden sm:block text-white/30 text-sm ml-1">· Recruiter</span>
          </div>
          <button
            onClick={() => setLocation("/login")}
            className="bg-[#f97316] hover:bg-[#ea6c10] text-white font-bold px-5 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all active:scale-95"
          >
            Request access <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-[#0f172a] text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#4f46e5]/20 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#f97316]/10 blur-[100px]" />
        </div>
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-[#86efac] animate-pulse" />
            <span className="text-xs font-bold text-white/80">Private beta · Invite-only · Limited seats</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-4xl sm:text-6xl font-black leading-[1.1] mb-5 max-w-3xl"
          >
            Stop reviewing resumes.<br />
            <span className="bg-gradient-to-r from-[#fbbf24] via-[#f97316] to-[#fb7185] bg-clip-text text-transparent">
              Start hiring people who build.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.16 }}
            className="text-lg text-white/60 max-w-xl mb-8 leading-relaxed"
          >
            KodeTalent is a private campus hiring layer — verified GitHub profiles, AI commitment scores, and zero resume noise.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="flex flex-col sm:flex-row gap-3 items-start"
          >
            <button
              onClick={() => setLocation("/login")}
              className="bg-gradient-to-r from-[#fbbf24] to-[#f97316] text-[#0f172a] font-black px-8 py-4 rounded-2xl flex items-center gap-2 shadow-[0_8px_32px_rgba(251,191,36,0.35)] hover:shadow-[0_12px_40px_rgba(251,191,36,0.5)] transition-all active:scale-95 text-base"
            >
              Get early access <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => document.getElementById("funnel")?.scrollIntoView({ behavior: "smooth" })}
              className="border border-white/20 text-white/70 hover:text-white hover:border-white/40 font-semibold px-7 py-4 rounded-2xl transition-all text-base"
            >
              See how it works
            </button>
          </motion.div>

          {/* Rotating pain point badge */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-10">
            <p className="text-xs text-white/40 mb-2 font-medium uppercase tracking-wider">Recruiters tell us</p>
            <div className="relative h-10 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePainIdx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2"
                >
                  {(() => { const Icon = PAIN_POINTS[activePainIdx].icon; return <Icon className="w-4 h-4 text-[#f97316]" />; })()}
                  <span className="text-white/70 text-sm font-medium">" {PAIN_POINTS[activePainIdx].text} "</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-b border-[#e5e7eb] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {MARKET_STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="font-black text-[#0f172a] text-lg leading-none">{s.value}</p>
                  <p className="text-[10px] text-[#94a3b8] font-semibold mt-0.5 leading-tight">{s.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── FUNNEL COMPARISON ── */}
      <section id="funnel" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-[#f97316] mb-2">The real problem</p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0f172a] mb-3 leading-tight">
            Your hiring funnel is broken.<br />
            <span className="text-[#4f46e5]">KodeTalent fixes it at the source.</span>
          </h2>
          <p className="text-[#64748b] max-w-xl mx-auto">Click to compare what recruiters deal with today vs what happens when the talent is pre-verified.</p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-white rounded-full border border-[#e2e8f0] p-1 flex shadow-sm">
            <button
              onClick={() => setFunnelView("without")}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 flex items-center gap-1.5 ${funnelView === "without" ? "bg-[#0f172a] text-white shadow" : "text-[#94a3b8] hover:text-[#64748b]"}`}
            >
              <X className="w-3.5 h-3.5" /> Without
            </button>
            <button
              onClick={() => setFunnelView("with")}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 flex items-center gap-1.5 ${funnelView === "with" ? "bg-[#4f46e5] text-white shadow" : "text-[#94a3b8] hover:text-[#64748b]"}`}
            >
              <CheckCircle className="w-3.5 h-3.5" /> With KodeTalent
            </button>
          </div>
        </div>

        {/* Funnel Visual */}
        <AnimatePresence mode="wait">
          {funnelView === "without" ? (
            <motion.div
              key="without"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="max-w-2xl mx-auto space-y-3"
            >
              {[
                { stage: "Sourcing", old: "Post on Naukri + LinkedIn → 200 applications", pain: "80% are irrelevant or auto-applied" },
                { stage: "Screening", old: "Manual resume review or AI screener (separate tool)", pain: "Days of effort. No GitHub. No projects." },
                { stage: "Shortlisting", old: "Spreadsheet with name, phone, email, 'maybe'", pain: "No scoring. Biased. Easy to forget." },
                { stage: "Interview", old: "Email → reschedule → reschedule → no-show", pain: "3 weeks wasted on a weak candidate" },
              ].map((item, i) => (
                <motion.div
                  key={item.stage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-2xl border border-[#fecaca] p-5 flex gap-4 shadow-sm"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#fee2e2] text-[#ef4444] flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#ef4444] font-black uppercase tracking-wider mb-0.5">{item.stage}</div>
                    <div className="font-bold text-[#0f172a] text-sm mb-1">{item.old}</div>
                    <div className="text-xs text-[#94a3b8] flex items-start gap-1.5">
                      <X className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#ef4444]" />
                      {item.pain}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div className="rounded-2xl bg-[#fef2f2] border border-[#fecaca] p-4 text-center">
                <p className="text-sm font-black text-[#ef4444]">Result: 3–4 weeks, low quality hires, burnt recruiter</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="with"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="max-w-2xl mx-auto space-y-3"
            >
              {[
                { stage: "Discover", action: "Browse verified pool — GitHub, projects, score all visible", win: "Only committed students. Signal, not noise." },
                { stage: "Screen", action: "AI ranks by skills, field, commitment, project quality", win: "Done automatically. No extra tool needed." },
                { stage: "Shortlist", action: "One click. Candidate tagged, fit noted, invite queued", win: "No spreadsheet. Clean pipeline." },
                { stage: "Close", action: "Candidate already prepared — communication tracked in-app", win: "Faster response. Better candidate experience." },
              ].map((item, i) => (
                <motion.div
                  key={item.stage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-2xl border border-[#bbf7d0] p-5 flex gap-4 shadow-sm"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#dcfce7] text-[#10b981] flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#10b981] font-black uppercase tracking-wider mb-0.5">{item.stage}</div>
                    <div className="font-bold text-[#0f172a] text-sm mb-1">{item.action}</div>
                    <div className="text-xs text-[#94a3b8] flex items-start gap-1.5">
                      <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#10b981]" />
                      {item.win}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div className="rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] p-4 text-center">
                <p className="text-sm font-black text-[#10b981]">Result: Shortlist in 48 hrs. Quality hires. Recruiter wins.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── CANDIDATE PREVIEW ── */}
      <section className="bg-[#0f172a] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-black uppercase tracking-widest text-[#f97316] mb-2">Live pool preview</p>
            <h2 className="text-3xl font-black text-white mb-2">
              These are your next hires — locked until you sign in.
            </h2>
            <p className="text-white/50 text-sm max-w-md mx-auto">Real profiles, anonymized. GitHub signals, project count, and AI scores visible to recruiters immediately.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              [1,2,3,4,5,6].map(i => (
                <div key={i} className="rounded-2xl bg-white/5 h-44 animate-pulse" />
              ))
            ) : (
              candidates.slice(0, 6).map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all duration-200 rounded-2xl" />
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center text-white font-black flex-shrink-0">
                      {c.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-white blur-sm select-none text-sm">{c.maskedName}</div>
                      <div className="text-xs text-white/50 mt-0.5 truncate">{c.college}</div>
                      <div className="text-xs text-white/35">{c.field} · Year {c.year}</div>
                    </div>
                    <div className="ml-auto flex-shrink-0">
                      <Lock className="w-4 h-4 text-white/20" />
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 bg-white/5 rounded-xl p-2 text-center">
                      <div className="text-sm font-black text-[#86efac]">{c.profileStrength}</div>
                      <div className="text-[9px] text-white/40 uppercase font-bold">Profile</div>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-xl p-2 text-center">
                      <div className="text-sm font-black text-[#93c5fd]">{c.overallScore}</div>
                      <div className="text-[9px] text-white/40 uppercase font-bold">AI Score</div>
                    </div>
                    {c.hasGithub && (
                      <div className="flex-1 bg-white/5 rounded-xl p-2 text-center">
                        <Github className="w-4 h-4 text-white/60 mx-auto mb-0.5" />
                        <div className="text-[9px] text-white/40 uppercase font-bold">GitHub</div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.topSkills.slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] font-bold bg-white/8 border border-white/15 text-white/60 px-2 py-1 rounded-lg">{s}</span>
                    ))}
                  </div>
                </motion.div>
              ))
            )}
          </div>
          <div className="mt-6 text-center">
            <button
              onClick={() => setLocation("/login")}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold px-6 py-3 rounded-2xl transition-all text-sm"
            >
              <Lock className="w-4 h-4" /> Unlock full profiles
            </button>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#fff7ed] border border-[#fed7aa] rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-[#f97316]" />
            <span className="text-xs font-bold text-[#ea580c]">Private beta — serious recruiters only</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0f172a] mb-4 leading-tight">
            Your next hire is already in the pool.<br />
            <span className="text-[#4f46e5]">Access takes 2 minutes.</span>
          </h2>
          <p className="text-[#64748b] mb-8 max-w-md mx-auto">No credit card. No sales call. Sign in with your work email and start browsing verified talent immediately.</p>
          <button
            onClick={() => setLocation("/login")}
            className="bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white font-black px-10 py-5 rounded-2xl inline-flex items-center gap-2 shadow-[0_8px_32px_rgba(79,70,229,0.35)] hover:shadow-[0_12px_40px_rgba(79,70,229,0.5)] transition-all active:scale-[0.98] text-base"
          >
            Request access now <ArrowRight className="w-5 h-5" />
          </button>
          <p className="mt-4 text-xs text-[#94a3b8]">Only verified hiring teams are accepted. No public sign-up.</p>
        </div>
      </section>
    </div>
  );
}
