import { useQuery } from "@tanstack/react-query";
import { Sparkles, Target, TrendingDown, TrendingUp, Briefcase } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace("/tpo-portal", "");

function getTpo() {
  try { return JSON.parse(localStorage.getItem("tpo") || "{}"); } catch { return {}; }
}

interface SkillGapData {
  totalStudents: number;
  totalJobsAnalyzed: number;
  inDemand: { skill: string; demand: number; supply: number; supplyPct: number; gap: number }[];
  topBatchSkills: { skill: string; count: number; pct: number }[];
}

function gapColor(supplyPct: number): string {
  if (supplyPct >= 50) return "#10b981";
  if (supplyPct >= 20) return "#f59e0b";
  return "#ef4444";
}

export default function Insights() {
  const tpo = getTpo();
  const college: string = tpo.college || "";

  const { data, isLoading } = useQuery<SkillGapData>({
    queryKey: ["tpo-skill-gap", college],
    queryFn: () => fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/skill-gap`).then(r => r.json()),
    enabled: !!college,
  });

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e293b] flex items-center gap-2">
          <Target className="w-6 h-6 text-[#4f46e5]" />
          Hiring Insights
        </h1>
        <p className="text-sm text-[#64748b] mt-1">
          What recruiters actually search for · benchmarked against {data?.totalJobsAnalyzed ?? "..."} live job posts
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl h-64 animate-pulse" />
      ) : !data ? (
        <p className="text-[#94a3b8]">No data yet.</p>
      ) : data.totalJobsAnalyzed === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-12 text-center">
          <Briefcase className="w-12 h-12 text-[#cbd5e1] mx-auto mb-3" />
          <p className="font-bold text-[#1e293b] mb-1">Waiting for recruiter activity</p>
          <p className="text-sm text-[#94a3b8]">Once recruiters post jobs, we'll show you exactly what skills are in demand vs your batch's strengths.</p>
        </div>
      ) : (
        <>
          {/* Skill demand vs supply */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-[#4f46e5]" />
                <h2 className="text-base font-bold text-[#1e293b]">Skill Demand vs Your Batch</h2>
              </div>
              <span className="text-xs text-[#94a3b8] font-medium">{data.totalStudents} students</span>
            </div>
            <div className="divide-y divide-[#f1f5f9]">
              {data.inDemand.map(row => {
                const color = gapColor(row.supplyPct);
                return (
                  <div key={row.skill} className="px-6 py-4 hover:bg-[#f8fafc] transition-colors">
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <p className="font-bold text-[#1e293b] capitalize truncate">{row.skill}</p>
                        <span className="text-[10px] font-bold bg-[#eef2ff] text-[#4f46e5] px-2 py-0.5 rounded-full uppercase">
                          {row.demand} job{row.demand !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-[#94a3b8] font-medium">{row.supply}/{data.totalStudents} have it</span>
                        <span className="text-sm font-black w-10 text-right" style={{ color }}>{row.supplyPct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(row.supplyPct, 2)}%`, background: color }} />
                    </div>
                    {row.supplyPct < 20 && (
                      <p className="text-xs text-[#ef4444] font-bold mt-1.5 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Critical gap — recruiters can't find this in your batch
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batch strengths */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4.5 h-4.5 text-[#10b981]" />
              <h2 className="text-base font-bold text-[#1e293b]">Your Batch's Strongest Skills</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.topBatchSkills.map(s => (
                <div key={s.skill} className="bg-gradient-to-br from-[#10b981]/10 to-[#34d399]/5 border border-[#10b981]/20 rounded-xl p-3">
                  <p className="font-black text-[#1e293b] capitalize text-sm truncate">{s.skill}</p>
                  <p className="text-2xl font-black text-[#10b981] mt-1">{s.count}</p>
                  <p className="text-[10px] text-[#94a3b8] font-bold uppercase">{s.pct}% of batch</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
