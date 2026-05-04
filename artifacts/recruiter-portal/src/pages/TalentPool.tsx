import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Search, Filter, Bookmark, BookmarkCheck, Github, Linkedin, Globe,
  MapPin, GraduationCap, Briefcase, Star, Zap, LogOut, SlidersHorizontal,
  ChevronDown, X, Users, TrendingUp, Award
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace("/recruiter-portal", "");

interface Student {
  id: number;
  name: string;
  college: string;
  city: string;
  year: number;
  field: string;
  cgpa?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  bio?: string;
  openToWork: boolean;
  workMode?: string;
  preferredLocations: string[];
  expectedSalary?: string;
  profileStrength: number;
  commitmentScore: number;
  overallScore: number;
  skills: Record<string, number>;
  githubStats?: { username: string; topLanguages: string[]; publicRepos: number };
  projects: { id: string; title: string; techStack: string[] }[];
  certifications: { id: string; name: string; issuer: string }[];
  isPro: boolean;
}

const WORK_MODES = ["All", "remote", "hybrid", "onsite"];
const FIELDS = ["All", "Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Chemical", "Data Science", "AI/ML"];
const YEARS = ["All", "1", "2", "3", "4"];

function ScoreBadge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center" title={label}>
      <div className={`text-sm font-black`} style={{ color }}>{value}</div>
      <div className="text-[9px] text-[#94a3b8] uppercase font-bold">{label}</div>
    </div>
  );
}

