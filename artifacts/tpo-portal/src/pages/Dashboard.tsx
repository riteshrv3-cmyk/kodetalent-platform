import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, TrendingUp, AlertTriangle, Star, Mail, ChevronRight, Activity, BarChart3, Trophy, ShieldAlert, Ghost, Sparkles, Search, Zap } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace("/tpo-portal", "");

function getTpo() {
  try { return JSON.parse(localStorage.getItem("tpo") || "{}"); } catch { return {}; }
}

interface Stats {
  total: number;
  ready: number;
  atRisk: number;
  avgScore: number;
  avgStrength: number;
  byYear: { year: number; count: number; avgStrength: number; readyCount: number }[];
}

interface ActivityItem {
  id: number;
  studentId: number;
  recruiterCompany: string;
  recruiterName: string;
  role?: string;
  status: string;
  createdAt: string;
  student?: { name: string; field: string; year: number };
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof Users; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0] shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#1e293b]">{value}</p>
      <p className="text-sm font-semibold text-[#64748b] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[#94a3b8] mt-1">{sub}</p>}
    </div>
  );
}

function YearBar({ year, count, avgStrength, readyCount }: { year: number; count: number; avgStrength: number; readyCount: number }) {
  const pct = Math.min(avgStrength, 100);
  const color = pct >= 60 ? "#10b981" : pct >= 35 ? "#f97316" : "#ef4444";
  return (
    <div className="flex items-center gap-4">
      <div className="w-16 shrink-0">
        <p className="text-xs font-bold text-[#475569]">Year {year}</p>
        <p className="text-xs text-[#94a3b8]">{count} students</p>
      </div>
      <div className="flex-1 bg-[#f1f5f9] rounded-full h-3 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-20 text-right shrink-0">
        <p className="text-sm font-bold" style={{ color }}>{avgStrength}%</p>
        <p className="text-xs text-[#94a3b8]">{readyCount} ready</p>
      </div>
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    declined: "bg-red-50 text-red-600 border-red-200",
  };
  return `text-xs font-semibold px-2 py-0.5 rounded-full border ${map[status] || "bg-slate-50 text-slate-600 border-slate-200"}`;
}

