import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { motion, useSpring, useInView } from "framer-motion";
import {
  Briefcase, Trophy, FileText, Flame, Star,
  ChevronRight, Zap, BookOpen, TrendingUp, Mail,
  Target, Users, ShieldCheck, PlayCircle, Code2, Plus, Sparkles, Clock,
  ArrowUpRight, Cpu, Lock, GitBranch
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface StudentProfile {
  id: number;
  name: string;
  college: string;
  field: string;
  year: number;
  xp: number;
  streakCount: number;
  level: number;
  overallScore: number;
  profileStrength: number;
  commitmentScore: number;
  skills: Record<string, number>;
}

interface Invite {
  id: number;
  status: string;
  studentSeen: boolean;
  companyName: string;
  recruiterName: string;
  message: string;
  createdAt: string;
}

interface ActivityEntry {
  id: number;
  action: string;
  description: string;
  xpAmount: number;
  createdAt: string;
}

interface ResumeCourse {
  subDomainId: string;
  subDomainName: string;
  domainName: string;
  domainColor: string;
  domainBg: string;
  domainEmoji: string;
  skills: string[];
  openedAt?: string;
  completed: number;
  total: number;
  pct: number;
}

const categories = [
  { id: "opportunities", label: "Opportunities", icon: Briefcase, href: "/opportunities", gradient: "from-[#4f46e5] to-[#3730a3]", glow: "#4f46e5", accent: "#eef2ff" },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy, href: "/leaderboard", gradient: "from-[#f59e0b] to-[#d97706]", glow: "#f59e0b", count: "Your Rank", accent: "#fffbeb" },
  { id: "resume", label: "Resume", icon: FileText, href: "/resume", gradient: "from-[#10b981] to-[#059669]", glow: "#10b981", count: "AI Builder", accent: "#ecfdf5" },
  { id: "practice", label: "Practice", icon: Zap, href: "/practice", gradient: "from-[#0ea5e9] to-[#0891b2]", glow: "#0ea5e9", count: "Mock Tests", accent: "#ecfeff" },
  { id: "courses", label: "Courses", icon: BookOpen, href: "/opportunities/course", gradient: "from-[#f97316] to-[#ea580c]", glow: "#f97316", count: "Level Up", accent: "#fff7ed" },
  { id: "projects", label: "Projects", icon: Code2, href: "/profile?addProject=1", gradient: "from-[#ec4899] to-[#db2777]", glow: "#ec4899", count: "Show Work", accent: "#fdf2f8" },
];

const ACTION_META: Record<string, { emoji: string; color: string }> = {
  daily_checkin: { emoji: "🔥", color: "#f97316" },
  quest_completed: { emoji: "⚡", color: "#4f46e5" },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { emoji: "⭐", color: "#10b981" };
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function loadResumeCourse(): ResumeCourse | null {
  try {
    const raw = localStorage.getItem("lastCourseContext");
    if (!raw) return null;
    const ctx = JSON.parse(raw);
    if (!ctx?.subDomainId) return null;
    const completedRaw = localStorage.getItem(`lesson_progress_${ctx.subDomainId}`);
    const completedArr: string[] = completedRaw ? JSON.parse(completedRaw) : [];
    const completed = Array.isArray(completedArr) ? completedArr.length : 0;
    let total = 0;
    const cached = localStorage.getItem(`course_content_v2_${ctx.subDomainId}`);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        const modules = Array.isArray(data?.modules) ? data.modules : [];
        total = modules.reduce((acc: number, m: { lessons?: unknown[] }) => acc + (Array.isArray(m.lessons) ? m.lessons.length : 0), 0);
      } catch { /**/ }
    }
    const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    return { ...ctx, completed, total, pct };
  } catch { return null; }
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

function AnimatedNumber({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value, duration]);
  return <span ref={ref}>{display}</span>;
}

