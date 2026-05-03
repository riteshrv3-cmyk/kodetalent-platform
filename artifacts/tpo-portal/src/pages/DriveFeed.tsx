import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, Ghost, Building2, AlertTriangle, CheckCircle2, Clock, Search } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace("/tpo-portal", "");

function getTpo() {
  try { return JSON.parse(localStorage.getItem("tpo") || "{}"); } catch { return {}; }
}

interface DriveCheck {
  id: number;
  studentId: number;
  company: string | null;
  role: string | null;
  scamVerdict: "safe" | "risky" | "scam";
  scamScore: number;
  outcome: string;
  createdAt: string;
  student?: { name: string; field: string; year: number };
}

interface DriveFeedData {
  recentChecks: DriveCheck[];
  topGhostingCompanies: { company: string; total: number; ghosted: number; called: number; offer: number; rejected: number; decided: number; ghostRate: number }[];
  scamCount: number;
  totalChecks: number;
}

const verdictColor: Record<string, string> = {
  safe: "#10b981",
  risky: "#f59e0b",
  scam: "#ef4444",
};

const outcomeColor: Record<string, string> = {
  pending: "#94a3b8",
  applied: "#0ea5e9",
  called: "#3b82f6",
  offer: "#10b981",
  ghosted: "#ef4444",
  rejected: "#64748b",
  skipped: "#94a3b8",
};

export default function DriveFeed() {
  const tpo = getTpo();
  const college: string = tpo.college || "";

  const { data, isLoading } = useQuery<DriveFeedData>({
    queryKey: ["tpo-drive-feed", college],
    queryFn: () => fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/drive-feed`).then(r => r.json()),
    enabled: !!college,
  });

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e293b] flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-[#4f46e5]" />
          Drive Intelligence
        </h1>
        <p className="text-sm text-[#64748b] mt-1">Every job drive your students checked, scam alerts, and ghost-rate tracking.</p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl h-64 animate-pulse" />
      ) : !data ? (
        <p className="text-[#94a3b8]">No data.</p>
      ) : data.totalChecks === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-12 text-center">
          <Search className="w-12 h-12 text-[#cbd5e1] mx-auto mb-3" />
          <p className="font-bold text-[#1e293b] mb-1">No drive checks yet</p>
          <p className="text-sm text-[#94a3b8]">When students paste drive messages into Drive Check, we surface them here with scam + ghost-rate alerts.</p>
        </div>
      ) : (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
              <div className="w-10 h-10 rounded-xl bg-[#4f46e5] flex items-center justify-center mb-3">
                <Search className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-black text-[#1e293b]">{data.totalChecks}</p>
              <p className="text-sm text-[#64748b]">Drives checked</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444] flex items-center justify-center mb-3">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-black text-[#1e293b]">{data.scamCount}</p>
              <p className="text-sm text-[#64748b]">Scams blocked for your batch</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
              <div className="w-10 h-10 rounded-xl bg-[#f59e0b] flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-black text-[#1e293b]">{data.topGhostingCompanies.length}</p>
              <p className="text-sm text-[#64748b]">Companies tracked</p>
            </div>
          </div>

          {/* Top ghosting companies */}
          {data.topGhostingCompanies.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
                <Ghost className="w-4.5 h-4.5 text-[#ef4444]" />
                <h2 className="text-base font-bold text-[#1e293b]">Companies most likely to ghost your students</h2>
              </div>
              <div className="divide-y divide-[#f1f5f9]">
                {data.topGhostingCompanies.map(c => {
                  const color = c.ghostRate >= 70 ? "#ef4444" : c.ghostRate >= 40 ? "#f59e0b" : "#10b981";
                  return (
                    <div key={c.company} className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-[#f8fafc] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                          <Building2 className="w-5 h-5" style={{ color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#1e293b] truncate">{c.company}</p>
                          <p className="text-xs text-[#94a3b8]">
                            {c.total} drives · {c.offer} offer · {c.called} called · {c.ghosted} ghosted
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-black" style={{ color }}>{c.ghostRate}%</p>
                        <p className="text-[9px] font-black uppercase text-[#94a3b8]">Ghost rate</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent checks */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-[#4f46e5]" />
              <h2 className="text-base font-bold text-[#1e293b]">Recent Drive Checks</h2>
            </div>
            <div className="divide-y divide-[#f1f5f9]">
              {data.recentChecks.map(c => {
                const vColor = verdictColor[c.scamVerdict];
                const oColor = outcomeColor[c.outcome] || "#94a3b8";
                return (
                  <div key={c.id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#f8fafc] transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${vColor}15` }}>
                      {c.scamVerdict === "scam" ? <ShieldAlert className="w-5 h-5" style={{ color: vColor }} />
                        : c.scamVerdict === "risky" ? <AlertTriangle className="w-5 h-5" style={{ color: vColor }} />
                        : <CheckCircle2 className="w-5 h-5" style={{ color: vColor }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-[#1e293b] truncate">{c.company || "Unknown company"}</p>
                        {c.role && <span className="text-xs text-[#94a3b8]">· {c.role}</span>}
                      </div>
                      <p className="text-xs text-[#64748b] truncate">
                        {c.student?.name || `Student #${c.studentId}`} · {c.student?.field || ""} · Year {c.student?.year || "?"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full" style={{ background: `${vColor}15`, color: vColor }}>
                        {c.scamVerdict}
                      </span>
                      {c.outcome !== "pending" && (
                        <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full" style={{ background: `${oColor}15`, color: oColor }}>
                          {c.outcome}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
