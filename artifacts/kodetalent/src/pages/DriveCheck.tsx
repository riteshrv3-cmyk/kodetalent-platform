import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, AlertTriangle, ShieldAlert, Sparkles, Download, ChevronRight, ArrowLeft, Clipboard, TrendingUp, CheckCircle2, XCircle, Award, Phone, Ghost } from "lucide-react";
import { toPng } from "html-to-image";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Gate { open: boolean; label: string; }
interface CompanyStats {
  total: number;
  applied?: number;
  called?: number;
  ghosted?: number;
  rejected?: number;
  offer?: number;
  ghostRate: number | null;
  callRate: number | null;
  offerRate: number | null;
}
type Outcome = "pending" | "applied" | "called" | "ghosted" | "rejected" | "offer" | "skipped";
interface DriveCheckRow {
  id: number;
  studentId: number;
  rawText: string;
  company: string | null;
  role: string | null;
  ctc: string | null;
  batch: string | null;
  branches: string[];
  cgpaCutoff: string | null;
  applyLink: string | null;
  scamScore: number;
  scamVerdict: "safe" | "risky" | "scam";
  scamReasons: string[];
  eligibility: Record<string, Gate>;
  gatesOpen: number;
  gatesTotal: number;
  kodeScoreFit: number;
  tpoMatch: string;
  outcome: Outcome;
  appliedAt: string | null;
  outcomeAt: string | null;
  nextPingAt: string | null;
  createdAt: string;
  companyStats?: CompanyStats | null;
}

const VERDICT_META: Record<string, { emoji: string; bg: string; ring: string; chip: string; text: string; label: string; sub: string; Icon: typeof ShieldCheck }> = {
  safe: {
    emoji: "🟢",
    bg: "from-[#10b981] to-[#059669]",
    ring: "ring-[#10b981]/30",
    chip: "bg-[#d1fae5] text-[#065f46]",
    text: "text-[#065f46]",
    label: "Safe — apply kar",
    sub: "Legit signals match. Tu eligible bhi hai? Niche dekh.",
    Icon: ShieldCheck,
  },
  risky: {
    emoji: "🟡",
    bg: "from-[#f59e0b] to-[#d97706]",
    ring: "ring-[#f59e0b]/30",
    chip: "bg-[#fef3c7] text-[#78350f]",
    text: "text-[#78350f]",
    label: "Risky — sambhal ke",
    sub: "Kuch signals iffy hain. Apply karne se pehle source verify kar.",
    Icon: AlertTriangle,
  },
  scam: {
    emoji: "🚩",
    bg: "from-[#ef4444] to-[#dc2626]",
    ring: "ring-[#ef4444]/30",
    chip: "bg-[#fee2e2] text-[#7f1d1d]",
    text: "text-[#7f1d1d]",
    label: "Scam vibes — mat bhar",
    sub: "Lagta hai paisa nikalne wala scam hai. Group mein warn kar.",
    Icon: ShieldAlert,
  },
};