function ScoreRing({ value, size = 72, strokeWidth = 5, color = "#4f46e5", label, sublabel }: {
  value: number; size?: number; strokeWidth?: number; color?: string; label: string; sublabel?: string;
}) {
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const ref = useRef<SVGCircleElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const dashOffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
          <circle
            ref={ref}
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={inView ? dashOffset : circumference}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)", filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-black text-white leading-none"><AnimatedNumber value={value} /></span>
          {sublabel && <span className="text-[8px] font-bold text-white/50 mt-0.5">{sublabel}</span>}
        </div>
      </div>
      <span className="text-[9px] font-black text-white/60 uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<ResumeCourse | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [showNudge, setShowNudge] = useState(() => !!localStorage.getItem("newUser"));

  useEffect(() => { setResume(loadResumeCourse()); }, []);

  const resumeCourse = () => {
    if (!resume) return;
    const { completed: _c, total: _t, pct: _p, openedAt: _o, ...ctx } = resume;
    void _c; void _t; void _p; void _o;
    sessionStorage.setItem("courseContext", JSON.stringify(ctx));
    setLocation("/opportunities/course");
  };

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) { setLocation("/onboarding"); return; }
    let alive = true;

    fetch(`${BASE}/api/students/${id}/full-profile`)
      .then(r => r.json())
      .then(prof => {
        if (!alive) return;
        setProfile(prof);
        if (prof?.college) {
          fetch(`${BASE}/api/leaderboard/college?college=${encodeURIComponent(prof.college)}`)
            .then(r => r.ok ? r.json() : [])
            .then((board: { studentId: number; rank: number }[]) => {
              const entry = board.find(e => e.studentId === Number(id));
              if (alive && entry) setMyRank(entry.rank);
            }).catch(() => null);
        }
      }).catch(() => null);

    fetch(`${BASE}/api/students/${id}/invites`)
      .then(r => r.json())
      .then(inv => { if (alive) setInvites(Array.isArray(inv) ? inv : []); })
      .catch(() => alive && setInvites([]));

    fetch(`${BASE}/api/students/${id}/activity-log?limit=10`)
      .then(r => r.json())
      .then(log => { if (alive) setActivityLog(Array.isArray(log) ? log : []); })
      .catch(() => alive && setActivityLog([]))
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [setLocation]);

  const pendingInvites = invites.filter(i => i.status === "pending" && !i.studentSeen);
  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const topSkills = Object.entries(profile?.skills ?? {}).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 4);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0f172a]">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-[#f97316] flex items-center justify-center shadow-[0_0_32px_rgba(249,115,22,0.5)]">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <div className="absolute inset-0 rounded-2xl animate-ping bg-[#f97316]/30" />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div key={i} animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]" />
          ))}
        </div>
      </div>
    );
  }

  const currentLevel = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpInLevel = xp % 1000;
  const levelPct = Math.min(100, Math.round((xpInLevel / 1000) * 100));

  return (
    <div className="pb-8 min-h-screen bg-[#f8fafc]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Helmet>
        <title>KodeTalent — Career Dashboard</title>
        <meta name="description" content="Your AI-powered career dashboard. Track your score, streak, and XP — and discover opportunities matched to your skills." />
      </Helmet>

      {/* ── HERO BANNER ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#0f172a] rounded-b-[40px] shadow-[0_24px_64px_rgba(15,23,42,0.4)]">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a]" />
          <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#4f46e5]/20 blur-[80px]" />
          <motion.div animate={{ x: [0, -20, 0], y: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#f97316]/15 blur-[80px]" />
          <motion.div animate={{ x: [0, 15, 0], y: [0, -15, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-[#0ea5e9]/10 blur-[60px]" />
          {/* Dot grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        </div>

        <div className="relative z-10 px-5 pt-7 pb-8">
          {/* Top row */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center justify-between mb-6">
            <div>
              <p className="text-white/50 text-xs font-semibold tracking-wide">Good {greeting}</p>
              <h1 className="text-[26px] font-black text-white leading-tight mt-0.5">
                {firstName} <span className="text-[#f97316]">👋</span>
              </h1>
              <p className="text-white/40 text-[11px] mt-0.5 truncate max-w-[200px]">{profile?.college}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl border-2 border-white/10 bg-white/8 backdrop-blur-sm flex flex-col items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Lv</span>
                  <span className="text-2xl font-black text-white leading-none">{currentLevel}</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#f97316] flex items-center justify-center">
                  <Zap className="w-2.5 h-2.5 text-white fill-white" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Score rings row */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.5 }} className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/6 border border-white/10 rounded-2xl py-4 flex flex-col items-center gap-1 backdrop-blur-sm">
              <ScoreRing value={Math.round(profile?.overallScore ?? 0)} size={68} strokeWidth={5} color="#60a5fa" label="AI Score" sublabel="/100" />
            </div>
            <div className="bg-white/6 border border-white/10 rounded-2xl py-4 flex flex-col items-center gap-1 backdrop-blur-sm">
              <ScoreRing value={Math.round(profile?.profileStrength ?? 0)} size={68} strokeWidth={5} color="#34d399" label="Profile" sublabel="%" />
            </div>
            <div className="bg-white/6 border border-white/10 rounded-2xl py-4 flex flex-col items-center gap-1 backdrop-blur-sm">
              <ScoreRing value={Math.round(profile?.commitmentScore ?? 0)} size={68} strokeWidth={5} color="#f97316" label="Commit" sublabel="/100" />
            </div>
          </motion.div>

          {/* XP Level bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }} className="mb-5">
            <div className="flex items-center justify-between text-[10px] font-bold text-white/50 mb-2">
              <div className="flex items-center gap-1.5">
                <Star className="w-3 h-3 text-[#fbbf24]" />
                <span><AnimatedNumber value={xpInLevel} /> / 1000 Points</span>
              </div>
              <span className="text-white/30">{1000 - xpInLevel} to Level {currentLevel + 1}</span>
            </div>
            <div className="h-2.5 bg-white/8 rounded-full overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelPct}%` }}
                transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
                className="h-full rounded-full relative overflow-hidden"
                style={{ background: "linear-gradient(90deg, #fbbf24, #f97316, #ec4899)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
              </motion.div>
            </div>
          </motion.div>

          {/* Streak + Stats inline */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/6 border border-white/10 rounded-xl px-3 py-2.5">
              <Flame className="w-4 h-4 text-[#fb923c] flex-shrink-0" />
              <div>
                <div className="text-white font-black text-sm leading-none">{profile?.streakCount ? `${profile.streakCount}d` : "—"}</div>
                <div className="text-[9px] text-white/40 font-bold uppercase tracking-wider mt-0.5">Streak</div>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 bg-white/6 border border-white/10 rounded-xl px-3 py-2.5">
              <TrendingUp className="w-4 h-4 text-[#86efac] flex-shrink-0" />
              <div>
                <div className="text-white font-black text-sm leading-none">
                  {xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp}
                </div>
                <div className="text-[9px] text-white/40 font-bold uppercase tracking-wider mt-0.5">Total XP</div>
              </div>
            </div>
            {myRank && (
              <div className="flex-1 flex items-center gap-2 bg-white/6 border border-white/10 rounded-xl px-3 py-2.5">
                <Trophy className="w-4 h-4 text-[#fbbf24] flex-shrink-0" />
                <div>
                  <div className="text-white font-black text-sm leading-none">#{myRank}</div>
                  <div className="text-[9px] text-white/40 font-bold uppercase tracking-wider mt-0.5">Rank</div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Skill chips */}
          {topSkills.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex gap-1.5 mt-3 flex-wrap">
              {topSkills.map(([skill]) => (
                <span key={skill} className="text-[10px] font-bold bg-white/8 text-white/70 px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1">
                  <GitBranch className="w-2.5 h-2.5 text-[#60a5fa]" /> {skill}
                </span>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">

        {/* ── Drive Check — feature card ────────────────────────── */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setLocation("/drive-check")}
          className="w-full relative overflow-hidden rounded-2xl text-left group"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)" }}
        >
          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity bg-white/5" />
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#4f46e5]/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-[#f97316]/15 blur-2xl pointer-events-none" />
          <div className="relative z-10 p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 backdrop-blur flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <ShieldCheck className="w-5.5 h-5.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-black text-white text-sm">Drive Check</p>
                <span className="text-[8px] font-black bg-[#f97316] text-white px-2 py-0.5 rounded-full tracking-wide">NEW</span>
              </div>
              <p className="text-[11px] text-white/60 leading-snug">Paste any Telegram drive → instant scam + eligibility check</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4 text-white/80" />
            </div>
          </div>
        </motion.button>

        {/* ── Pending invites alert ─────────────────────────────── */}
        {pendingInvites.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation("/inbox")}
            className="w-full bg-gradient-to-r from-[#eef2ff] to-[#ecfeff] border border-[#c7d2fe] rounded-2xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center shrink-0 shadow-[0_4px_16px_rgba(79,70,229,0.35)]">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-[#0f172a] text-sm">{pendingInvites.length} recruiter{pendingInvites.length > 1 ? "s are" : " is"} interested!</p>
              <p className="text-xs text-[#64748b] mt-0.5">Tap to view and respond</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4f46e5] animate-pulse" />
              <ChevronRight className="w-4 h-4 text-[#4f46e5]" />
            </div>
          </motion.button>
        )}

        {/* ── Resume course card ────────────────────────────────── */}
        {resume && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={resumeCourse}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-[#f0f4ff] text-left group"
          >
            <div className="relative w-14 h-14 shrink-0">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle cx="28" cy="28" r="22" fill="none" stroke={resume.domainColor || "#4f46e5"} strokeWidth="4"
                  strokeDasharray={`${(resume.pct / 100) * 138.2} 138.2`} strokeLinecap="round"
                  transform="rotate(-90 28 28)" style={{ transition: "stroke-dasharray 0.8s ease", filter: `drop-shadow(0 0 4px ${resume.domainColor || "#4f46e5"}60)` }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xl">{resume.domainEmoji || "📚"}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#94a3b8]">Continue Course</p>
                {resume.openedAt && <span className="text-[9px] text-[#cbd5e1] font-bold">· {timeAgo(resume.openedAt)}</span>}
              </div>
              <p className="font-black text-[#0f172a] text-sm truncate">{resume.subDomainName}</p>
              <p className="text-[11px] font-bold text-[#64748b] truncate">
                {resume.domainName}
                {resume.total > 0 && <span className="text-[#94a3b8]"> · {resume.completed}/{resume.total} lessons</span>}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform"
              style={{ background: resume.domainColor || "#4f46e5" }}>
              <PlayCircle className="w-5 h-5" />
            </div>
          </motion.button>
        )}

        {/* ── Profile nudge (shown once after signup) ───────────── */}
        {showNudge && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-white border border-[#e2e8f0] rounded-2xl p-4 mb-1"
          >
            <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-[#f97316]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-[#0f172a]">Complete your profile</p>
              <p className="text-[11px] text-[#64748b]">Add GitHub, bio & projects to get recruiter visibility</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setLocation("/profile")}
                className="text-[12px] font-bold text-[#4f46e5] hover:underline"
              >
                Go
              </button>
              <button
                onClick={() => { setShowNudge(false); localStorage.removeItem("newUser"); }}
                className="text-[11px] text-[#94a3b8] hover:text-[#64748b] px-1"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Categories grid ───────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-[#0f172a] text-[13px] flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#4f46e5] flex items-center justify-center">
                <Target className="w-3 h-3 text-white" />
              </div>
              Quick Access
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat, i) => {
              const Icon = cat.icon;
              const count = cat.id === "leaderboard"
                ? (myRank ? `#${myRank} College` : "View Rankings")
                : cat.count;
              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.06 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setLocation(cat.href)}
                  className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#f0f4ff] hover:border-transparent hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" style={{ background: `linear-gradient(135deg, ${cat.glow}06, ${cat.glow}12)` }} />
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] shrink-0 relative z-10`}
                    style={{ boxShadow: `0 4px 16px ${cat.glow}40` }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1 relative z-10">
                    <p className="font-black text-[#0f172a] text-[13px] leading-tight truncate">{cat.label}</p>
                    <p className="text-[10px] font-bold text-[#94a3b8] mt-0.5 truncate">{count}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#d1d5db] group-hover:text-[#94a3b8] transition-colors relative z-10 shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Profile Strength CTA ──────────────────────────────── */}
        {profile && profile.profileStrength < 80 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation("/chat")}
            className="w-full relative overflow-hidden rounded-2xl text-left"
            style={{ background: "linear-gradient(135deg, #f0fdf4, #ecfeff)" }}
          >
            <div className="border border-[#86efac]/50 rounded-2xl p-4 flex items-center gap-4">
              <div className="relative w-14 h-14 shrink-0">
                <svg width="56" height="56" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="18" fill="none" stroke="#e0e7ff" strokeWidth="4" />
                  <circle cx="24" cy="24" r="18" fill="none" stroke="#10b981" strokeWidth="4"
                    strokeDasharray={`${(profile.profileStrength / 100) * 113} 113`} strokeLinecap="round"
                    transform="rotate(-90 24 24)" style={{ filter: "drop-shadow(0 0 4px #10b98160)" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-black text-[#10b981]">{profile.profileStrength}%</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-black text-[#0f172a] text-sm">Complete Your Profile</p>
                <p className="text-[11px] text-[#64748b] mt-0.5 leading-snug">{100 - profile.profileStrength}% left — stand out to recruiters</p>
              </div>
              <div className="flex items-center gap-1 bg-[#10b981]/10 rounded-xl px-2.5 py-1.5 border border-[#86efac]/50">
                <Sparkles className="w-3.5 h-3.5 text-[#10b981]" />
                <span className="text-[10px] font-black text-[#10b981]">AI Help</span>
              </div>
            </div>
          </motion.button>
        )}

        {/* ── My Projects ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#fce7f3]/80"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-[#0f172a] text-[13px] flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#ec4899] to-[#db2777] flex items-center justify-center">
                <Code2 className="w-3 h-3 text-white" />
              </div>
              My Projects
            </h2>
            <button onClick={() => setLocation("/profile")} className="text-[11px] font-bold text-[#ec4899] hover:text-[#db2777]">View all</button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setLocation("/profile?addProject=1")}
              className="rounded-xl p-3.5 text-left shadow-[0_4px_16px_rgba(236,72,153,0.25)] relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #ec4899, #db2777)" }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 blur-xl" />
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-2.5">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <p className="text-[12px] font-black text-white leading-tight">Add a project</p>
              <p className="text-[10px] text-white/70 mt-0.5">Recruiters love proof of work</p>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setLocation("/opportunities/course")}
              className="rounded-xl p-3.5 text-left bg-[#fdf2f8] border border-[#fce7f3]"
            >
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2.5 shadow-sm">
                <BookOpen className="w-4 h-4 text-[#ec4899]" />
              </div>
              <p className="text-[12px] font-black text-[#0f172a] leading-tight">Build from course</p>
              <p className="text-[10px] text-[#94a3b8] mt-0.5">Tech stack auto-filled</p>
            </motion.button>
          </div>
        </motion.div>

        {/* ── Recruiter Activity ────────────────────────────────── */}
        {invites.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-[#0f172a] text-[13px] flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#4f46e5] flex items-center justify-center">
                  <Mail className="w-3 h-3 text-white" />
                </div>
                Recruiter Activity
              </h2>
              <button onClick={() => setLocation("/inbox")} className="text-[11px] font-bold text-[#4f46e5]">View all</button>
            </div>
            <div className="space-y-2">
              {invites.slice(0, 3).map((inv, i) => (
                <motion.button
                  key={inv.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setLocation("/inbox")}
                  className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#f0f4ff] text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm shadow-sm" style={{ background: "#eef2ff", color: "#4f46e5" }}>
                    {inv.companyName?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[#0f172a] text-xs truncate">{inv.companyName}</p>
                    <p className="text-[11px] text-[#94a3b8] truncate">{inv.recruiterName}</p>
                  </div>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${
                    inv.status === "accepted" ? "bg-[#d1fae5] text-[#10b981]"
                    : inv.status === "declined" ? "bg-[#fee2e2] text-[#ef4444]"
                    : "bg-[#e0e7ff] text-[#4f46e5]"
                  }`}>{inv.status.toUpperCase()}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#f0f4ff]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#eef2ff] to-[#ecfeff] flex items-center justify-center border border-[#e0e7ff] shrink-0">
                <Cpu className="w-6 h-6 text-[#4f46e5]" />
              </div>
              <div className="flex-1">
                <p className="font-black text-[#0f172a] text-sm">Get Discovered</p>
                <p className="text-xs text-[#94a3b8] mt-0.5 leading-snug">Complete your profile and recruiters will start viewing you</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setLocation("/chat")}
              className="mt-3 w-full bg-[#4f46e5] text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(79,70,229,0.3)]"
            >
              <Sparkles className="w-3.5 h-3.5" /> Build Profile with AI
            </motion.button>
          </motion.div>
        )}

        {/* ── XP Activity Feed ─────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md bg-[#0f172a] flex items-center justify-center">
              <Clock className="w-3 h-3 text-white" />
            </div>
            <h2 className="font-black text-[#0f172a] text-[13px]">Activity Feed</h2>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#f1f5f9]">
            {activityLog.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#f8fafc] border border-[#f0f4ff] flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#cbd5e1]" />
                </div>
                <p className="font-bold text-[#94a3b8] text-xs text-center">No activity yet</p>
                <p className="text-[11px] text-[#cbd5e1] text-center leading-snug">Check in daily or complete a quest to earn Points</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-[#e2e8f0] via-[#e2e8f0] to-transparent" />
                <div className="space-y-3.5">
                  {activityLog.map((entry, i) => {
                    const meta = getActionMeta(entry.action);
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 relative"
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm z-10 shadow-sm"
                          style={{ background: meta.color + "18", border: `1.5px solid ${meta.color}30` }}>
                          {meta.emoji}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-[12px] font-bold text-[#0f172a] leading-tight">{entry.description}</p>
                          <p className="text-[10px] text-[#94a3b8] font-medium mt-0.5">{formatRelativeTime(entry.createdAt)}</p>
                        </div>
                        {entry.xpAmount > 0 && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 mt-0.5 border"
                            style={{ color: meta.color, background: meta.color + "10", borderColor: meta.color + "30" }}>
                            +{entry.xpAmount} XP
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer nudge ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center pt-2 pb-2"
        >
          <p className="text-[10px] text-[#cbd5e1] font-medium">KodeTalent · AI Career Companion for Engineers</p>
        </motion.div>

      </div>
    </div>
  );
}
