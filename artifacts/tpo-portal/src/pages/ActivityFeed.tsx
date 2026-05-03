import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Mail, Building2, Briefcase, Clock, CheckCircle, XCircle, HelpCircle, Filter } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace("/tpo-portal", "");

function getTpo() {
  try { return JSON.parse(localStorage.getItem("tpo") || "{}"); } catch { return {}; }
}

interface ActivityItem {
  id: number;
  studentId: number;
  recruiterCompany: string;
  recruiterName: string;
  recruiterEmail: string;
  role?: string;
  message?: string;
  status: string;
  studentSeen: boolean;
  createdAt: string;
  student?: { name: string; field: string; year: number };
}

function StatusIcon({ status }: { status: string }) {
  if (status === "accepted") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === "declined") return <XCircle className="w-4 h-4 text-red-400" />;
  return <HelpCircle className="w-4 h-4 text-amber-400" />;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    declined: "bg-red-50 text-red-600 border-red-200",
  };
  return `text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${map[status] || "bg-slate-50 text-slate-600 border-slate-200"}`;
}

export default function ActivityFeed() {
  const [, nav] = useLocation();
  const tpo = getTpo();
  const college = tpo.college || "";
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCompany, setFilterCompany] = useState("");

  const { data: activity = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["tpo-activity", college],
    queryFn: () => fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/activity`).then(r => r.json()),
    enabled: !!college,
    refetchInterval: 30000,
  });

  const companies = [...new Set(activity.map(a => a.recruiterCompany))].sort();

  const filtered = activity.filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterCompany && a.recruiterCompany !== filterCompany) return false;
    return true;
  });

  const counts = {
    all: activity.length,
    pending: activity.filter(a => a.status === "pending").length,
    accepted: activity.filter(a => a.status === "accepted").length,
    declined: activity.filter(a => a.status === "declined").length,
  };

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Recruiter Activity</h1>
        <p className="text-sm text-[#64748b] mt-1">{college} · Interview invites & recruiter interest</p>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "pending", "accepted", "declined"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
              filterStatus === s
                ? "bg-[#4f46e5] text-white shadow-sm shadow-[#4f46e5]/30"
                : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#4f46e5] hover:text-[#4f46e5]"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
          </button>
        ))}

        {companies.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Filter className="w-4 h-4 text-[#94a3b8]" />
            <select
              value={filterCompany}
              onChange={e => setFilterCompany(e.target.value)}
              className="px-3 py-2 border border-[#e2e8f0] rounded-xl text-sm bg-white text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
            >
              <option value="">All Companies</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-[#e2e8f0] animate-pulse h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-16 flex flex-col items-center text-center">
          <Mail className="w-10 h-10 text-[#e2e8f0] mb-3" />
          <p className="text-base font-semibold text-[#94a3b8]">No recruiter activity yet</p>
          <p className="text-sm text-[#cbd5e1] mt-1">When recruiters send interview invites to your students, they'll appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Company icon */}
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center shrink-0 text-white font-bold text-sm">
                  {item.recruiterCompany.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-[#1e293b]">{item.recruiterCompany}</p>
                        <span className={statusBadge(item.status)}>{item.status}</span>
                        {!item.studentSeen && item.status === "pending" && (
                          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">Not seen</span>
                        )}
                      </div>
                      {item.role && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5 text-[#94a3b8]" />
                          <p className="text-xs text-[#64748b] font-medium">{item.role}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#94a3b8]">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {/* Student */}
                    <button
                      onClick={() => nav(`/students/${item.studentId}`)}
                      className="flex items-center gap-2 bg-[#f8fafc] hover:bg-[#f1f5f9] rounded-lg px-3 py-1.5 transition"
                    >
                      <div className="w-5 h-5 rounded-full bg-[#4f46e5] flex items-center justify-center text-white text-[10px] font-bold">
                        {item.student?.name?.charAt(0) ?? "?"}
                      </div>
                      <span className="text-xs font-semibold text-[#475569]">
                        {item.student?.name ?? `Student #${item.studentId}`}
                      </span>
                      {item.student && (
                        <span className="text-xs text-[#94a3b8]">· Year {item.student.year} · {item.student.field}</span>
                      )}
                    </button>

                    {/* Recruiter */}
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#94a3b8]" />
                      <span className="text-xs text-[#64748b]">{item.recruiterName}</span>
                    </div>
                  </div>

                  {item.message && (
                    <div className="mt-3 bg-[#f8fafc] rounded-xl px-3 py-2.5">
                      <p className="text-xs text-[#64748b] italic">"{item.message}"</p>
                    </div>
                  )}
                </div>

                <StatusIcon status={item.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
