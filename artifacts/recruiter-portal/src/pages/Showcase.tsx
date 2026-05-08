import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Lock, Sparkles, TrendingUp, Award, Users, Github, GraduationCap, ScanSearch, ShieldCheck, BrainCircuit, Rocket, Target, BriefcaseBusiness, BadgeCheck, Flame, CheckCircle2, Star } from "lucide-react";

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

const MARKET_STATS = [
  { value: "1,200+", label: "verified student profiles", note: "active across campuses" },
  { value: "180+", label: "colleges covered", note: "tier-1 to emerging campuses" },
  { value: "90%+", label: "profiles with project data", note: "not resume-only entries" },
  { value: "48 hrs", label: "median time to shortlist", note: "from post to first shortlist" },
] as const;

export default function Showcase() {
  const [, setLocation] = useLocation();
  const [candidates, setCandidates] = useState<MaskedCandidate[]>([]);
  const [totalOpen, setTotalOpen] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/talent-pool/showcase`)
      .then(async r => r.ok ? r.json() : { candidates: [], totalOpen: 0 })
      .then(data => {
        setCandidates(data.candidates || []);
        setTotalOpen(data.totalOpen || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="bg-gradient-to-br from-[#0f172a] via-[#312e81] to-[#4338ca] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#f97316] blur-3xl" />
          <div className="absolute top-24 left-10 w-56 h-56 rounded-full bg-[#4f46e5] blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-lg">KodeTalent</span>
            <span className="text-white/50 text-sm hidden sm:block">· Private Hiring Network</span>
          </div>
          <button onClick={() => setLocation("/login")} className="bg-white text-[#4f46e5] font-black px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:shadow-lg transition-all active:scale-95">
            Request access <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-12 pb-20 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span className="text-xs font-bold">Private beta · Hiring teams only · New recruiters every week</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black leading-tight mb-4">
            Hire India's most committed<br />
            <span className="bg-gradient-to-r from-[#fbbf24] to-[#f97316] bg-clip-text text-transparent">engineering students</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-8">
            A private recruiting layer for engineering talent — verified profiles, project proof, and AI-ranked match lists.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 mb-2">
            <button
              onClick={() => setLocation("/login")}
              className="bg-gradient-to-r from-[#fbbf24] to-[#f97316] text-[#0f172a] font-black px-7 py-4 rounded-2xl flex items-center gap-2 shadow-[0_8px_32px_rgba(251,191,36,0.4)] hover:shadow-[0_12px_40px_rgba(251,191,36,0.5)] transition-all active:scale-95"
            >
              Request early access <ArrowRight className="w-5 h-5" />
            </button>
            <span className="text-white/60 text-sm">No credit card · 2-minute setup · Limited seats</span>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {[
              { icon: ScanSearch, title: "Controlled access", desc: "Private beta keeps the pool high-signal" },
              { icon: BrainCircuit, title: "AI-ranked matches", desc: "Best-fit candidates surface first" },
              { icon: ShieldCheck, title: "Verified profiles", desc: "GitHub, projects, and commitment signals" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-black text-base mb-1">{item.title}</div>
                  <div className="text-sm text-white/70">{item.desc}</div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-12 relative z-10 mb-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MARKET_STATS.map((s, idx) => {
            const Icon = [Users, GraduationCap, Github, TrendingUp][idx]!;
            const color = ["#4f46e5", "#10b981", "#0f172a", "#f59e0b"][idx]!;
            return (
              <div key={s.label} className="bg-white rounded-2xl border border-[#f0f4ff] shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <p className="font-black text-[#0f172a] text-lg leading-none">{s.value}</p>
                  <p className="text-[10px] text-[#94a3b8] font-bold uppercase mt-0.5">{s.label}</p>
                  <p className="text-[9px] text-[#cbd5e1] font-medium mt-0.5">{s.note}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            "Private beta onboarding",
            "No public demo site language",
            "Enterprise-ready workflow",
          ].map((item) => (
            <div key={item} className="bg-[#0f172a] text-white rounded-2xl px-4 py-3 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-[#86efac]" />
              <span className="text-xs font-bold">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-[#0f172a] mb-2">Preview the private talent network</h2>
          <p className="text-[#64748b]">Anonymized cards below are a small sample of the live pool. Access remains invite-led.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-white rounded-2xl h-56 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative">
            {candidates.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-[#f1f0f9] p-5 relative overflow-hidden">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center text-white font-black text-base flex-shrink-0">
                    {c.initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-[#0f172a] text-base blur-sm select-none">{c.maskedName} (locked)</h3>
                    <p className="text-xs text-[#64748b] font-medium mt-0.5 truncate">{c.college}</p>
                    <p className="text-xs text-[#94a3b8]">{c.field} · Year {c.year}</p>
                  </div>
                </div>
                <div className="flex items-center justify-around bg-[#fafafa] rounded-xl p-3 mb-3">
                  <div className="text-center">
                    <div className="text-sm font-black text-[#10b981]">{c.profileStrength}</div>
                    <div className="text-[9px] text-[#94a3b8] uppercase font-bold">Profile</div>
                  </div>
                  <div className="w-px h-8 bg-[#f0f0f0]" />
                  <div className="text-center">
                    <div className="text-sm font-black text-[#0ea5e9]">{c.overallScore}</div>
                    <div className="text-[9px] text-[#94a3b8] uppercase font-bold">AI Score</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {c.topSkills.map(s => (
                    <span key={s} className="text-[10px] font-bold bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] px-2 py-1 rounded-lg">{s}</span>
                  ))}
                </div>
                {c.hasGithub && (
                  <div className="flex items-center gap-1 text-xs text-[#64748b]">
                    <Github className="w-3 h-3" /> GitHub verified
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-12 grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="bg-gradient-to-br from-[#4f46e5] to-[#6366f1] text-white rounded-3xl p-8 sm:p-10">
            <Rocket className="w-12 h-12 mb-4 text-[#fbbf24]" />
            <h3 className="text-2xl sm:text-3xl font-black mb-3">Access the private hiring layer</h3>
            <p className="text-white/80 mb-6 max-w-xl">Post one job. Get AI-ranked matches, shortlist faster, and keep candidate quality premium.</p>
            <button
              onClick={() => setLocation("/login")}
              className="bg-white text-[#4f46e5] font-black px-8 py-4 rounded-2xl inline-flex items-center gap-2 hover:shadow-2xl transition-all active:scale-95"
            >
              <Lock className="w-4 h-4" /> Request access <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-white rounded-3xl border border-[#e0e7ff] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[#eef2ff] flex items-center justify-center">
                <BriefcaseBusiness className="w-5 h-5 text-[#4f46e5]" />
              </div>
              <div>
                <div className="font-black text-[#0f172a]">What recruiters get</div>
                <div className="text-xs text-[#94a3b8]">Private, structured, and premium</div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                "Real student projects and GitHub signals",
                "Commitment score + profile strength",
                "AI shortlist, not just resume dump",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2 text-sm text-[#334155]">
                  <Target className="w-4 h-4 text-[#10b981] mt-0.5" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-[#f8fafc] p-4">
              <div className="text-xs font-black uppercase text-[#94a3b8] mb-2">One-line promise</div>
              <div className="text-sm font-semibold text-[#0f172a]">Private beta for serious hiring teams — no demo vibe, only actual workflow.</div>
            </div>
            <button
              onClick={() => setLocation("/login")}
              className="mt-4 w-full rounded-2xl border-2 border-[#4f46e5] text-[#4f46e5] font-black py-3 hover:bg-[#eef2ff] transition-colors"
            >
              Join waitlist
            </button>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#64748b]">
              <Flame className="w-4 h-4 text-[#f97316]" />
              <span>Only serious recruiters are accepted to keep the network high-signal.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
