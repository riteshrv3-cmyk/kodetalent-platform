import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Briefcase, Trophy, FileText, Flame, Star,
  ChevronRight, Zap, BookOpen, TrendingUp, Mail,
  Target, Users, ShieldCheck, PlayCircle, Code2, Plus, Sparkles, Clock
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

const categories = [
  {
    id: "opportunities",
    label: "Opportunities",
    icon: Briefcase,
    href: "/opportunities",
    gradient: "from-[#4f46e5] to-[#3730a3]",
    bg: "#eef2ff",
    count: "200+ Jobs",
  },
  {
    id: "leaderboard",
    label: "Leaderboard",
    icon: Trophy,
    href: "/leaderboard",
    gradient: "from-[#f59e0b] to-[#d97706]",
    bg: "#fffbeb",
    count: "Your Rank",
  },
  {
    id: "resume",
    label: "Resume",
    icon: FileText,
    href: "/resume",
    gradient: "from-[#10b981] to-[#059669]",
    bg: "#ecfdf5",
    count: "AI Builder",
  },
  {
    id: "practice",
    label: "Practice",
    icon: Zap,
    href: "/practice",
    gradient: "from-[#0ea5e9] to-[#0891b2]",
    bg: "#ecfeff",
    count: "Mock Tests",
  },
  {
    id: "courses",
    label: "Courses",
    icon: BookOpen,
    href: "/opportunities/course",
    gradient: "from-[#f97316] to-[#ea580c]",
    bg: "#fff7ed",
    count: "Level Up",
  },
  {
    id: "projects",
    label: "Projects",
    icon: Code2,
    href: "/profile?addProject=1",
    gradient: "from-[#ec4899] to-[#db2777]",
    bg: "#fdf2f8",
    count: "Show your work",
  },
];

interface ActivityEntry {
  id: number;
  action: string;
  description: string;
  xpAmount: number;
  createdAt: string;
}

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
        total = modules.reduce(
          (acc: number, m: { lessons?: unknown[] }) => acc + (Array.isArray(m.lessons) ? m.lessons.length : 0),
          0
        );
      } catch {/* ignore */}
    }

    const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    return { ...ctx, completed, total, pct };
  } catch {
    return null;
  }
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

