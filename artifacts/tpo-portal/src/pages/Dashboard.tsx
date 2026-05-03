import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, TrendingUp, AlertTriangle, Star, Mail, ChevronRight, Activity, BarChart3 } from "lucide-react";

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

  const readyPct = stats && stats.total > 0 ? Math.round((stats.ready / stats.total) * 100) : 0;

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e293b]">Batch Dashboard</h1>
        <p className="text-sm text-[#64748b] mt-1">{college} · Placement Readiness Overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Students" value={stats?.total ?? "—"} sub="Across all years" color="bg-[#4f46e5]" />
        <StatCard icon={TrendingUp} label="Placement Ready" value={`${readyPct}%`} sub={`${stats?.ready ?? 0} students ≥60% profile`} color="bg-[#10b981]" />
        <StatCard icon={AlertTriangle} label="At Risk" value={stats?.atRisk ?? "—"} sub="Year 3+ below 30% strength" color="bg-[#f97316]" />
        <StatCard icon={Star} label="Avg Score" value={stats?.avgScore ?? "—"} sub={`Avg profile strength ${stats?.avgStrength ?? 0}%`} color="bg-[#0ea5e9]" />
      </div>

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
