import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, Award, Calendar, ChevronRight, BarChart3 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api/authFetch";

interface HistoryItem {
  id: number;
  company: string;
  interviewType: string;
  round: string;
  overallScore: number;
  communicationScore: number | null;
  technicalScore: number | null;
  confidenceScore: number | null;
  overallRating: string | null;
  createdAt: string;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtDateLong(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function ratingColor(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#4f46e5";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

export default function InterviewHistory() {
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sid = localStorage.getItem("studentId");
    if (!sid) { setLocation("/onboarding"); return; }
    apiFetch(`/api/interview/students/${sid}/sessions`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => setItems(d.items as HistoryItem[]))
      .catch(e => setError(e.message));
  }, [setLocation]);

  const stats = useMemo(() => {
    if (!items || items.length === 0) return null;
    const scores = items.map(i => i.overallScore);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const best = Math.max(...scores);
    const last = items[items.length - 1].overallScore;
    const first = items[0].overallScore;
    const delta = last - first;
    return { avg, best, total: items.length, delta };
  }, [items]);

  const chartData = useMemo(() => {
    if (!items) return [];
    return items.map((i, idx) => ({
      idx: idx + 1,
      label: fmtDate(i.createdAt),
      score: i.overallScore,
      company: i.company,
    }));
  }, [items]);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-28">
      <div className="sticky top-0 z-10 bg-[#f8fafc] px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation("/practice")}
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-[#0f172a]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0f172a]">Interview History</h1>
            <p className="text-xs font-bold text-[#64748b]">Track your improvement over time</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {error && (
          <Card className="border-0 border-l-4 border-l-[#ef4444] rounded-2xl bg-white">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-[#ef4444]">Couldn't load history</p>
              <p className="text-xs text-[#64748b] mt-1">{error}</p>
            </CardContent>
          </Card>
        )}

        {!error && items === null && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {items && items.length === 0 && (
          <Card className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-8 text-center">
              <BarChart3 className="w-10 h-10 text-[#94a3b8] mx-auto mb-3" />
              <p className="text-base font-extrabold text-[#0f172a] mb-1">No interviews yet</p>
              <p className="text-sm text-[#64748b] mb-4">Finish your first mock interview to start tracking your progress.</p>
              <Button
                onClick={() => setLocation("/practice")}
                className="rounded-full bg-primary text-white font-bold"
              >
                Start Mock Interview →
              </Button>
            </CardContent>
          </Card>
        )}

        {items && items.length > 0 && stats && (
          <>
            {/* Stat row */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="border-0 shadow-sm rounded-2xl bg-white">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-black" style={{ color: ratingColor(stats.avg) }}>{stats.avg}</div>
                  <div className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-wider mt-0.5">Average</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm rounded-2xl bg-white">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-black text-[#10b981] flex items-center justify-center gap-1">
                    <Award className="w-4 h-4" /> {stats.best}
                  </div>
                  <div className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-wider mt-0.5">Best</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm rounded-2xl bg-white">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-black text-[#0f172a]">{stats.total}</div>
                  <div className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-wider mt-0.5">Sessions</div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.08)] rounded-3xl bg-white overflow-hidden">
              <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#4f46e5,#ec4899)" }} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-[#64748b]">Score Trend</p>
                    <p className="text-sm font-extrabold text-[#0f172a]">
                      {stats.delta > 0 && <span className="text-[#10b981]">↑ +{stats.delta} pts since start</span>}
                      {stats.delta < 0 && <span className="text-[#f97316]">↓ {stats.delta} pts since start</span>}
                      {stats.delta === 0 && <span className="text-[#64748b]">Steady</span>}
                    </p>
                  </div>
                  <TrendingUp className="w-5 h-5" style={{ color: stats.delta >= 0 ? "#10b981" : "#f97316" }} />
                </div>
                <div className="h-48 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="scoreLine" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#4f46e5" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <ReferenceLine y={stats.avg} stroke="#cbd5e1" strokeDasharray="4 4" label={{ value: "avg", fill: "#94a3b8", fontSize: 9, fontWeight: 700, position: "right" }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", fontSize: 12, fontWeight: 700 }}
                        formatter={(v: number) => [`${v} / 100`, "Score"]}
                        labelFormatter={(l, p) => {
                          const d = p?.[0]?.payload as { company?: string } | undefined;
                          return d?.company ? `${d.company} · ${l}` : String(l);
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="url(#scoreLine)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#fff", stroke: "#4f46e5", strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Session list */}
            <div>
              <p className="text-[11px] font-extrabold text-[#64748b] uppercase tracking-wider mb-2 px-1">All Sessions</p>
              <div className="space-y-2">
                {[...items].reverse().map((it, i) => (
                  <motion.button
                    key={it.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setLocation(`/practice/interview/${it.id}`)}
                    className="w-full bg-white rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.05)] text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-black text-base"
                        style={{ background: ratingColor(it.overallScore) }}
                      >
                        {it.overallScore}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-[#0f172a] text-[14px] truncate">{it.company}</p>
                        <p className="text-[11px] font-bold text-[#64748b] truncate">
                          {it.interviewType}
                          {it.overallRating ? ` · ${it.overallRating}` : ""}
                        </p>
                        <p className="text-[10px] text-[#94a3b8] font-bold mt-0.5 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" /> {fmtDateLong(it.createdAt)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#cbd5e1] flex-shrink-0 ml-2" />
                  </motion.button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Suppress unused warning for cn import (kept for future styling extensions)
void cn;
