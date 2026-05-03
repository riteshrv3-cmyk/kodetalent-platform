import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, ChevronRight, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace("/tpo-portal", "");

function getTpo() {
  try { return JSON.parse(localStorage.getItem("tpo") || "{}"); } catch { return {}; }
}

interface Student {
  id: number;
  name: string;
  email: string;
  year: number;
  field: string;
  college: string;
  overallScore: number;
  profileStrength: number;
  commitmentScore: number;
  openToWork: boolean;
  skills: Record<string, number>;
  cgpa?: string;
  xp: number;
}

function readinessBadge(strength: number) {
  if (strength >= 60) return { label: "Ready", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle, iconColor: "text-emerald-500" };
  if (strength >= 35) return { label: "In Progress", color: "bg-amber-50 text-amber-700 border-amber-200", icon: TrendingUp, iconColor: "text-amber-500" };
  return { label: "At Risk", color: "bg-red-50 text-red-600 border-red-200", icon: AlertTriangle, iconColor: "text-red-400" };
}

function StrengthBar({ value }: { value: number }) {
  const color = value >= 60 ? "#10b981" : value >= 35 ? "#f97316" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-[#f1f5f9] rounded-full h-2">
        <div className="h-full rounded-full" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function Students() {
  const [, nav] = useLocation();
  const tpo = getTpo();
  const college = tpo.college || "";
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterField, setFilterField] = useState<string>("all");
  const [filterReadiness, setFilterReadiness] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "score" | "strength" | "year">("strength");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["tpo-students", college],
    queryFn: () => fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/students`).then(r => r.json()),
    enabled: !!college,
  });

  const years = [...new Set(students.map(s => s.year))].sort();
  const fields = [...new Set(students.map(s => s.field))].sort();

  const filtered = students
    .filter(s => {
      const q = search.toLowerCase();
      if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q) && !s.field.toLowerCase().includes(q)) return false;
      if (filterYear !== "all" && s.year !== Number(filterYear)) return false;
      if (filterField !== "all" && s.field !== filterField) return false;
      if (filterReadiness === "ready" && (s.profileStrength ?? 0) < 60) return false;
      if (filterReadiness === "progress" && ((s.profileStrength ?? 0) < 35 || (s.profileStrength ?? 0) >= 60)) return false;
      if (filterReadiness === "risk" && (s.profileStrength ?? 0) >= 35) return false;
      return true;
    })
    .sort((a, b) => {
      const mult = sortDir === "desc" ? -1 : 1;
      if (sortBy === "name") return mult * a.name.localeCompare(b.name);
      if (sortBy === "score") return mult * (a.overallScore - b.overallScore);
      if (sortBy === "strength") return mult * ((a.profileStrength ?? 0) - (b.profileStrength ?? 0));
      if (sortBy === "year") return mult * (a.year - b.year);
      return 0;
    });

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: typeof sortBy }) {
    if (sortBy !== col) return <span className="text-[#cbd5e1] ml-0.5">↕</span>;
    return <span className="text-[#4f46e5] ml-0.5">{sortDir === "desc" ? "↓" : "↑"}</span>;
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Students</h1>
        <p className="text-sm text-[#64748b] mt-1">{college} · {students.length} students enrolled</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, field…"
            className="w-full pl-9 pr-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition"
          />
        </div>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2.5 border border-[#e2e8f0] rounded-xl text-sm bg-white text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20">
          <option value="all">All Years</option>
          {years.map(y => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select value={filterField} onChange={e => setFilterField(e.target.value)} className="px-3 py-2.5 border border-[#e2e8f0] rounded-xl text-sm bg-white text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20">
          <option value="all">All Fields</option>
          {fields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filterReadiness} onChange={e => setFilterReadiness(e.target.value)} className="px-3 py-2.5 border border-[#e2e8f0] rounded-xl text-sm bg-white text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20">
          <option value="all">All Readiness</option>
          <option value="ready">Ready (≥60%)</option>
          <option value="progress">In Progress</option>
          <option value="risk">At Risk (&lt;35%)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
              <th className="text-left px-5 py-3.5 text-xs font-bold text-[#475569] uppercase tracking-wide cursor-pointer hover:text-[#4f46e5]" onClick={() => toggleSort("name")}>
                Student <SortIcon col="name" />
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-bold text-[#475569] uppercase tracking-wide cursor-pointer hover:text-[#4f46e5]" onClick={() => toggleSort("year")}>
                Year <SortIcon col="year" />
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-bold text-[#475569] uppercase tracking-wide">Field</th>
              <th className="text-left px-4 py-3.5 text-xs font-bold text-[#475569] uppercase tracking-wide cursor-pointer hover:text-[#4f46e5]" onClick={() => toggleSort("strength")}>
                Profile Strength <SortIcon col="strength" />
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-bold text-[#475569] uppercase tracking-wide cursor-pointer hover:text-[#4f46e5]" onClick={() => toggleSort("score")}>
                Score <SortIcon col="score" />
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-bold text-[#475569] uppercase tracking-wide">Status</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-[#f1f5f9]">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-[#f1f5f9] rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-sm text-[#94a3b8]">No students match your filters</td></tr>
            ) : filtered.map(s => {
              const badge = readinessBadge(s.profileStrength ?? 0);
              const BadgeIcon = badge.icon;
              return (
                <tr
                  key={s.id}
                  onClick={() => nav(`/students/${s.id}`)}
                  className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] cursor-pointer transition"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1e293b]">{s.name}</p>
                        <p className="text-xs text-[#94a3b8]">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-[#475569] font-medium">Year {s.year}</td>
                  <td className="px-4 py-4 text-sm text-[#475569]">{s.field}</td>
                  <td className="px-4 py-4"><StrengthBar value={s.profileStrength ?? 0} /></td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-bold text-[#1e293b]">{s.overallScore}</span>
                    <span className="text-xs text-[#94a3b8] ml-1">/100</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.color}`}>
                      <BadgeIcon className={`w-3 h-3 ${badge.iconColor}`} />
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <ChevronRight className="w-4 h-4 text-[#cbd5e1]" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[#f1f5f9] text-xs text-[#94a3b8]">
            Showing {filtered.length} of {students.length} students
          </div>
        )}
      </div>
    </div>
  );
}