export default function Home() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<ResumeCourse | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    setResume(loadResumeCourse());
  }, []);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 640);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const resumeCourse = () => {
    if (!resume) return;
    const { completed: _c, total: _t, pct: _p, openedAt: _o, ...ctx } = resume;
    void _c; void _t; void _p; void _o;
    sessionStorage.setItem("courseContext", JSON.stringify(ctx));
    setLocation("/opportunities/course");
  };

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) {
      setLocation("/");
      return;
    }

    let alive = true;

    fetch(`${BASE}/api/students/${id}/full-profile`)
      .then((r) => r.json())
      .then((prof) => {
        if (alive) setProfile(prof);
      })
      .catch(() => null);

    fetch(`${BASE}/api/students/${id}/invites`)
      .then((r) => r.json())
      .then((inv) => {
        if (alive) setInvites(Array.isArray(inv) ? inv : []);
      })
      .catch(() => alive && setInvites([]));

    fetch(`${BASE}/api/students/${id}/activity-log?limit=10`)
      .then((r) => r.json())
      .then((log) => {
        if (alive) setActivityLog(Array.isArray(log) ? log : []);
      })
      .catch(() => alive && setActivityLog([]))
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [setLocation]);

  const pendingInvites = invites.filter((i) => i.status === "pending" && !i.studentSeen);
  const firstName = profile?.name?.split(" ")[0] ?? "there";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const topSkills = Object.entries(profile?.skills ?? {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentLevel = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpInLevel = xp % 1000;
  const levelPct = Math.min(100, Math.round((xpInLevel / 1000) * 100));

  return (
    <div className="pb-6 space-y-5 min-h-screen bg-[#f8fafc]">

      {/* Score Banner — premium hero */}
      <div className="relative bg-gradient-to-br from-[#1e1b4b] via-[#3730a3] to-[#4f46e5] px-5 pt-6 pb-7 text-white overflow-hidden rounded-b-[32px] shadow-[0_8px_32px_rgba(79,70,229,0.25)]">
        {/* Decorative orbs */}
        {!isMobile && (
          <>
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#f97316]/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[#0ea5e9]/15 blur-3xl pointer-events-none" />
          </>
        )}

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-white/70 text-sm font-medium">{greeting},</p>
              <h1 className="text-2xl font-black mt-0.5">{firstName} 👋</h1>
              <p className="text-white/60 text-xs mt-0.5 truncate max-w-[220px]">{profile?.college}</p>
            </div>
            <div className="flex flex-col items-center bg-white/15 rounded-2xl px-3 py-2 border border-white/10">
              <span className="text-[9px] font-black text-white/70 uppercase tracking-wider">Level</span>
              <span className="text-2xl font-black leading-none mt-0.5 bg-gradient-to-br from-white to-[#fbbf24] bg-clip-text text-transparent">
                {currentLevel}
              </span>
            </div>
          </div>

          {/* Level progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] font-bold text-white/70 mb-1.5">
              <span>{xpInLevel} / 1000 XP</span>
              <span>{1000 - xpInLevel} XP to Lv {currentLevel + 1}</span>
            </div>
            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#fbbf24] via-[#f97316] to-[#ec4899] rounded-full shadow-[0_0_12px_rgba(251,191,36,0.5)]"
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            <div className="bg-white/12 rounded-2xl px-2 py-3 text-center border border-white/10">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#86efac]" />
                <p className="text-[9px] text-white/70 font-black uppercase tracking-wider">AI Score</p>
              </div>
              <p className="text-xl font-black">{Math.round(profile?.overallScore ?? 0)}</p>
            </div>
            <div className="bg-white/12 rounded-2xl px-2 py-3 text-center border border-white/10">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-3.5 h-3.5 text-[#fb923c]" />
                <p className="text-[9px] text-white/70 font-black uppercase tracking-wider">Streak</p>
              </div>
              <p className="text-xl font-black">{profile?.streakCount ? `${profile.streakCount}` : "—"}</p>
            </div>
            <div className="bg-white/12 rounded-2xl px-2 py-3 text-center border border-white/10">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-3.5 h-3.5 text-[#fbbf24]" />
                <p className="text-[9px] text-white/70 font-black uppercase tracking-wider">XP</p>
              </div>
              <p className="text-xl font-black">
                {profile ? (profile.xp >= 1000 ? `${(profile.xp / 1000).toFixed(1)}k` : profile.xp) : 0}
              </p>
            </div>
          </div>

          {topSkills.length > 0 && (
            <div className="flex gap-1.5 mt-3.5 flex-wrap">
              {topSkills.map(([skill]) => (
                <span key={skill} className="text-[10px] font-bold bg-white/15 text-white px-2.5 py-1 rounded-full border border-white/10">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drive Check — hero feature */}
      <div className="px-4">
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setLocation("/drive-check")}
          className="w-full bg-gradient-to-br from-[#0f172a] via-[#3730a3] to-[#4f46e5] rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-[#4f46e5]/20 active:scale-[0.98] transition-transform text-left relative overflow-hidden"
        >
          {!isMobile && <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl" />}
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 relative z-10">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <div className="flex items-center gap-1.5">
              <p className="font-black text-white text-sm">Drive Check</p>
              <span className="text-[8px] font-black bg-[#f59e0b] text-[#0f172a] px-1.5 py-0.5 rounded-full">NEW</span>
            </div>
            <p className="text-[11px] text-white/75 mt-0.5 leading-tight">
              Paste any Telegram drive → instant scam + eligibility check
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/80 relative z-10 shrink-0" />
        </motion.button>
      </div>

      {/* Resume Course — last opened course with progress ring */}
      {resume && (
        <div className="px-4">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={resumeCourse}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-[#e2e8f0] active:scale-[0.98] transition-transform text-left"
            data-testid="card-resume-course"
          >
            <div className="relative w-14 h-14 shrink-0">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle
                  cx="28" cy="28" r="24"
                  fill="none"
                  stroke={resume.domainColor || "#4f46e5"}
                  strokeWidth="4"
                  strokeDasharray={`${(resume.pct / 100) * 150.8} 150.8`}
                  strokeLinecap="round"
                  transform="rotate(-90 28 28)"
                  style={{ transition: "stroke-dasharray 0.6s ease" }}
                />
              </svg>
              <div
                className="absolute inset-0 flex items-center justify-center text-xl"
                aria-hidden
              >
                {resume.domainEmoji || "📚"}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-[#94a3b8]">Resume Course</p>
                {resume.openedAt && (
                  <span className="text-[9px] font-bold text-[#cbd5e1]">· {timeAgo(resume.openedAt)}</span>
                )}
              </div>
              <p className="font-black text-[#0f172a] text-sm truncate">{resume.subDomainName}</p>
              <p className="text-[11px] font-bold text-[#64748b] truncate">
                {resume.domainName}
                {resume.total > 0 && (
                  <span className="text-[#94a3b8]"> · {resume.completed}/{resume.total} lessons</span>
                )}
              </p>
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white"
              style={{ background: resume.domainColor || "#4f46e5" }}
            >
              <PlayCircle className="w-5 h-5" />
            </div>
          </motion.button>
        </div>
      )}

      {/* Recruiter Interest Alert */}
      {pendingInvites.length > 0 && (
        <div className="px-4">
          <motion.button
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setLocation("/inbox")}
            className="w-full bg-gradient-to-r from-[#4f46e5]/10 to-[#0ea5e9]/10 border border-[#4f46e5]/20 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center shrink-0 shadow-md shadow-[#4f46e5]/25">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-[#0f172a] text-sm">
                {pendingInvites.length} recruiter{pendingInvites.length > 1 ? "s are" : " is"} interested!
              </p>
              <p className="text-xs text-[#64748b] mt-0.5">Tap to view and respond</p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#4f46e5] animate-pulse" />
              <ChevronRight className="w-4 h-4 text-[#4f46e5]" />
            </div>
          </motion.button>
        </div>
      )}

      {/* Categories Grid */}
      <div className="px-4">
        <h2 className="font-black text-[#0f172a] text-sm mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#4f46e5]" />
          Quick Access
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setLocation(cat.href)}
                style={{ background: cat.bg }}
                className="rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-white/60 hover:shadow-md transition-all text-left motion-reduce:transition-none"
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-md shrink-0`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-[#0f172a] text-[13px] leading-tight truncate">{cat.label}</p>
                  <p className="text-[10px] font-bold text-[#64748b] mt-0.5 truncate">{cat.count}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── My Projects CTA ─────────────────────────────────────── */}
      <div className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-[#fce7f3]"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-[#0f172a] text-sm flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#ec4899]" />
              My Projects
            </h2>
            <button
              onClick={() => setLocation("/profile")}
              className="text-[11px] font-bold text-[#ec4899]"
              data-testid="home-projects-view-all"
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLocation("/profile?addProject=1")}
              data-testid="home-add-project"
              className="rounded-xl p-3 text-left bg-gradient-to-br from-[#ec4899] to-[#db2777] text-white shadow-md active:scale-[0.98] transition-transform"
            >
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-2">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <p className="text-[12px] font-black leading-tight">Add a project</p>
              <p className="text-[10px] text-white/80 mt-0.5">Recruiters love proof of work</p>
            </button>
            <button
              onClick={() => setLocation("/opportunities/course")}
              data-testid="home-projects-from-courses"
              className="rounded-xl p-3 text-left bg-[#fce7f3] active:scale-[0.98] transition-transform"
            >
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2">
                <BookOpen className="w-4 h-4 text-[#ec4899]" />
              </div>
              <p className="text-[12px] font-black text-[#0f172a] leading-tight">Build from a course</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Tech stack auto-filled</p>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Profile Strength CTA */}
      {profile && profile.profileStrength < 80 && (
        <div className="px-4">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setLocation("/chat")}
            className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 border border-[#e0e7ff] active:scale-[0.98] transition-transform"
          >
            <div className="relative w-12 h-12 shrink-0">
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="18" fill="none" stroke="#e0e7ff" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="18"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="4"
                  strokeDasharray={`${(profile.profileStrength / 100) * 113} 113`}
                  strokeLinecap="round"
                  transform="rotate(-90 24 24)"
                />
                <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="900" fill="#4f46e5">{profile.profileStrength}%</text>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-[#0f172a] text-sm">Boost Your Profile</p>
              <p className="text-xs text-[#64748b] mt-0.5">
                {100 - profile.profileStrength}% left to stand out to recruiters
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-[#4f46e5]" />
              <span className="text-[10px] font-black text-[#4f46e5]">AI Help</span>
              <ChevronRight className="w-4 h-4 text-[#4f46e5]" />
            </div>
          </motion.button>
        </div>
      )}

      {/* Recent invites */}
      {invites.length > 0 && (
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-[#0f172a] text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#4f46e5]" />
              Recruiter Activity
            </h2>
            <button onClick={() => setLocation("/inbox")} className="text-[11px] font-bold text-[#4f46e5]">
              View all
            </button>
          </div>
          <div className="space-y-2">
            {invites.slice(0, 3).map((inv) => (
              <button
                key={inv.id}
                onClick={() => setLocation("/inbox")}
                className="w-full bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4f46e5]/10 to-[#6366f1]/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-[#4f46e5]">
                    {inv.companyName?.[0] ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[#0f172a] text-xs truncate">{inv.companyName}</p>
                  <p className="text-[11px] text-[#64748b] truncate">{inv.recruiterName}</p>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                  inv.status === "accepted" ? "bg-[#d1fae5] text-[#10b981]"
                  : inv.status === "declined" ? "bg-[#fee2e2] text-[#ef4444]"
                  : "bg-[#e0e7ff] text-[#4f46e5]"
                }`}>
                  {inv.status.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for new users */}
      {invites.length === 0 && !loading && (
        <div className="px-4">
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#e0e7ff] flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6 text-[#4f46e5]" />
            </div>
            <p className="font-black text-[#0f172a] text-sm">No recruiter activity yet</p>
            <p className="text-xs text-[#64748b] mt-1 mb-3">Complete your profile to start getting noticed</p>
            <button
              onClick={() => setLocation("/chat")}
              className="bg-[#4f46e5] text-white font-bold text-xs px-4 py-2 rounded-xl"
            >
              Build Profile with AI
            </button>
          </div>
        </div>
      )}

      {/* XP Activity Log */}
      <div className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-[#f1f5f9]"
        >
          <h2 className="font-black text-[#0f172a] text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#4f46e5]" />
            XP Activity
          </h2>
          {activityLog.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-[#94a3b8] text-xs font-bold">No activity yet</p>
              <p className="text-[#cbd5e1] text-[11px] mt-1 leading-snug">
                Check in daily or complete a roadmap quest to earn XP
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[#f1f5f9]" />
              <div className="space-y-3">
                {activityLog.map((entry, i) => {
                  const meta = getActionMeta(entry.action);
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-2.5 relative"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm z-10"
                        style={{ background: meta.color + "15", border: `1.5px solid ${meta.color}30` }}
                      >
                        {meta.emoji}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[12px] font-bold text-[#0f172a] leading-tight truncate">{entry.description}</p>
                        <p className="text-[10px] text-[#94a3b8] font-medium mt-0.5">{formatRelativeTime(entry.createdAt)}</p>
                      </div>
                      {entry.xpAmount > 0 && (
                        <span
                          className="text-[11px] font-extrabold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                          style={{ color: meta.color, background: meta.color + "15" }}
                        >
                          +{entry.xpAmount} XP
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
