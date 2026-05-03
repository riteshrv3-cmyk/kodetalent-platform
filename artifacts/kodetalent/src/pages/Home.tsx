import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Briefcase, Trophy, FileText, Flame, Star,
  ChevronRight, Zap, BookOpen, TrendingUp, Mail,
  Target, Users
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
    gradient: "from-[#7c3aed] to-[#6d28d9]",
    bg: "#ede9fe",
    count: "200+ Jobs",
  },
  {
    id: "leaderboard",
    label: "Leaderboard",
    icon: Trophy,
    href: "/leaderboard",
    gradient: "from-[#f59e0b] to-[#d97706]",
    bg: "#fef3c7",
    count: "Your Rank",
  },
  {
    id: "resume",
    label: "Resume",
    icon: FileText,
    href: "/resume",
    gradient: "from-[#10b981] to-[#059669]",
    bg: "#d1fae5",
    count: "AI Builder",
  },
  {
    id: "practice",
    label: "Practice",
    icon: Zap,
    href: "/practice",
    gradient: "from-[#06b6d4] to-[#0891b2]",
    bg: "#cffafe",
    count: "Mock Tests",
  },
  {
    id: "courses",
    label: "Courses",
    icon: BookOpen,
    href: "/opportunities/course",
    gradient: "from-[#f97316] to-[#ea580c]",
    bg: "#ffedd5",
    count: "Level Up",
  },
  {
    id: "score",
    label: "AI Score",
    icon: TrendingUp,
    href: "/profile",
    gradient: "from-[#ec4899] to-[#db2777]",
    bg: "#fce7f3",
    count: "Track Growth",
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) {
      setLocation("/");
      return;
    }

    Promise.all([
      fetch(`${BASE}/api/students/${id}/full-profile`).then((r) => r.json()),
      fetch(`${BASE}/api/recruiter-invites?studentId=${id}`).then((r) => r.json()).catch(() => []),
    ]).then(([prof, inv]) => {
      setProfile(prof);
      setInvites(Array.isArray(inv) ? inv : []);
    }).finally(() => setLoading(false));
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
        <div className="w-8 h-8 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-6 space-y-4 min-h-screen bg-[#f5f3ff]">

      {/* Score Banner */}
      <div className="bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#4f46e5] px-5 pt-5 pb-6 text-white">
        <p className="text-white/70 text-sm font-medium">{greeting},</p>
        <h1 className="text-2xl font-black mt-0.5">{firstName} 👋</h1>
        <p className="text-white/60 text-xs mt-0.5">{profile?.college}</p>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-white/80" />
            </div>
            <p className="text-xl font-black">{Math.round(profile?.overallScore ?? 0)}</p>
            <p className="text-[10px] text-white/60 font-bold uppercase mt-0.5">AI Score</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="w-3.5 h-3.5 text-[#fb923c]" />
            </div>
            <p className="text-xl font-black">{profile?.streakCount ?? 0}</p>
            <p className="text-[10px] text-white/60 font-bold uppercase mt-0.5">Day Streak</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-3.5 h-3.5 text-[#fbbf24]" />
            </div>
            <p className="text-xl font-black">
              {profile ? (profile.xp >= 1000 ? `${(profile.xp / 1000).toFixed(1)}k` : profile.xp) : 0}
            </p>
            <p className="text-[10px] text-white/60 font-bold uppercase mt-0.5">XP Earned</p>
          </div>
        </div>

        {topSkills.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {topSkills.map(([skill]) => (
              <span key={skill} className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-full">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recruiter Interest Alert */}
      {pendingInvites.length > 0 && (
        <div className="px-4">
          <motion.button
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setLocation("/inbox")}
            className="w-full bg-gradient-to-r from-[#7c3aed]/10 to-[#06b6d4]/10 border border-[#7c3aed]/20 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] flex items-center justify-center shrink-0 shadow-md shadow-[#7c3aed]/25">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-[#1e1b4b] text-sm">
                {pendingInvites.length} recruiter{pendingInvites.length > 1 ? "s are" : " is"} interested!
              </p>
              <p className="text-xs text-[#6b7280] mt-0.5">Tap to view and respond</p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#7c3aed] animate-pulse" />
              <ChevronRight className="w-4 h-4 text-[#7c3aed]" />
            </div>
          </motion.button>
        </div>
      )}

      {/* Categories Grid */}
      <div className="px-4">
        <h2 className="font-black text-[#1e1b4b] text-sm mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#7c3aed]" />
          Quick Access
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setLocation(cat.href)}
                className="bg-white rounded-2xl p-3.5 flex flex-col items-center gap-2 shadow-sm border border-white hover:shadow-md transition-shadow active:shadow-sm"
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-sm`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="font-black text-[#1e1b4b] text-[11px] text-center leading-tight">{cat.label}</span>
                <span className="text-[9px] font-bold text-[#9ca3af] text-center">{cat.count}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Profile Strength CTA */}
      {profile && profile.profileStrength < 80 && (
        <div className="px-4">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setLocation("/chat")}
            className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 border border-[#ede9fe] active:scale-[0.98] transition-transform"
          >
            <div className="relative w-12 h-12 shrink-0">
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="18" fill="none" stroke="#ede9fe" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="18"
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="4"
                  strokeDasharray={`${(profile.profileStrength / 100) * 113} 113`}
                  strokeLinecap="round"
                  transform="rotate(-90 24 24)"
                />
                <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="900" fill="#7c3aed">{profile.profileStrength}%</text>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-[#1e1b4b] text-sm">Boost Your Profile</p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                {100 - profile.profileStrength}% left to stand out to recruiters
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black text-[#7c3aed]">AI Help</span>
              <ChevronRight className="w-4 h-4 text-[#7c3aed]" />
            </div>
          </motion.button>
        </div>
      )}

      {/* Recent invites */}
      {invites.length > 0 && (
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-[#1e1b4b] text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#7c3aed]" />
              Recruiter Activity
            </h2>
            <button onClick={() => setLocation("/inbox")} className="text-[11px] font-bold text-[#7c3aed]">
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
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed]/10 to-[#4f46e5]/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-[#7c3aed]">
                    {inv.companyName?.[0] ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[#1e1b4b] text-xs truncate">{inv.companyName}</p>
                  <p className="text-[11px] text-[#6b7280] truncate">{inv.recruiterName}</p>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                  inv.status === "accepted" ? "bg-[#d1fae5] text-[#10b981]"
                  : inv.status === "declined" ? "bg-[#fee2e2] text-[#ef4444]"
                  : "bg-[#ede9fe] text-[#7c3aed]"
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
            <div className="w-12 h-12 rounded-2xl bg-[#ede9fe] flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6 text-[#7c3aed]" />
            </div>
            <p className="font-black text-[#1e1b4b] text-sm">No recruiter activity yet</p>
            <p className="text-xs text-[#6b7280] mt-1 mb-3">Complete your profile to start getting noticed</p>
            <button
              onClick={() => setLocation("/chat")}
              className="bg-[#7c3aed] text-white font-bold text-xs px-4 py-2 rounded-xl"
            >
              Build Profile with AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