export default function Dashboard() {
  const [, nav] = useLocation();
  const tpo = getTpo();
  const college = tpo.college || "";

  const { data: stats } = useQuery<Stats>({
    queryKey: ["tpo-stats", college],
    queryFn: () => fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/stats`).then(r => r.json()),
    enabled: !!college,
  });

  const { data: activity = [] } = useQuery<ActivityItem[]>({
    queryKey: ["tpo-activity", college],
    queryFn: () => fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/activity`).then(r => r.json()),
    enabled: !!college,
  });

  const { data: leaderboard } = useQuery<{ totalColleges: number; myRank: { rank: number; compositeScore: number } | null; nationalAvgStrength: number }>({
    queryKey: ["tpo-leaderboard", college],
    queryFn: () => fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/leaderboard`).then(r => r.json()),
    enabled: !!college,
  });

  const { data: digest } = useQuery<{ invitesTotal7d: number; driveChecks7d: number; scamsBlocked: number; ghostedDrives: number; topReady: { id: number; name: string; profileStrength: number | null }[]; openToWorkList: { id: number; name: string; year: number; field: string }[] }>({
    queryKey: ["tpo-digest", college],
    queryFn: () => fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/digest`).then(r => r.json()),
    enabled: !!college,
  });

  const readyPct = stats && stats.total > 0 ? Math.round((stats.ready / stats.total) * 100) : 0;

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e293b]">Batch Dashboard</h1>
        <p className="text-sm text-[#64748b] mt-1">{college} · Placement Readiness Overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Students" value={stats?.total ?? "—"} sub="Across all years" color="bg-[#4f46e5]" />
        <StatCard icon={TrendingUp} label="Placement Ready" value={`${readyPct}%`} sub={`${stats?.ready ?? 0} students ≥60% profile`} color="bg-[#10b981]" />
        <StatCard icon={AlertTriangle} label="At Risk" value={stats?.atRisk ?? "—"} sub="Year 3+ below 30% strength" color="bg-[#f97316]" />
        <StatCard icon={Star} label="Avg Score" value={stats?.avgScore ?? "—"} sub={`Avg profile strength ${stats?.avgStrength ?? 0}%`} color="bg-[#0ea5e9]" />
      </div>

      {/* Hero strip: rank + 7-day pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => nav("/leaderboard")}
          className="text-left bg-gradient-to-br from-[#0f172a] via-[#312e81] to-[#4338ca] text-white rounded-2xl p-6 relative overflow-hidden hover:scale-[1.01] transition-transform"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#fbbf24]/15 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#fbbf24]">National Rank</span>
            </div>
            <div className="flex items-end gap-2 mb-1">
              <p className="text-5xl font-black leading-none">#{leaderboard?.myRank?.rank ?? "—"}</p>
              <p className="text-white/60 text-sm pb-2">of {leaderboard?.totalColleges ?? "—"}</p>
            </div>
            <p className="text-xs text-white/70">Composite score {leaderboard?.myRank?.compositeScore ?? "—"} · Tap to compete →</p>
          </div>
        </button>

        <button
          onClick={() => nav("/insights")}
          className="text-left bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm hover:border-[#4f46e5]/30 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#4f46e5]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4f46e5]">7-Day Pulse</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#10b981]" />
                <p className="text-2xl font-black text-[#1e293b]">{digest?.invitesTotal7d ?? "—"}</p>
              </div>
              <p className="text-[10px] text-[#64748b] font-bold uppercase mt-0.5">New invites</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#0ea5e9]" />
                <p className="text-2xl font-black text-[#1e293b]">{digest?.driveChecks7d ?? "—"}</p>
              </div>
              <p className="text-[10px] text-[#64748b] font-bold uppercase mt-0.5">Drives checked</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#ef4444]" />
                <p className="text-2xl font-black text-[#1e293b]">{digest?.scamsBlocked ?? "—"}</p>
              </div>
              <p className="text-[10px] text-[#64748b] font-bold uppercase mt-0.5">Scams blocked</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Ghost className="w-3.5 h-3.5 text-[#a855f7]" />
                <p className="text-2xl font-black text-[#1e293b]">{digest?.ghostedDrives ?? "—"}</p>
              </div>
              <p className="text-[10px] text-[#64748b] font-bold uppercase mt-0.5">Ghosted</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => nav("/drives")}
          className="text-left bg-gradient-to-br from-[#fef3c7] to-[#fde68a] border border-[#f59e0b]/30 rounded-2xl p-6 hover:scale-[1.01] transition-transform"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#d97706]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#d97706]">Drive Intelligence</span>
          </div>
          <p className="text-3xl font-black text-[#92400e] mb-1">{digest?.scamsBlocked ?? 0} scam{(digest?.scamsBlocked ?? 0) === 1 ? "" : "s"} stopped</p>
          <p className="text-xs text-[#a16207] font-medium">Track ghosting companies, block fake drives, see every check live →</p>
        </button>
      </div>

      {/* Top movers strip */}
      {(digest?.topReady?.length || digest?.openToWorkList?.length) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#10b981]" />
                <h3 className="text-sm font-bold text-[#1e293b]">Top Placement-Ready Now</h3>
              </div>
              <button onClick={() => nav("/students")} className="text-[10px] text-[#4f46e5] font-bold uppercase">All →</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {digest?.topReady?.slice(0, 6).map(s => (
                <button
                  key={s.id}
                  onClick={() => nav(`/students/${s.id}`)}
                  className="text-left px-3 py-2 rounded-xl bg-[#10b981]/10 hover:bg-[#10b981]/20 transition-colors"
                >
                  <p className="text-xs font-bold text-[#1e293b] truncate max-w-[160px]">{s.name}</p>
                  <p className="text-[10px] text-[#10b981] font-black">{s.profileStrength}% profile</p>
                </button>
              ))}
              {(!digest?.topReady?.length) && <p className="text-xs text-[#94a3b8]">No ready students yet.</p>}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4f46e5]" />
                <h3 className="text-sm font-bold text-[#1e293b]">Open to Work</h3>
              </div>
              <button onClick={() => nav("/students")} className="text-[10px] text-[#4f46e5] font-bold uppercase">All →</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {digest?.openToWorkList?.slice(0, 6).map(s => (
                <button
                  key={s.id}
                  onClick={() => nav(`/students/${s.id}`)}
                  className="text-left px-3 py-2 rounded-xl bg-[#eef2ff] hover:bg-[#e0e7ff] transition-colors"
                >
                  <p className="text-xs font-bold text-[#1e293b] truncate max-w-[160px]">{s.name}</p>
                  <p className="text-[10px] text-[#4f46e5] font-bold">Year {s.year} · {s.field}</p>
                </button>
              ))}
              {(!digest?.openToWorkList?.length) && <p className="text-xs text-[#94a3b8]">No students open to work yet.</p>}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Batch health by year */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-4.5 h-4.5 text-[#4f46e5]" />
            <h2 className="text-base font-bold text-[#1e293b]">Batch Health by Year</h2>
          </div>
          {stats?.byYear && stats.byYear.length > 0 ? (
            <div className="space-y-5">
              {stats.byYear.map(b => <YearBar key={b.year} {...b} />)}
            </div>
          ) : (
            <p className="text-sm text-[#94a3b8] text-center py-8">No student data yet for {college}</p>
          )}
        </div>

        {/* Recent recruiter activity */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-[#4f46e5]" />
              <h2 className="text-base font-bold text-[#1e293b]">Recent Recruiter Activity</h2>
            </div>
            <button onClick={() => nav("/activity")} className="text-xs text-[#4f46e5] font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {activity.length > 0 ? (
            <div className="space-y-3">
              {activity.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] transition">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1e293b] truncate">
                      {item.student?.name ?? `Student #${item.studentId}`}
                    </p>
                    <p className="text-xs text-[#64748b]">
                      {item.recruiterCompany} · {item.role || "Interview Invite"}
                    </p>
                    <p className="text-xs text-[#94a3b8] mt-0.5">{new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                  </div>
                  <span className={statusBadge(item.status)}>{item.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Activity className="w-8 h-8 text-[#cbd5e1] mb-3" />
              <p className="text-sm font-semibold text-[#94a3b8]">No recruiter activity yet</p>
              <p className="text-xs text-[#cbd5e1] mt-1">Invites sent by recruiters will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
