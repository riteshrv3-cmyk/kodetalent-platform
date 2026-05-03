import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Play, Flame, Star, ChevronRight, Trophy, Mail, Github, FileText, Award, Zap, TrendingUp, CheckCircle } from "lucide-react";
import { useGetStudentDashboard, getGetStudentDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Invite {
  id: number;
  recruiterCompany: string;
  role?: string;
  status: string;
  studentSeen: boolean;
  createdAt: string;
}

interface FullProfile {
  githubUrl?: string;
  linkedinUrl?: string;
  bio?: string;
  projects: unknown[];
  certifications: unknown[];
  profileStrength: number;
  skills: Record<string, number>;
}

function getPowerUps(profile: FullProfile | null) {
  if (!profile) return [];
  const items = [];
  if (!profile.githubUrl) items.push({ label: "Link your GitHub", sub: "Unlock GitHub analysis (+20 pts)", href: "/profile", icon: Github, color: "#1e1b4b" });
  if (!profile.bio) items.push({ label: "Write your bio", sub: "Tell recruiters who you are (+8 pts)", href: "/profile", icon: FileText, color: "#7c3aed" });
  if ((profile.projects || []).length === 0) items.push({ label: "Add a project", sub: "Show what you've built (+15 pts)", href: "/profile", icon: Zap, color: "#f97316" });
  if ((profile.certifications || []).length === 0) items.push({ label: "Add a certification", sub: "Validate your skills (+10 pts)", href: "/profile", icon: Award, color: "#06b6d4" });
  if (!profile.linkedinUrl) items.push({ label: "Link LinkedIn", sub: "Get LinkedIn score analysis (+10 pts)", href: "/profile", icon: TrendingUp, color: "#0077b5" });
  return items.slice(0, 3);
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) { setLocation("/"); return; }
    setStudentId(parseInt(id, 10));
    const today = new Date().toDateString();
    setCheckedIn(localStorage.getItem("checkin_" + id) === today);
  }, [setLocation]);

  const { data, isLoading } = useGetStudentDashboard(studentId as number, {
    query: {
      enabled: !!studentId,
      queryKey: getGetStudentDashboardQueryKey(studentId as number),
    }
  });

  useEffect(() => {
    if (!studentId) return;
    fetch(`${BASE}/api/students/${studentId}/invites`)
      .then(r => r.json())
      .then((d: Invite[]) => setInvites(d))
      .catch(() => {});
    fetch(`${BASE}/api/students/${studentId}/full-profile`)
      .then(r => r.json())
      .then((d: FullProfile) => setProfile(d))
      .catch(() => {});
  }, [studentId]);

  async function handleCheckIn() {
    if (!studentId || checkedIn) return;
    const today = new Date().toDateString();
    localStorage.setItem("checkin_" + studentId, today);
    setCheckedIn(true);
    // award XP via patch
    const s = data?.student;
    if (s) {
      await fetch(`${BASE}/api/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streakCount: (s.streakCount || 0) + 1, xp: (s.xp || 0) + 50 }),
      });
    }
  }

  if (isLoading || !data) {
    return (
      <div className="p-4 space-y-4 bg-[#f5f3ff] min-h-screen">
        <Skeleton className="h-10 w-44 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  const { student, todayQuest, collegeRank } = data;
  const pendingInvites = invites.filter(i => i.status === "pending");
  const powerUps = getPowerUps(profile);
  const topSkills = Object.entries(profile?.skills || {}).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 4);

  return (
    <div className="p-4 space-y-4 pb-28 min-h-screen bg-[#f5f3ff]">
      {/* Header */}
      <header className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e1b4b]">Hey {student.name.split(" ")[0]} 👋</h1>
          <p className="text-sm font-medium text-[#6b7280] mt-0.5">{student.college}</p>
        </div>
        {/* Check-in button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCheckIn}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl text-xs font-bold transition-all ${
            checkedIn
              ? "bg-[#ecfdf5] text-[#10b981] border-2 border-[#10b981]/30"
              : "bg-gradient-to-br from-[#f97316] to-[#ec4899] text-white shadow-lg shadow-orange-200"
          }`}
        >
          {checkedIn ? <><CheckCircle className="w-5 h-5 mb-0.5" /><span className="text-[9px]">Done!</span></> : <><Flame className="w-5 h-5 mb-0.5" /><span className="text-[9px]">Check in</span></>}
        </motion.button>
      </header>

      {/* ── Recruiter Interest ── */}
      {pendingInvites.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
        >
          <Link href="/inbox">
            <Card className="border-0 rounded-2xl overflow-hidden cursor-pointer" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#f59e0b] rounded-full text-white text-[10px] font-black flex items-center justify-center animate-bounce">
                        {pendingInvites.length}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-extrabold text-[15px] leading-tight">
                        {pendingInvites.length === 1 ? "1 recruiter wants you!" : `${pendingInvites.length} recruiters are interested!`}
                      </p>
                      <p className="text-white/70 text-xs font-medium mt-0.5">
                        {pendingInvites[0].recruiterCompany}{pendingInvites.length > 1 ? ` + ${pendingInvites.length - 1} more` : ""} · Tap to respond
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/60" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* ── Streak + XP ── */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div whileHover={{ y: -2 }}>
          <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl text-white" style={{ background: "linear-gradient(135deg, #f97316, #ec4899)" }}>
            <CardContent className="p-5 relative overflow-hidden">
              <Flame className="w-10 h-10 absolute -right-1 -bottom-1 text-white/20" />
              <p className="text-xs font-bold text-white/80 mb-1">Day Streak</p>
              <p className="text-3xl font-extrabold">🔥 {student.streakCount}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -2 }}>
          <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl text-white" style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}>
            <CardContent className="p-5 relative overflow-hidden">
              <Star className="w-10 h-10 absolute -right-1 -bottom-1 text-white/20" />
              <p className="text-xs font-bold text-white/80 mb-1">Points ⭐</p>
              <p className="text-3xl font-extrabold">{student.xp.toLocaleString()}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Today's Goal ── */}
      {todayQuest && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ y: -2 }}>
          <Card className="border-0 border-l-4 border-l-primary shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl bg-white">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-base font-bold text-[#1e1b4b]">Today's Goal</h2>
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-[#06b6d4] bg-[#06b6d4]/10 px-2 py-1 rounded-full">~{todayQuest.minutes}m</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">+{todayQuest.xpReward} pts</span>
                </div>
              </div>
              <p className="text-sm font-medium text-[#6b7280] mb-4">{todayQuest.title}</p>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button className="w-full bg-primary hover:bg-[#6d28d9] text-white font-bold h-11 rounded-full" asChild>
                  <Link href="/roadmap">
                    Start <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Score + Rank ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileHover={{ y: -2 }}>
        <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.15)] rounded-2xl text-white" style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-base flex items-center">
                <Trophy className="w-4 h-4 mr-2" /> Your Score
              </h3>
              <span className="text-3xl font-extrabold">{Math.round(student.overallScore)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white/90">Top {collegeRank.percentile}% in {student.college.split(" ")[0]}</span>
              <Link href="/leaderboard" className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors flex items-center">
                See rank <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Top Skills ── */}
      {topSkills.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-[0_4px_20px_rgba(124,58,237,0.07)] rounded-2xl bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[#1e1b4b] text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#f59e0b]" /> Top Skills
                </h3>
                <Link href="/profile" className="text-xs font-bold text-[#7c3aed]">View all →</Link>
              </div>
              <div className="space-y-2">
                {topSkills.map(([name, value]) => {
                  const pct = Math.min(value as number, 100);
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#6b7280] w-24 truncate">{name}</span>
                      <div className="flex-1 bg-[#f3f0ff] rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#4f46e5]"
                        />
                      </div>
                      <span className="text-xs font-extrabold text-[#7c3aed] w-6 text-right">{pct}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Profile Power-Ups ── */}
      {powerUps.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-0 shadow-[0_4px_20px_rgba(124,58,237,0.07)] rounded-2xl bg-white">
            <CardContent className="p-5">
              <h3 className="font-bold text-[#1e1b4b] text-sm mb-3 flex items-center gap-2">
                <Play className="w-4 h-4 text-[#7c3aed]" /> Profile Power-Ups
              </h3>
              <div className="space-y-2">
                {powerUps.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.div key={i} whileTap={{ scale: 0.98 }}>
                      <Link href={item.href as string}>
                        <div className="flex items-center gap-3 bg-[#f8f7ff] hover:bg-[#f3f0ff] rounded-xl p-3 transition-colors cursor-pointer">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: item.color + "18" }}>
                            <Icon className="w-4.5 h-4.5" style={{ color: item.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#1e1b4b] leading-tight">{item.label}</p>
                            <p className="text-xs text-[#9ca3af] font-medium">{item.sub}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#c4b5fd] shrink-0" />
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
