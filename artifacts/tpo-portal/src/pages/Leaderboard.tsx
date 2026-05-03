import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Users, Sparkles, Award, ArrowUpRight, Crown, Medal } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace("/tpo-portal", "");

function getTpo() {
  try { return JSON.parse(localStorage.getItem("tpo") || "{}"); } catch { return {}; }
}

interface CollegeRow {
  rank: number;
  college: string;
  total: number;
  avgStrength: number;
  avgScore: number;
  readyCount: number;
  readyPct: number;
  openToWork: number;
  recruiterInterest: number;
  compositeScore: number;
}

interface LeaderboardData {
  totalColleges: number;
  myRank: CollegeRow | null;
  top10: CollegeRow[];
  nationalAvgStrength: number;
}

function rankColor(rank: number): string {
  if (rank === 1) return "#fbbf24";
  if (rank === 2) return "#94a3b8";
  if (rank === 3) return "#d97706";
  return "#64748b";
}

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-4 h-4" />;
  if (rank <= 3) return <Medal className="w-4 h-4" />;
  return <span className="text-xs font-black">#{rank}</span>;
}

export default function Leaderboard() {
  const tpo = getTpo();
  const college: string = tpo.college || "";

  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["tpo-leaderboard", college],
    queryFn: () => fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/leaderboard`).then(r => r.json()),
    enabled: !!college,
  });

  const myRank = data?.myRank;
  const inTop10 = myRank && data?.top10.some(r => r.college === college);

  return (
    <div className="px-8 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b] flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#fbbf24]" />
            College Leaderboard
          </h1>
          <p className="text-sm text-[#64748b] mt-1">Where {college} ranks across {data?.totalColleges ?? "..."} colleges nationwide</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Hero rank card */}
          {myRank && (
            <div className="bg-gradient-to-br from-[#0f172a] via-[#312e81] to-[#4338ca] text-white rounded-3xl p-8 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#fbbf24]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#fbbf24]" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#fbbf24]">Your College Rank</span>
                </div>
                <div className="flex items-end gap-4 mb-4">
                  <p className="text-7xl font-black leading-none">#{myRank.rank}</p>
                  <p className="text-white/60 text-lg pb-3">of {data?.totalColleges}</p>
                </div>
                <p className="text-xl font-bold mb-1">{myRank.college}</p>
                <p className="text-white/70 text-sm mb-6">Composite score: <span className="font-black text-white">{myRank.compositeScore}</span> · National avg strength: {data?.nationalAvgStrength}%</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Students", value: myRank.total },
                    { label: "Avg Strength", value: `${myRank.avgStrength}%` },
                    { label: "Placement Ready", value: `${myRank.readyPct}%` },
                    { label: "Recruiter Interest", value: myRank.recruiterInterest },
                  ].map(s => (
                    <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3">
                      <p className="text-2xl font-black">{s.value}</p>
                      <p className="text-[10px] text-white/60 font-bold uppercase mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top 10 */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-[#fbbf24]" />
                <h2 className="text-base font-bold text-[#1e293b]">Top 10 Colleges</h2>
              </div>
              {!inTop10 && myRank && (
                <span className="text-xs text-[#64748b] font-medium">Push your batch to break into top 10 →</span>
              )}
            </div>
            <div className="divide-y divide-[#f1f5f9]">
              {data?.top10.map(row => {
                const isMine = row.college === college;
                return (
                  <div key={row.college} className={`px-6 py-4 flex items-center gap-4 ${isMine ? "bg-[#eef2ff]" : "hover:bg-[#f8fafc]"} transition-colors`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${rankColor(row.rank)}20`, color: rankColor(row.rank) }}>
                      {rankIcon(row.rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold truncate ${isMine ? "text-[#4f46e5]" : "text-[#1e293b]"}`}>{row.college}</p>
                        {isMine && <span className="text-[10px] font-black bg-[#4f46e5] text-white px-2 py-0.5 rounded-full uppercase">You</span>}
                      </div>
                      <p className="text-xs text-[#94a3b8]">{row.total} students · {row.readyCount} ready · {row.recruiterInterest} invites</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-right flex-shrink-0">
                      <div>
                        <p className="text-sm font-black text-[#10b981]">{row.avgStrength}%</p>
                        <p className="text-[9px] text-[#94a3b8] uppercase font-bold">Strength</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#0ea5e9]">{row.readyPct}%</p>
                        <p className="text-[9px] text-[#94a3b8] uppercase font-bold">Ready</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#1e293b]">{row.compositeScore}</p>
                        <p className="text-[9px] text-[#94a3b8] uppercase font-bold">Score</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!data || data.top10.length === 0) && (
                <p className="px-6 py-12 text-center text-sm text-[#94a3b8]">No college data yet.</p>
              )}
            </div>
          </div>

          {/* Climb tip */}
          <div className="mt-6 bg-gradient-to-br from-[#fef3c7] to-[#fde68a] border border-[#f59e0b]/30 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#f59e0b] flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-[#92400e] mb-1">How to climb the leaderboard</p>
              <p className="text-sm text-[#a16207]">
                Composite score = 40% avg profile strength + 40% placement-ready % + 20% recruiter interest.
                Push at-risk students to complete their profile, get them open-to-work, and the rank moves fast.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
