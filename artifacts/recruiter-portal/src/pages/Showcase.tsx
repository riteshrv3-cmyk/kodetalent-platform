import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, ArrowRight, Lock, Github, Users, GraduationCap, TrendingUp,
  CheckCircle, X, Sparkles, ChevronRight, Clock
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

const PREVIEW_CANDIDATE = {
  initials: "AR",
  name: "Arjun R.",
  college: "BITS Pilani",
  field: "Computer Science",
  year: 3,
  profileStrength: 87,
  overallScore: 82,
  skills: ["React", "Node.js", "PostgreSQL"],
  github: { repos: 14, stars: 47, streak: 32 },
};

const FUNNEL_DATA = {
  without: [
    { stage: "Source", action: "Post on Naukri / LinkedIn", result: "200 applications, 80% irrelevant or auto-applied" },
    { stage: "Screen", action: "Manual resume review or separate AI screener", result: "2–3 days of effort. No GitHub. No proof." },
    { stage: "Shortlist", action: "Spreadsheet: name, phone, 'maybe'", result: "No score. Biased gut call. Easy to forget." },
    { stage: "Close", action: "Email → reschedule → reschedule → no-show", result: "3 weeks wasted. Low quality outcome." },
  ],
  with: [
    { stage: "Discover", action: "Browse pre-verified campus pool", result: "Every profile has GitHub, projects, and AI commitment score." },
    { stage: "Screen", action: "AI ranks by skills, field, and project quality", result: "Done inside the same system. Zero tool-switching." },
    { stage: "Shortlist", action: "One click. Fit summary auto-generated.", result: "Clean pipeline. No spreadsheet. No data loss." },
    { stage: "Close", action: "Candidate is already prepared — status tracked", result: "48 hr median shortlist. Higher accept rate." },
  ],
};

const STATS = [
  { value: "1,200+", label: "Verified students", icon: Users, color: "#4f46e5" },
  { value: "15+", label: "Partner colleges", icon: GraduationCap, color: "#10b981" },
  { value: "90%+", label: "Have real projects", icon: Github, color: "#0f172a" },
  { value: "48 hrs", label: "Median shortlist", icon: TrendingUp, color: "#f97316" },
];

