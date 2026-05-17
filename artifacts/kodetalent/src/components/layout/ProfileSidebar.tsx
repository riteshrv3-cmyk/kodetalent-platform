import { motion } from "framer-motion";
import { X, User, Github, Linkedin, Globe, Phone, Flame, Star, TrendingUp, BarChart2, Edit2, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface StudentProfile {
  id: number;
  name: string;
  college: string;
  field: string;
  year: number;
  bio: string;
  githubUrl: string;
  linkedinUrl: string;
  portfolioUrl: string;
  phone: string;
  profileStrength: number;
  overallScore: number;
  commitmentScore: number;
  xp: number;
  streakCount: number;
  level: number;
  openToWork: boolean;
  skills: Record<string, number>;
  projects: Array<{ title: string; description: string; techStack: string[] }>;
  certifications: Array<{ name: string; issuer: string }>;
}

function StrengthArc({ value }: { value: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ * 0.75;
  const gap = circ - dash;
  const color = value >= 80 ? "#10b981" : value >= 50 ? "#4f46e5" : "#f97316";

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e0e7ff" strokeWidth="8" strokeDasharray={`${circ * 0.75} ${circ}`} strokeDashoffset={circ * 0.125} strokeLinecap="round" transform="rotate(-135 50 50)" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${dash} ${gap + circ * 0.25}`} strokeDashoffset={circ * 0.125} strokeLinecap="round" transform="rotate(-135 50 50)" />
      <text x="50" y="47" textAnchor="middle" className="fill-[#0f172a]" fontSize="16" fontWeight="900">{value}</text>
      <text x="50" y="62" textAnchor="middle" className="fill-[#64748b]" fontSize="8">/ 100</text>
    </svg>
  );
}

export function ProfileSidebar({ onClose }: { onClose: () => void }) {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) return;
    fetch(`${BASE}/api/students/${id}/full-profile`)
      .then((r) => r.json())
      .then((d) => setProfile(d))
      .catch(() => null);
  }, []);

  const goToProfile = () => {
    onClose();
    setLocation("/profile");
  };

  const logout = () => {
    localStorage.removeItem("studentId");
    localStorage.removeItem("studentName");
    localStorage.removeItem("clerkUserId");
    onClose();
    setLocation("/");
  };

  const initials = profile
    ? profile.name.split(/\s+/).map((p) => p[0]).join("").substring(0, 2).toUpperCase()
    : "?";

  const GENERIC_SKILLS = new Set(["dsa","data structures","algorithms","problem solving","communication","teamwork","leadership","time management","critical thinking","git","linux","python","networking"]);
  const topSkills = Object.entries(profile?.skills ?? {})
    .filter(([name]) => !GENERIC_SKILLS.has(name.toLowerCase().trim()))
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
      />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-[51] w-[92%] max-w-sm bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ backfaceVisibility: "hidden", willChange: "transform" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#312e81] via-[#3730a3] to-[#4f46e5] px-5 pt-12 pb-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl font-black text-white">
                {initials}
              </div>
              {profile?.openToWork && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#10b981] border-2 border-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-lg leading-tight truncate">{profile?.name || "Loading..."}</h2>
              <p className="text-white/80 text-xs mt-0.5 truncate">{profile?.college}</p>
              <p className="text-white/60 text-[11px]">{profile?.field} · Year {profile?.year}</p>
            </div>
          </div>

          {profile?.openToWork && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-[#10b981]/20 border border-[#10b981]/40 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-[11px] font-bold text-[#10b981]">Open to Opportunities</span>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc]">

          {/* Score + Strength */}
          <div className="px-4 pt-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-black text-[#0f172a] text-sm mb-3">Profile Strength</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#f8fafc] rounded-xl p-2.5 text-center">
                      <p className="text-lg font-black text-[#4f46e5]">{profile ? Math.round(profile.overallScore) : "—"}</p>
                      <p className="text-[10px] text-[#64748b] font-bold uppercase">AI Score</p>
                    </div>
                    <div className="bg-[#f8fafc] rounded-xl p-2.5 text-center">
                      {profile?.githubUrl ? (
                        <>
                          <p className="text-lg font-black text-[#0ea5e9]">{profile?.commitmentScore ?? "—"}</p>
                          <p className="text-[10px] text-[#64748b] font-bold uppercase">Commitment</p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-black text-[#94a3b8]">—</p>
                          <p className="text-[10px] text-[#94a3b8] font-bold uppercase">Link GitHub</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <StrengthArc value={profile?.profileStrength ?? 0} />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="px-4 pt-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-around">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Flame className="w-4 h-4 text-[#f97316]" />
                    <span className="font-black text-[#0f172a] text-base">{profile?.streakCount ?? 0}</span>
                  </div>
                  <p className="text-[10px] text-[#64748b] font-bold uppercase">Day Streak</p>
                </div>
                <div className="w-px bg-[#f8fafc]" />
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-4 h-4 text-[#f59e0b]" />
                    <span className="font-black text-[#0f172a] text-base">{profile ? (profile.xp / 1000).toFixed(1) + "k" : "—"}</span>
                  </div>
                  <p className="text-[10px] text-[#64748b] font-bold uppercase">XP Earned</p>
                </div>
                <div className="w-px bg-[#f8fafc]" />
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="w-4 h-4 text-[#10b981]" />
                    <span className="font-black text-[#0f172a] text-base">Lv {profile?.level ?? 1}</span>
                  </div>
                  <p className="text-[10px] text-[#64748b] font-bold uppercase">Level</p>
                </div>
              </div>
            </div>
          </div>

          {/* Links */}
          {profile && (profile.githubUrl || profile.linkedinUrl || profile.portfolioUrl || profile.phone) && (
            <div className="px-4 pt-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2.5">
                {[
                  { icon: Github, value: profile.githubUrl, color: "#0f172a" },
                  { icon: Linkedin, value: profile.linkedinUrl, color: "#0077b5" },
                  { icon: Globe, value: profile.portfolioUrl, color: "#4f46e5" },
                  { icon: Phone, value: profile.phone, color: "#10b981" },
                ].filter(l => l.value).map(({ icon: Icon, value, color }, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                    <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold truncate flex-1" style={{ color }}>
                      {value.replace(/^https?:\/\/(www\.)?/, "")}
                      <ExternalLink className="w-2.5 h-2.5 inline-block ml-0.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {profile?.bio && (
            <div className="px-4 pt-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-black text-[#0f172a] text-sm mb-2">About</h3>
                <p className="text-xs text-[#64748b] leading-relaxed">{profile.bio}</p>
              </div>
            </div>
          )}

          {/* Top skills */}
          {topSkills.length > 0 && (
            <div className="px-4 pt-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className="w-4 h-4 text-[#4f46e5]" />
                  <h3 className="font-black text-[#0f172a] text-sm">Top Skills</h3>
                </div>
                <div className="space-y-2">
                  {topSkills.map(([skill, val]) => (
                    <div key={skill} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0f172a] w-20 shrink-0 truncate">{skill}</span>
                      <div className="flex-1 h-1.5 bg-[#f8fafc] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${val}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-[#4f46e5] to-[#0ea5e9]"
                        />
                      </div>
                      <span className="text-[10px] font-black text-[#4f46e5] w-6 text-right">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Projects count + Certs count */}
          {profile && (
            <div className="px-4 pt-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex justify-around">
                  <div className="text-center">
                    <p className="text-2xl font-black text-[#4f46e5]">{profile.projects?.length ?? 0}</p>
                    <p className="text-[10px] text-[#64748b] font-bold uppercase">Projects</p>
                  </div>
                  <div className="w-px bg-[#f8fafc]" />
                  <div className="text-center">
                    <p className="text-2xl font-black text-[#10b981]">{profile.certifications?.length ?? 0}</p>
                    <p className="text-[10px] text-[#64748b] font-bold uppercase">Certifications</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 pt-4 pb-6">
            <button
              onClick={goToProfile}
              className="w-full bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#4f46e5]/25 active:scale-95 transition-transform"
            >
              <Edit2 className="w-4 h-4" />
              Edit Full Profile
            </button>
            <button
              onClick={logout}
              className="w-full mt-3 bg-white border-2 border-[#e2e8f0] text-[#ef4444] font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <X className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