function GhostRateBadge({ stats }: { stats: CompanyStats }) {
  if (!stats || stats.total === 0) return null;
  const decided =
    (stats.called ?? 0) + (stats.ghosted ?? 0) + (stats.rejected ?? 0) + (stats.offer ?? 0);
  if (decided === 0) {
    return (
      <div className="bg-[#f8fafc] rounded-2xl p-3 border border-[#e0e7ff] flex items-center gap-2.5">
        <TrendingUp className="w-4 h-4 text-[#94a3b8] shrink-0" />
        <p className="text-[11px] text-[#64748b] leading-snug">
          {stats.applied ?? 0} KodeTalent users applied here. No outcomes reported yet.
        </p>
      </div>
    );
  }
  const ghostRate = stats.ghostRate ?? 0;
  const callRate = stats.callRate ?? 0;
  const offerRate = stats.offerRate ?? 0;
  const tone =
    ghostRate >= 70
      ? { bg: "from-[#ef4444]/15 to-[#dc2626]/5", border: "border-[#ef4444]/30", text: "text-[#7f1d1d]", emoji: "👻" }
      : ghostRate >= 40
      ? { bg: "from-[#f59e0b]/15 to-[#d97706]/5", border: "border-[#f59e0b]/30", text: "text-[#78350f]", emoji: "⚠️" }
      : { bg: "from-[#10b981]/15 to-[#059669]/5", border: "border-[#10b981]/30", text: "text-[#065f46]", emoji: "📞" };

  return (
    <div className={`bg-gradient-to-br ${tone.bg} rounded-2xl p-3.5 border ${tone.border}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-[10px] font-black uppercase tracking-wider ${tone.text}`}>
          {tone.emoji} Real outcomes from KodeTalent users
        </p>
        <span className="text-[9px] font-bold text-[#64748b]">n={decided}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className={`text-lg font-black ${tone.text}`}>{ghostRate}%</p>
          <p className="text-[9px] font-bold text-[#64748b] uppercase">Ghosted</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-[#0f172a]">{callRate}%</p>
          <p className="text-[9px] font-bold text-[#64748b] uppercase">Got Call</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-[#10b981]">{offerRate}%</p>
          <p className="text-[9px] font-bold text-[#64748b] uppercase">Offer</p>
        </div>
      </div>
    </div>
  );
}

function VerdictCard({ row, studentName, college, kodeScore }: {
  row: DriveCheckRow;
  studentName: string;
  college: string;
  kodeScore: number;
}) {
  const m = VERDICT_META[row.scamVerdict] ?? VERDICT_META.risky;
  const Icon = m.Icon;
  const gates = Object.entries(row.eligibility ?? {});

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-[#e0e7ff]">
      {/* Header strip */}
      <div className={`bg-gradient-to-br ${m.bg} px-5 py-4 text-white relative`}>
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider opacity-90">
          <span>{studentName} · {college.split(",")[0].slice(0, 22)}</span>
          <span>KodeScore {kodeScore}</span>
        </div>
        <div className="flex items-start gap-3 mt-2">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Verdict</p>
            <h2 className="text-xl font-black leading-tight mt-0.5">{m.emoji} {m.label}</h2>
            <p className="text-[11px] opacity-90 mt-0.5">{m.sub}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Company / role / ctc */}
        {(row.company || row.role || row.ctc) && (
          <div className="flex flex-wrap gap-1.5">
            {row.company && (
              <span className="text-[11px] font-black bg-[#0f172a] text-white px-2.5 py-1 rounded-full">{row.company}</span>
            )}
            {row.role && (
              <span className="text-[11px] font-bold bg-[#e0e7ff] text-[#3730a3] px-2.5 py-1 rounded-full">{row.role}</span>
            )}
            {row.ctc && (
              <span className="text-[11px] font-bold bg-[#fef3c7] text-[#78350f] px-2.5 py-1 rounded-full">💰 {row.ctc}</span>
            )}
            {row.batch && (
              <span className="text-[11px] font-bold bg-[#f8fafc] text-[#475569] px-2.5 py-1 rounded-full border border-[#e0e7ff]">🎓 {row.batch}</span>
            )}
          </div>
        )}

        {/* Scam reasons */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Scam Score</p>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${m.chip}`}>{row.scamScore}/100</span>
          </div>
          <div className="space-y-1.5">
            {row.scamReasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] text-[#0f172a]">
                <span className="mt-1 w-1 h-1 rounded-full bg-[#94a3b8] shrink-0" />
                <span className="leading-snug">{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Eligibility */}
        {gates.length > 0 && (
          <div className="bg-[#f8fafc] rounded-2xl p-3.5 border border-[#e0e7ff]">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Tu eligible hai?</p>
              <span className="text-[11px] font-black text-[#0f172a]">
                {row.gatesOpen}/{row.gatesTotal} gates open · KodeScore fit {row.kodeScoreFit}
              </span>
            </div>
            <div className="space-y-2">
              {gates.map(([key, g]) => (
                <div key={key} className="flex items-center gap-2 text-[12px]">
                  <span className="text-base">{g.open ? "✅" : "❌"}</span>
                  <span className={`flex-1 ${g.open ? "text-[#0f172a]" : "text-[#64748b]"} font-medium`}>{g.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ghost rate badge */}
        {row.companyStats && row.companyStats.total > 0 && (
          <GhostRateBadge stats={row.companyStats} />
        )}

        {/* TPO line */}
        <div className="flex items-center gap-2 text-[11px] text-[#64748b]">
          <Sparkles className="w-3 h-3 text-[#4f46e5]" />
          <span>
            {row.tpoMatch === "matched"
              ? "Your TPO has officially shared this drive ✓"
              : row.tpoMatch === "not_matched"
              ? "Not found in your TPO's official drives — verify before applying"
              : "TPO cross-reference coming soon"}
          </span>
        </div>
      </div>

      {/* Footer watermark */}
      <div className="bg-[#f8fafc] px-5 py-2.5 flex items-center justify-between border-t border-[#e0e7ff]">
        <span className="text-[10px] font-black text-[#4f46e5] tracking-wide">KODETALENT · DRIVE CHECK</span>
        <span className="text-[9px] text-[#94a3b8]">Paste any drive · 60s verdict</span>
      </div>
    </div>
  );
}

export default function DriveCheck() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("there");
  const [college, setCollege] = useState("");
  const [kodeScore, setKodeScore] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<DriveCheckRow | null>(null);
  const [recent, setRecent] = useState<DriveCheckRow[]>([]);
  const [pendingPings, setPendingPings] = useState<DriveCheckRow[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const refreshPendingPings = (id: string) => {
    fetch(`${BASE}/api/students/${id}/pending-pings`)
      .then((r) => r.json())
      .then((rows) => Array.isArray(rows) && setPendingPings(rows))
      .catch(() => {});
  };

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) { setLocation("/"); return; }
    setStudentId(id);
    fetch(`${BASE}/api/students/${id}/full-profile`)
      .then((r) => r.json())
      .then((p) => {
        setStudentName(p.name?.split(" ")[0] ?? "there");
        setCollege(p.college ?? "");
        setKodeScore(Math.round(p.overallScore ?? 0));
      })
      .catch(() => {});
    fetch(`${BASE}/api/students/${id}/drive-checks`)
      .then((r) => r.json())
      .then((rows) => Array.isArray(rows) && setRecent(rows))
      .catch(() => {});
    refreshPendingPings(id);
  }, [setLocation]);

  const fetchCompanyStats = async (company: string): Promise<CompanyStats | null> => {
    try {
      const r = await fetch(`${BASE}/api/drive-checks/company-stats?company=${encodeURIComponent(company)}`);
      return await r.json();
    } catch {
      return null;
    }
  };

  const markApplied = async (row: DriveCheckRow) => {
    if (!studentId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE}/api/students/${studentId}/drive-checks/${row.id}/applied`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json() as DriveCheckRow;
      const stats = row.company ? await fetchCompanyStats(row.company) : null;
      const merged = { ...row, ...updated, companyStats: stats };
      setVerdict((v) => (v?.id === row.id ? merged : v));
      setRecent((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...updated } : r)));
      if (row.applyLink) window.open(row.applyLink, "_blank", "noopener,noreferrer");
      toast({ title: "Marked applied!", description: "We'll ping you in 7 days for the outcome 🎯" });
    } catch {
      toast({ title: "Couldn't update", description: "Try again", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const setOutcome = async (row: DriveCheckRow, outcome: "called" | "ghosted" | "rejected" | "offer" | "skipped") => {
    if (!studentId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE}/api/students/${studentId}/drive-checks/${row.id}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json() as DriveCheckRow;
      const stats = row.company ? await fetchCompanyStats(row.company) : null;
      const merged = { ...row, ...updated, companyStats: stats };
      setVerdict((v) => (v?.id === row.id ? merged : v));
      setRecent((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...updated } : r)));
      setPendingPings((prev) => prev.filter((p) => p.id !== row.id));
      const labels: Record<string, string> = {
        called: "Got call recorded 📞", ghosted: "Ghost noted 👻",
        rejected: "Rejection noted", offer: "OFFER 🎉 mast!", skipped: "Skipped",
      };
      toast({ title: labels[outcome] ?? "Saved", description: "Thanks — this helps the next student." });
    } catch {
      toast({ title: "Couldn't update", description: "Try again", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const checkDrive = async () => {
    if (!text.trim() || loading || !studentId) return;
    setLoading(true);
    setVerdict(null);
    try {
      const res = await fetch(`${BASE}/api/students/${studentId}/drive-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      const data = await res.json() as DriveCheckRow;
      setVerdict(data);
      setRecent((prev) => [data, ...prev].slice(0, 10));
      setTimeout(() => {
        document.getElementById("verdict-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e) {
      toast({ title: "Couldn't check", description: (e as Error).message ?? "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setText(t);
    } catch {
      toast({ title: "Clipboard blocked", description: "Paste manually instead." });
    }
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#f8fafc",
      });
      const link = document.createElement("a");
      link.download = `drive-check-${verdict?.company ?? "verdict"}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Saved!", description: "Share kar de drive group mein 🚀" });
    } catch {
      toast({ title: "Download failed", description: "Try screenshot instead.", variant: "destructive" });
    }
  };

  const loadRecent = async (r: DriveCheckRow) => {
    setVerdict(r);
    setText(r.rawText);
    setTimeout(() => {
      document.getElementById("verdict-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    if (r.company) {
      const stats = await fetchCompanyStats(r.company);
      setVerdict((v) => (v?.id === r.id ? { ...v, companyStats: stats } : v));
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0f172a] via-[#3730a3] to-[#4f46e5] px-5 pt-5 pb-6 text-white">
        <button
          onClick={() => setLocation("/home")}
          className="flex items-center gap-1 text-white/70 text-xs font-bold mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Home
        </button>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-black">Drive Check</h1>
        </div>
        <p className="text-white/70 text-[12px] leading-relaxed">
          Paste any placement drive from Telegram / WhatsApp / Insta.
          <br />Tu instantly dekhega: <strong className="text-white">scam hai ya nahi</strong>, aur <strong className="text-white">tu eligible bhi hai ya nahi</strong>.
        </p>
      </div>

      {/* Pending pings — drives student applied to 7+ days ago */}
      {pendingPings.length > 0 && (
        <div className="px-4 -mt-4 mb-2">
          <div className="bg-gradient-to-br from-[#fef3c7] to-[#fde68a] rounded-2xl p-3.5 border border-[#f59e0b]/30 shadow-md">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#78350f] mb-2">
              ⏰ Quick check — kya hua in drives ka?
            </p>
            <div className="space-y-2">
              {pendingPings.slice(0, 3).map((p) => (
                <div key={p.id} className="bg-white/80 rounded-xl p-2.5">
                  <p className="text-[12px] font-black text-[#0f172a] truncate">
                    {p.company ?? "Unknown"} {p.role ? `· ${p.role}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      onClick={() => setOutcome(p, "called")}
                      disabled={actionLoading}
                      className="text-[10px] font-bold bg-[#10b981] text-white px-2 py-1 rounded-lg active:scale-95 disabled:opacity-50"
                    >
                      📞 Got call
                    </button>
                    <button
                      onClick={() => setOutcome(p, "offer")}
                      disabled={actionLoading}
                      className="text-[10px] font-bold bg-[#059669] text-white px-2 py-1 rounded-lg active:scale-95 disabled:opacity-50"
                    >
                      🎉 Got offer
                    </button>
                    <button
                      onClick={() => setOutcome(p, "ghosted")}
                      disabled={actionLoading}
                      className="text-[10px] font-bold bg-[#475569] text-white px-2 py-1 rounded-lg active:scale-95 disabled:opacity-50"
                    >
                      👻 Ghosted
                    </button>
                    <button
                      onClick={() => setOutcome(p, "rejected")}
                      disabled={actionLoading}
                      className="text-[10px] font-bold bg-[#94a3b8] text-white px-2 py-1 rounded-lg active:scale-95 disabled:opacity-50"
                    >
                      ❌ Rejected
                    </button>
                    <button
                      onClick={() => setOutcome(p, "skipped")}
                      disabled={actionLoading}
                      className="text-[10px] font-bold bg-transparent text-[#78350f] px-2 py-1 rounded-lg active:scale-95 disabled:opacity-50"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paste box */}
      <div className={pendingPings.length > 0 ? "px-4" : "px-4 -mt-4"}>
        <div className="bg-white rounded-3xl p-4 shadow-xl border border-[#e0e7ff]">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Paste drive message yahan...\n\nExample:\n\"Sprinklr off campus drive\nBatch: 2025, 2026\nSalary: 8-11 LPA\nNote: Tier 1 / Tier 2 colleges only\nApply: https://...\""}
            rows={6}
            disabled={loading}
            className="w-full resize-none bg-[#f8fafc] text-[13px] text-[#0f172a] placeholder:text-[#94a3b8] rounded-2xl px-3.5 py-3 outline-none border border-[#e0e7ff] focus:border-[#4f46e5] transition-colors disabled:opacity-60"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={pasteFromClipboard}
              disabled={loading}
              className="flex items-center gap-1.5 bg-[#f8fafc] border border-[#e0e7ff] text-[#475569] font-bold text-[11px] px-3 py-2 rounded-xl active:scale-95 transition-transform"
            >
              <Clipboard className="w-3.5 h-3.5" /> Paste
            </button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={checkDrive}
              disabled={!text.trim() || loading}
              className="flex-1 bg-gradient-to-br from-[#4f46e5] to-[#3730a3] text-white font-black text-sm py-2.5 rounded-xl shadow-md shadow-[#4f46e5]/25 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Check Drive
                </>
              )}
            </motion.button>
          </div>
          <p className="text-[10px] text-[#94a3b8] text-center mt-2.5">
            We tell you: 1) Scam ya nahi · 2) Tu eligible bhi hai ya nahi
          </p>
        </div>
      </div>

      {/* Verdict */}
      <div id="verdict-anchor" />
      <AnimatePresence mode="wait">
        {verdict && (
          <motion.div
            key={verdict.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 mt-5"
          >
            <div ref={cardRef}>
              <VerdictCard
                row={verdict}
                studentName={studentName}
                college={college}
                kodeScore={kodeScore}
              />
            </div>
            {/* Outcome actions — only for non-scam verdicts */}
            {verdict.scamVerdict !== "scam" && (
              <div className="mt-3 bg-white rounded-2xl p-3.5 border border-[#e0e7ff] shadow-sm">
                {verdict.outcome === "pending" && (
                  <>
                    <p className="text-[11px] font-black uppercase tracking-wider text-[#64748b] mb-2">
                      Apply karega is drive ko?
                    </p>
                    <button
                      onClick={() => markApplied(verdict)}
                      disabled={actionLoading}
                      className="w-full bg-gradient-to-br from-[#4f46e5] to-[#3730a3] text-white font-black text-sm py-2.5 rounded-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Maine apply kiya
                      {verdict.applyLink && <span className="text-[10px] opacity-80">+ open link</span>}
                    </button>
                    <p className="text-[10px] text-[#94a3b8] text-center mt-2">
                      We'll ping you in 7 days to ask kya hua — your reply helps every other student.
                    </p>
                  </>
                )}
                {verdict.outcome === "applied" && (
                  <>
                    <p className="text-[11px] font-black uppercase tracking-wider text-[#64748b] mb-2">
                      Status update — kya hua?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setOutcome(verdict, "called")}
                        disabled={actionLoading}
                        className="text-[11px] font-bold bg-[#10b981] text-white px-2 py-2 rounded-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" /> Got call
                      </button>
                      <button
                        onClick={() => setOutcome(verdict, "offer")}
                        disabled={actionLoading}
                        className="text-[11px] font-bold bg-[#059669] text-white px-2 py-2 rounded-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Award className="w-3.5 h-3.5" /> Got offer
                      </button>
                      <button
                        onClick={() => setOutcome(verdict, "ghosted")}
                        disabled={actionLoading}
                        className="text-[11px] font-bold bg-[#475569] text-white px-2 py-2 rounded-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Ghost className="w-3.5 h-3.5" /> Ghosted
                      </button>
                      <button
                        onClick={() => setOutcome(verdict, "rejected")}
                        disabled={actionLoading}
                        className="text-[11px] font-bold bg-[#94a3b8] text-white px-2 py-2 rounded-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rejected
                      </button>
                    </div>
                  </>
                )}
                {["called", "ghosted", "rejected", "offer", "skipped"].includes(verdict.outcome) && (
                  <div className="flex items-center gap-2 text-[12px] text-[#0f172a] font-bold">
                    <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                    <span>
                      Outcome saved: <span className="capitalize">{verdict.outcome}</span> · Thanks for sharing 🙏
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={downloadCard}
              className="w-full mt-3 bg-[#0f172a] text-white font-black text-sm py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md"
            >
              <Download className="w-4 h-4" />
              Share verdict to drive group
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent checks */}
      {recent.length > 0 && (
        <div className="px-4 mt-6">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-[#64748b] mb-2.5">Recent checks</h3>
          <div className="space-y-2">
            {recent.slice(0, 5).map((r) => {
              const m = VERDICT_META[r.scamVerdict] ?? VERDICT_META.risky;
              return (
                <button
                  key={r.id}
                  onClick={() => loadRecent(r)}
                  className="w-full bg-white rounded-2xl px-3.5 py-3 flex items-center gap-3 shadow-sm border border-[#e0e7ff] active:scale-[0.98] transition-transform text-left"
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.bg} flex items-center justify-center shrink-0`}>
                    <span className="text-base">{m.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[#0f172a] text-[12px] truncate">
                      {r.company ?? "Unknown company"} {r.role ? `· ${r.role}` : ""}
                    </p>
                    <p className="text-[10px] text-[#64748b] mt-0.5">
                      {m.label} · {r.gatesOpen}/{r.gatesTotal} gates open
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#94a3b8] shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