export default function Showcase() {
  const [, setLocation] = useLocation();
  const [candidates, setCandidates] = useState<MaskedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [funnelMode, setFunnelMode] = useState<"without" | "with">("without");
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    fetch(`/api/talent-pool/showcase`)
      .then(async r => r.ok ? r.json() : { candidates: [] })
      .then(data => setCandidates(data.candidates || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % 4), 2000);
    return () => clearInterval(t);
  }, []);

  const funnel = FUNNEL_DATA[funnelMode];

  return (
    <div className="min-h-screen bg-[#f8fafc]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#f0f0f0] shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#f97316] rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-black text-[#0f172a] text-[15px] tracking-tight">KodeTalent</span>
            <span className="hidden sm:block text-[#cbd5e1] text-sm">/ Recruiter</span>
          </div>
          <button
            onClick={() => setLocation("/login")}
            className="bg-[#4f46e5] hover:bg-[#4338ca] active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all"
          >
            Request access <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* HERO — light split layout */}
      <section className="bg-white border-b border-[#f0f4ff] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#4f46e5]/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-[10%] w-[400px] h-[400px] bg-[#f97316]/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24 grid lg:grid-cols-[1fr_340px] gap-10 lg:gap-16 items-center relative z-10">
          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-[#fff7ed] border border-[#fed7aa] rounded-full px-3.5 py-1.5 mb-7"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse" />
              <span className="text-[11px] font-bold text-[#ea580c] tracking-wider uppercase">Private beta · Invite-only</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 }}
              className="text-[38px] sm:text-[52px] font-black text-[#0f172a] leading-[1.1] tracking-tight mb-5"
            >
              You're spending weeks<br />
              finding candidates<br />
              <span className="text-[#4f46e5]">who don't respond.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.14 }}
              className="text-[17px] text-[#64748b] mb-8 leading-relaxed max-w-md"
            >
              KodeTalent gives you a pre-screened campus pool — GitHub verified, AI scored, and ready to respond.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={() => setLocation("/login")}
                className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-black px-7 py-3.5 rounded-xl flex items-center gap-2 shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_32px_rgba(79,70,229,0.4)] transition-all active:scale-[0.98] text-[15px]"
              >
                Get early access <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => document.getElementById("funnel")?.scrollIntoView({ behavior: "smooth" })}
                className="text-[#64748b] hover:text-[#4f46e5] font-semibold px-5 py-3.5 rounded-xl transition-colors text-[15px] flex items-center gap-1.5 border border-[#e5e7eb] hover:border-[#4f46e5]/30"
              >
                See how it works <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex flex-wrap gap-4"
            >
              {["No credit card", "2-min setup", "Works immediately"].map(t => (
                <div key={t} className="flex items-center gap-1.5 text-xs text-[#94a3b8] font-medium">
                  <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" /> {t}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — product preview card (light version) */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 90 }}
            className="hidden lg:block flex-shrink-0"
          >
            <div className="relative">
              <div className="absolute inset-0 -m-3 bg-[#4f46e5]/8 rounded-3xl blur-xl" />
              <div className="relative bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Candidate Preview</span>
                  <div className="flex items-center gap-1.5 bg-[#fef9ee] border border-[#fde68a] rounded-full px-2 py-0.5">
                    <Lock className="w-2.5 h-2.5 text-[#f59e0b]" />
                    <span className="text-[9px] font-bold text-[#b45309]">Locked</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center text-white font-black text-base flex-shrink-0">
                    {PREVIEW_CANDIDATE.initials}
                  </div>
                  <div>
                    <div className="font-black text-[#0f172a] text-sm blur-sm select-none">{PREVIEW_CANDIDATE.name}</div>
                    <div className="text-xs text-[#64748b] mt-0.5">{PREVIEW_CANDIDATE.college}</div>
                    <div className="text-[10px] text-[#94a3b8]">{PREVIEW_CANDIDATE.field} · Year {PREVIEW_CANDIDATE.year}</div>
                  </div>
                </div>

                <div className="space-y-2.5 mb-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Profile Strength</span>
                      <span className="text-[11px] font-black text-[#10b981]">{PREVIEW_CANDIDATE.profileStrength}/100</span>
                    </div>
                    <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${PREVIEW_CANDIDATE.profileStrength}%` }}
                        transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
                        className="h-full bg-[#10b981] rounded-full"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">AI Score</span>
                      <span className="text-[11px] font-black text-[#4f46e5]">{PREVIEW_CANDIDATE.overallScore}/100</span>
                    </div>
                    <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${PREVIEW_CANDIDATE.overallScore}%` }}
                        transition={{ delay: 1, duration: 1, ease: "easeOut" }}
                        className="h-full bg-[#4f46e5] rounded-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#f8fafc] border border-[#f0f4ff] rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Github className="w-3.5 h-3.5 text-[#475569]" />
                      <span className="text-[10px] font-black text-[#64748b] uppercase tracking-wider">GitHub</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#10b981]">Verified</span>
                  </div>
                  <div className="flex gap-4">
                    {[["14", "Repos"], ["47", "Stars"], ["32d", "Streak"]].map(([v, l]) => (
                      <div key={l} className="text-center">
                        <div className="text-sm font-black text-[#0f172a]">{v}</div>
                        <div className="text-[9px] text-[#94a3b8]">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {PREVIEW_CANDIDATE.skills.map(s => (
                    <span key={s} className="text-[10px] font-bold bg-[#eef2ff] text-[#4f46e5] px-2 py-1 rounded-lg">{s}</span>
                  ))}
                </div>

                <button
                  onClick={() => setLocation("/login")}
                  className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <Lock className="w-3.5 h-3.5" /> Unlock full profile
                </button>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.1 }}
                className="absolute -top-3 -right-3 bg-[#10b981] text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl shadow-md"
              >
                4 projects · Open to work
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="pb-6 flex justify-center">
          <motion.div animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-[#cbd5e1]">
            <ChevronRight className="w-5 h-5 rotate-90" />
          </motion.div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="bg-white border-b border-[#f0f4ff]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#f1f5f9]">
            {STATS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="py-5 px-5 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}12` }}>
                    <Icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="font-black text-[#0f172a] text-lg leading-none">{s.value}</p>
                    <p className="text-[10px] text-[#94a3b8] font-semibold mt-0.5">{s.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FUNNEL COMPARISON */}
      <section id="funnel" className="py-20 px-5 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-xs font-black uppercase tracking-widest text-[#f97316] mb-2">
            The recruiter problem
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-3xl sm:text-[38px] font-black text-[#0f172a] leading-[1.15] mb-3">
            4 steps. Same outcome.<br />
            <span className="text-[#4f46e5]">Unless the talent is already verified.</span>
          </motion.h2>
          <p className="text-[#64748b] max-w-lg mx-auto text-[15px]">Toggle to see what disappears when the pool is pre-screened.</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="bg-[#f1f5f9] rounded-2xl p-1 flex">
            <button
              onClick={() => setFunnelMode("without")}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${funnelMode === "without" ? "bg-white text-[#0f172a] shadow" : "text-[#64748b]"}`}
            >
              <X className="w-3.5 h-3.5 text-[#ef4444]" /> Old stack
            </button>
            <button
              onClick={() => setFunnelMode("with")}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${funnelMode === "with" ? "bg-[#4f46e5] text-white shadow" : "text-[#64748b]"}`}
            >
              <CheckCircle className="w-3.5 h-3.5" /> With KodeTalent
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={funnelMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-3">
              {funnel.map((item, i) => {
                const isActive = i === activeStep;
                const isGreen = funnelMode === "with";
                return (
                  <motion.div
                    key={item.stage}
                    initial={{ opacity: 0, x: isGreen ? 16 : -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => setActiveStep(i)}
                    className={`rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                      isActive
                        ? isGreen ? "bg-[#f0fdf4] border-[#86efac] shadow-sm" : "bg-[#fff5f5] border-[#fca5a5] shadow-sm"
                        : "bg-white border-[#f0f0f0] hover:border-[#e2e8f0]"
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${isGreen ? "bg-[#dcfce7] text-[#10b981]" : "bg-[#fee2e2] text-[#ef4444]"}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isGreen ? "text-[#10b981]" : "text-[#ef4444]"}`}>{item.stage}</span>
                        <div className="font-bold text-[#0f172a] text-sm mt-0.5">{item.action}</div>
                        <AnimatePresence>
                          {isActive && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className={`text-xs mt-2 flex items-start gap-1.5 ${isGreen ? "text-[#15803d]" : "text-[#b91c1c]"}`}>
                                {isGreen ? <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> : <X className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                                {item.result}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
          <div className={`mt-4 rounded-2xl p-4 text-center border ${funnelMode === "with" ? "bg-[#f0fdf4] border-[#bbf7d0]" : "bg-[#fff5f5] border-[#fecaca]"}`}>
            <p className={`font-black text-sm ${funnelMode === "with" ? "text-[#10b981]" : "text-[#ef4444]"}`}>
              {funnelMode === "with" ? "Shortlist in 48 hrs. Better candidates. Recruiter wins." : "3–4 weeks. Burnout. Wrong hire. Repeat."}
            </p>
          </div>
        </div>
      </section>

      {/* CANDIDATE POOL — light version */}
      <section className="bg-[#f8fafc] border-t border-[#f0f4ff] py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-xs font-black uppercase tracking-widest text-[#4f46e5] mb-2">Live talent pool</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-3xl font-black text-[#0f172a] mb-2">
              Your next hire is already in here.
            </motion.h2>
            <p className="text-[#64748b] text-sm">Profiles are anonymized until you sign in. Scores and signals are real.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading
              ? [1,2,3,4,5,6].map(i => <div key={i} className="rounded-2xl bg-white border border-[#f0f4ff] h-48 animate-pulse" />)
              : candidates.slice(0, 6).map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-[#f0f4ff] rounded-2xl p-5 hover:border-[#c7d2fe] hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#818cf8] flex items-center justify-center text-white font-black flex-shrink-0">
                      {c.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-[#0f172a] text-sm blur-sm select-none">{c.maskedName}</div>
                      <div className="text-[11px] text-[#64748b] mt-0.5 truncate">{c.college}</div>
                      <div className="text-[10px] text-[#94a3b8]">{c.field} · Year {c.year}</div>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-[#cbd5e1] mt-0.5 flex-shrink-0" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-[#f0fdf4] rounded-xl p-2 text-center">
                      <div className="text-sm font-black text-[#10b981]">{c.profileStrength}</div>
                      <div className="text-[9px] text-[#94a3b8] uppercase font-bold">Profile</div>
                    </div>
                    <div className="bg-[#eef2ff] rounded-xl p-2 text-center">
                      <div className="text-sm font-black text-[#4f46e5]">{c.overallScore}</div>
                      <div className="text-[9px] text-[#94a3b8] uppercase font-bold">AI</div>
                    </div>
                    <div className="bg-[#f8fafc] rounded-xl p-2 text-center">
                      {c.hasGithub
                        ? <Github className="w-4 h-4 text-[#10b981] mx-auto" />
                        : <span className="text-sm font-black text-[#e2e8f0]">—</span>
                      }
                      <div className="text-[9px] text-[#94a3b8] uppercase font-bold">GH</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {c.topSkills.slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] font-semibold bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] px-2 py-0.5 rounded-lg">{s}</span>
                    ))}
                  </div>
                </motion.div>
              ))
            }
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setLocation("/login")}
              className="inline-flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-black px-7 py-3.5 rounded-xl transition-all active:scale-[0.98] text-[15px] shadow-[0_4px_16px_rgba(79,70,229,0.25)] hover:shadow-[0_8px_24px_rgba(79,70,229,0.35)]"
            >
              Unlock full profiles <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-5 bg-white border-t border-[#f0f4ff]">
        <div className="max-w-xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 bg-[#eef2ff] border border-[#c7d2fe] rounded-full px-4 py-1.5 mb-5">
              <Sparkles className="w-3.5 h-3.5 text-[#4f46e5]" />
              <span className="text-xs font-bold text-[#4f46e5]">Private beta — serious hiring teams only</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0f172a] mb-4 leading-[1.15]">
              Shortlist in 48 hours.<br />
              <span className="text-[#4f46e5]">Not 4 weeks.</span>
            </h2>
            <p className="text-[#64748b] mb-8 text-[15px] leading-relaxed">
              No credit card. No sales call. Sign in with your work email and start browsing verified talent right now.
            </p>
            <button
              onClick={() => setLocation("/login")}
              className="bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white font-black px-10 py-4 rounded-2xl inline-flex items-center gap-2 shadow-[0_8px_32px_rgba(79,70,229,0.25)] hover:shadow-[0_12px_40px_rgba(79,70,229,0.4)] transition-all active:scale-[0.98] text-[15px] w-full sm:w-auto justify-center"
            >
              Request access now <ArrowRight className="w-5 h-5" />
            </button>
            <p className="mt-4 text-xs text-[#cbd5e1]">Only verified hiring teams accepted. No public sign-up.</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