function StudentCard({ student, shortlisted, onShortlist, onClick }: {
  student: Student;
  shortlisted: boolean;
  onShortlist: (id: number) => void;
  onClick: () => void;
}) {
  const initials = student.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  const topSkills = Object.entries(student.skills || {}).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 3);
  const strengthColor = student.profileStrength >= 70 ? "#10b981" : student.profileStrength >= 40 ? "#f97316" : "#ef4444";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl border border-[#f1f0f9] p-5 cursor-pointer hover:border-[#4f46e5]/30 hover:shadow-[0_8px_32px_rgba(124,58,237,0.08)] transition-all group relative"
      onClick={onClick}
    >
      {/* Shortlist button */}
      <button
        onClick={e => { e.stopPropagation(); onShortlist(student.id); }}
        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#f8fafc] transition-colors"
        title={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
      >
        {shortlisted
          ? <BookmarkCheck className="w-5 h-5 text-[#4f46e5]" />
          : <Bookmark className="w-5 h-5 text-[#d1d5db] group-hover:text-[#4f46e5] transition-colors" />
        }
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3 pr-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center text-white font-black text-base flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-[#0f172a] text-base leading-tight">{student.name}</h3>
            {student.openToWork && (
              <span className="flex items-center gap-1 text-[10px] font-black text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse" />OPEN
              </span>
            )}
            {student.isPro && (
              <span className="text-[10px] font-black text-[#f59e0b] bg-[#fef3c7] px-2 py-0.5 rounded-full">PRO</span>
            )}
          </div>
          <p className="text-xs text-[#64748b] font-medium mt-0.5 truncate">{student.college}</p>
          <p className="text-xs text-[#94a3b8] mt-0.5">{student.field} · Year {student.year}</p>
        </div>
      </div>

      {/* Scores */}
      <div className="flex items-center justify-between bg-[#fafafa] rounded-xl p-3 mb-3">
        <ScoreBadge value={student.profileStrength} label="Profile" color={strengthColor} />
        <div className="w-px h-8 bg-[#f0f0f0]" />
        <ScoreBadge value={student.commitmentScore} label="Commit" color="#4f46e5" />
        <div className="w-px h-8 bg-[#f0f0f0]" />
        <ScoreBadge value={student.overallScore} label="AI Score" color="#0ea5e9" />
        {student.cgpa && (
          <>
            <div className="w-px h-8 bg-[#f0f0f0]" />
            <ScoreBadge value={Number(student.cgpa)} label="CGPA" color="#f59e0b" />
          </>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {student.workMode && (
          <span className="text-[10px] font-bold bg-[#e0e7ff] text-[#4f46e5] px-2 py-1 rounded-lg">
            {student.workMode === "remote" ? "🏠 Remote" : student.workMode === "hybrid" ? "⚡ Hybrid" : "🏢 Onsite"}
          </span>
        )}
        {student.preferredLocations.slice(0, 2).map(loc => (
          <span key={loc} className="text-[10px] font-bold bg-[#f0fdf4] text-[#10b981] px-2 py-1 rounded-lg flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" />{loc}
          </span>
        ))}
        {student.expectedSalary && (
          <span className="text-[10px] font-bold bg-[#fef3c7] text-[#d97706] px-2 py-1 rounded-lg">
            {student.expectedSalary}
          </span>
        )}
      </div>

      {/* Top skills */}
      {topSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {topSkills.map(([skill, score]) => (
            <span key={skill} className="text-[10px] font-bold bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] px-2 py-1 rounded-lg">
              {skill} <span className="text-[#4f46e5]">{Math.round(score as number)}%</span>
            </span>
          ))}
        </div>
      )}

      {/* GitHub stats */}
      {student.githubStats && (
        <div className="flex items-center gap-3 text-xs text-[#64748b]">
          <span className="flex items-center gap-1"><Github className="w-3 h-3" /> @{student.githubStats.username}</span>
          <span>{student.githubStats.publicRepos} repos</span>
          {student.githubStats.topLanguages[0] && (
            <span className="font-bold text-[#4f46e5]">{student.githubStats.topLanguages[0]}</span>
          )}
        </div>
      )}

      {/* Links */}
      <div className="flex gap-2 mt-2">
        {student.githubUrl && <a href={student.githubUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[#64748b] hover:text-[#0f172a]"><Github className="w-3.5 h-3.5" /></a>}
        {student.linkedinUrl && <a href={student.linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[#64748b] hover:text-[#0077b5]"><Linkedin className="w-3.5 h-3.5" /></a>}
        {student.portfolioUrl && <a href={student.portfolioUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[#64748b] hover:text-[#4f46e5]"><Globe className="w-3.5 h-3.5" /></a>}
      </div>
    </motion.div>
  );
}

export default function TalentPool() {
  const [, setLocation] = useLocation();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [shortlisted, setShortlisted] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("shortlist") || "[]"); } catch { return []; }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ workMode: "All", field: "All", year: "All", minStrength: 0, minCgpa: "", hasGithub: false, hasProjects: false });

  const recruiter = JSON.parse(localStorage.getItem("recruiter") || "{}");

  useEffect(() => {
    fetch(`/api/talent-pool`)
      .then(r => r.json())
      .then((data: Student[]) => { setStudents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleShortlist = (id: number) => {
    const updated = shortlisted.includes(id) ? shortlisted.filter(s => s !== id) : [...shortlisted, id];
    setShortlisted(updated);
    localStorage.setItem("shortlist", JSON.stringify(updated));
  };

  const logout = () => { localStorage.removeItem("recruiter"); setLocation("/login"); };

  const filtered = useMemo(() => students.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !s.college.toLowerCase().includes(search.toLowerCase()) &&
        !s.field.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.workMode !== "All" && s.workMode !== filters.workMode) return false;
    if (filters.field !== "All" && !s.field.toLowerCase().includes(filters.field.toLowerCase())) return false;
    if (filters.year !== "All" && s.year !== parseInt(filters.year)) return false;
    if (s.profileStrength < filters.minStrength) return false;
    if (filters.minCgpa && parseFloat(s.cgpa || "0") < parseFloat(filters.minCgpa)) return false;
    if (filters.hasGithub && !s.githubUrl) return false;
    if (filters.hasProjects && s.projects.length === 0) return false;
    return true;
  }).sort((a, b) => b.profileStrength - a.profileStrength), [students, search, filters]);

  const shortlistedCount = shortlisted.length;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Top nav */}
      <div className="bg-white border-b border-[#f0f4ff] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#4f46e5] to-[#6366f1] rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-[#0f172a] text-lg">KodeTalent</span>
            </div>
            <span className="text-[#94a3b8] text-sm hidden sm:block">· Recruiter Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/shortlist")}
              className="flex items-center gap-2 text-sm font-bold text-[#4f46e5] bg-[#f8fafc] px-3 py-2 rounded-xl hover:bg-[#e0e7ff] transition-colors"
            >
              <BookmarkCheck className="w-4 h-4" />
              Shortlist {shortlistedCount > 0 && <span className="bg-[#4f46e5] text-white text-xs px-1.5 py-0.5 rounded-full">{shortlistedCount}</span>}
            </button>
            <div className="flex items-center gap-2 text-sm text-[#64748b]">
              <div className="w-7 h-7 bg-[#e0e7ff] rounded-full flex items-center justify-center">
                <span className="text-xs font-black text-[#4f46e5]">{recruiter.name?.[0] || "R"}</span>
              </div>
              <span className="hidden sm:block font-medium">{recruiter.company}</span>
            </div>
            <button onClick={logout} className="text-[#94a3b8] hover:text-[#64748b] transition-colors p-1.5">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header + stats */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[#0f172a] mb-1">Talent Pool</h1>
          <p className="text-[#64748b] text-sm">
            {loading ? "Loading..." : `${filtered.length} verified candidates open to opportunities`}
          </p>
        </div>

        {/* Quick stats */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Users, label: "Total Candidates", value: students.length, color: "#4f46e5" },
              { icon: TrendingUp, label: "Avg Profile Strength", value: `${Math.round(students.reduce((s, st) => s + st.profileStrength, 0) / Math.max(students.length, 1))}%`, color: "#10b981" },
              { icon: Star, label: "With GitHub", value: students.filter(s => s.githubStats).length, color: "#f59e0b" },
              { icon: Award, label: "With Projects", value: students.filter(s => s.projects.length > 0).length, color: "#0ea5e9" },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-[#f0f4ff] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${stat.color}15` }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="font-black text-[#0f172a] text-lg leading-none">{stat.value}</p>
                  <p className="text-[10px] text-[#94a3b8] font-bold uppercase mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search + filter bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="text" placeholder="Search by name, college, or field..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-[#e5e7eb] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] bg-white transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors ${showFilters ? "bg-[#4f46e5] text-white border-[#4f46e5]" : "bg-white text-[#64748b] border-[#e5e7eb] hover:border-[#4f46e5] hover:text-[#4f46e5]"}`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
            {Object.values(filters).some(v => v && v !== "All" && v !== 0) && (
              <span className="bg-[#f8fafc] text-[#4f46e5] text-xs px-1.5 py-0.5 rounded-full">Active</span>
            )}
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-white border border-[#f0f4ff] rounded-2xl p-5 mb-4 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="text-xs font-bold text-[#64748b] uppercase mb-2 block">Work Mode</label>
                <select value={filters.workMode} onChange={e => setFilters(f => ({ ...f, workMode: e.target.value }))} className="w-full border border-[#e5e7eb] rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30">
                  {WORK_MODES.map(m => <option key={m} value={m}>{m === "All" ? "All modes" : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#64748b] uppercase mb-2 block">Field</label>
                <select value={filters.field} onChange={e => setFilters(f => ({ ...f, field: e.target.value }))} className="w-full border border-[#e5e7eb] rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30">
                  {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#64748b] uppercase mb-2 block">Year</label>
                <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))} className="w-full border border-[#e5e7eb] rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30">
                  {YEARS.map(y => <option key={y} value={y}>{y === "All" ? "All years" : `Year ${y}`}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#64748b] uppercase mb-2 block">Min Profile %</label>
                <input type="number" min={0} max={100} value={filters.minStrength} onChange={e => setFilters(f => ({ ...f, minStrength: parseInt(e.target.value) || 0 }))} className="w-full border border-[#e5e7eb] rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30" placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-bold text-[#64748b] uppercase mb-2 block">Min CGPA</label>
                <input type="number" step={0.1} min={0} max={10} value={filters.minCgpa} onChange={e => setFilters(f => ({ ...f, minCgpa: e.target.value }))} className="w-full border border-[#e5e7eb] rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30" placeholder="e.g. 7.5" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#64748b] uppercase block">Must Have</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filters.hasGithub} onChange={e => setFilters(f => ({ ...f, hasGithub: e.target.checked }))} className="accent-[#4f46e5]" />
                  <span className="text-sm">GitHub</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filters.hasProjects} onChange={e => setFilters(f => ({ ...f, hasProjects: e.target.checked }))} className="accent-[#4f46e5]" />
                  <span className="text-sm">Projects</span>
                </label>
              </div>
            </div>
            <button onClick={() => setFilters({ workMode: "All", field: "All", year: "All", minStrength: 0, minCgpa: "", hasGithub: false, hasProjects: false })} className="mt-3 text-xs text-[#94a3b8] hover:text-[#64748b] font-medium flex items-center gap-1">
              <X className="w-3 h-3" /> Clear all filters
            </button>
          </motion.div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl h-56 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-lg font-bold text-[#0f172a]">No candidates found</p>
            <p className="text-sm text-[#94a3b8] mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((student, i) => (
              <motion.div key={student.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <StudentCard
                  student={student}
                  shortlisted={shortlisted.includes(student.id)}
                  onShortlist={toggleShortlist}
                  onClick={() => setLocation(`/student/${student.id}`)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
