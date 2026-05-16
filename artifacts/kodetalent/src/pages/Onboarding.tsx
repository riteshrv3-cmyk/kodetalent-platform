import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Sparkles, Zap, Loader2, Check, ChevronRight,
  Code2, Brain, Eye, Wrench, BarChart3,
} from "lucide-react";
import { useCreateStudent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────

type Archetype = "architect" | "hacker" | "analyst" | "visionary" | "builder";

type Scenario = {
  question: string;
  options: { label: string; archetype: Archetype; desc: string }[];
};

type FormData = {
  name: string;
  email: string;
  collegeFull: string;
  year: string;
  field: string;
};

// ── Career archetype scenarios ──────────────────────────────────
const SCENARIOS: Scenario[] = [
  {
    question: "It's Sunday evening. A tough project deadline is tomorrow. You...",
    options: [
      { label: "Plan every step, then execute", archetype: "architect", desc: "Structure first" },
      { label: "Jump in and figure it out live", archetype: "hacker", desc: "Ship fast" },
      { label: "Analyse what's blocking first", archetype: "analyst", desc: "Data-driven" },
      { label: "Rethink the whole approach", archetype: "visionary", desc: "Big picture" },
    ],
  },
  {
    question: "A hot new tech trend drops on Twitter. Your first move?",
    options: [
      { label: "Read the spec carefully", archetype: "architect", desc: "Deep dive" },
      { label: "Build something with it tonight", archetype: "hacker", desc: "Prototype" },
      { label: "Check benchmarks & reviews", archetype: "analyst", desc: "Validate" },
      { label: "Imagine how it reshapes everything", archetype: "visionary", desc: "Vision" },
    ],
  },
  {
    question: "In a group project, you naturally gravitate to...",
    options: [
      { label: "System design & architecture", archetype: "architect", desc: "Foundation" },
      { label: "The core feature implementation", archetype: "hacker", desc: "Build" },
      { label: "Testing, metrics, and QA", archetype: "analyst", desc: "Verify" },
      { label: "Product vision & user flow", archetype: "visionary", desc: "Design" },
    ],
  },
  {
    question: "You hit a bug that's stumped you for hours. You...",
    options: [
      { label: "Refactor the whole module", archetype: "architect", desc: "Clean slate" },
      { label: "Try 10 quick fixes until one works", archetype: "hacker", desc: "Iterate" },
      { label: "Add logs and trace every variable", archetype: "analyst", desc: "Debug" },
      { label: "Step back, maybe it's the wrong approach", archetype: "visionary", desc: "Rethink" },
    ],
  },
  {
    question: "A recruiter DMs you on LinkedIn. Your reaction?",
    options: [
      { label: "Ask about their tech stack first", archetype: "architect", desc: "Quality" },
      { label: "Send your GitHub immediately", archetype: "hacker", desc: "Show work" },
      { label: "Research the company metrics", archetype: "analyst", desc: "Data" },
      { label: "Pitch a product idea to them", archetype: "visionary", desc: "Lead" },
    ],
  },
  {
    question: "Your ideal weekend side project looks like...",
    options: [
      { label: "A perfectly documented open-source tool", archetype: "architect", desc: "Craft" },
      { label: "A working MVP in 48 hours", archetype: "hacker", desc: "Hackathon" },
      { label: "A data dashboard from public datasets", archetype: "analyst", desc: "Insights" },
      { label: "A speculative concept video", archetype: "visionary", desc: "Pitch" },
    ],
  },
];

const ARCHETYPE_META: Record<Archetype, { title: string; tagline: string; icon: typeof Code2; color: string; traits: string[]; fieldMatch: string }> = {
  architect: {
    title: "The Architect",
    tagline: "You build systems that last.",
    icon: Code2,
    color: "#4f46e5",
    traits: ["Clean code obsession", "System thinker", "Quality over speed"],
    fieldMatch: "Web Dev",
  },
  hacker: {
    title: "The Hacker",
    tagline: "You ship first, polish later.",
    icon: Zap,
    color: "#f97316",
    traits: ["Rapid prototyping", "Resourceful", "Fearless debugger"],
    fieldMatch: "App Dev",
  },
  analyst: {
    title: "The Analyst",
    tagline: "You find truth in data.",
    icon: BarChart3,
    color: "#0ea5e9",
    traits: ["Evidence-driven", "Detail oriented", "Methodical"],
    fieldMatch: "Data",
  },
  visionary: {
    title: "The Visionary",
    tagline: "You see what others can't.",
    icon: Eye,
    color: "#8b5cf6",
    traits: ["Product intuition", "Strategic thinker", "Creative"],
    fieldMatch: "AI/ML",
  },
  builder: {
    title: "The Builder",
    tagline: "You turn ideas into reality.",
    icon: Wrench,
    color: "#10b981",
    traits: ["Hands-on", "Iterative", "Problem solver"],
    fieldMatch: "Web Dev",
  },
};

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

// ── Archetype calculator ────────────────────────────────────
function calculateArchetype(answers: number[]): Archetype {
  const counts: Record<string, number> = {};
  for (const idx of answers) {
    const a = SCENARIOS[answers.indexOf(idx)]?.options[idx]?.archetype;
    if (a) counts[a] = (counts[a] || 0) + 1;
  }
  // Re-count properly
  const freq: Record<string, number> = {};
  answers.forEach((optIdx, qIdx) => {
    const a = SCENARIOS[qIdx]?.options[optIdx]?.archetype;
    if (a) freq[a] = (freq[a] || 0) + 1;
  });
  const winner = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] as Archetype || "builder";
  return winner;
}

// ── Main component ────────────────────────────────────────────
export default function Onboarding() {
  const [, setLocation] = useLocation();
  const inviteCode = typeof window !== "undefined" ? sessionStorage.getItem("inviteCode") : null;
  const inviteCollegeName = typeof window !== "undefined" ? sessionStorage.getItem("inviteCollegeName") : null;
  const inviteCollegeCity = typeof window !== "undefined" ? sessionStorage.getItem("inviteCollegeCity") : null;

  const [screen, setScreen] = useState<"welcome" | "quiz" | "reveal" | "details" | "submitting">("welcome");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [form, setForm] = useState<FormData>({
    name: "", email: "", collegeFull: inviteCollegeName ? `${inviteCollegeName}${inviteCollegeCity ? " " + inviteCollegeCity : ""}`.trim() : "",
    year: "", field: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createStudent = useCreateStudent();

  const scenario = SCENARIOS[qIndex];
  const progress = ((qIndex) / SCENARIOS.length) * 100;

  function pickOption(optIdx: number) {
    const nextAnswers = [...answers, optIdx];
    setAnswers(nextAnswers);
    setDirection(1);

    if (qIndex < SCENARIOS.length - 1) {
      setQIndex(i => i + 1);
    } else {
      // All questions done — reveal archetype
      const result = calculateArchetype(nextAnswers);
      setArchetype(result);
      setScreen("reveal");
    }
  }

  function prevQuestion() {
    if (qIndex > 0) {
      setDirection(-1);
      setAnswers(a => a.slice(0, -1));
      setQIndex(i => i - 1);
    }
  }

  async function submit() {
    setSubmitting(true);
    setScreen("submitting");
    try {
      const yearMap: Record<string, number> = {
        "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4,
      };
      const parts = form.collegeFull.trim().split(/\s+/);
      const city = parts.length > 1 ? parts.pop()! : "Unknown";
      const college = parts.join(" ") || form.collegeFull || "College";
      const field = form.field || ARCHETYPE_META[archetype!].fieldMatch;

      const student = await createStudent.mutateAsync({
        data: {
          name: form.name.trim() || "Student",
          email: form.email.trim() || "student@example.com",
          college,
          city,
          year: yearMap[form.year] || 1,
          field,
        },
      });
      localStorage.setItem("studentId", student.id.toString());
      localStorage.setItem("studentCollege", student.college || college);
      if (inviteCode) {
        try {
          await fetch(`/api/invite/${encodeURIComponent(inviteCode)}/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId: student.id }),
          });
        } catch { /* ignore */ }
        sessionStorage.removeItem("inviteCode");
        sessionStorage.removeItem("inviteCollegeName");
        sessionStorage.removeItem("inviteCollegeCity");
      }
      setTimeout(() => setLocation("/home"), 1400);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Tap to retry.");
      setSubmitting(false);
    }
  }

  // ── WELCOME SCREEN ───────────────────────────────────────────
  if (screen === "welcome") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-between p-6" style={{ background: "#f8fafc" }}>
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-24 h-24 rounded-3xl bg-[#f97316] flex items-center justify-center mb-8 relative"
          >
            <Sparkles className="w-12 h-12 text-white" />
            <motion.div
              className="absolute -top-1 -right-1 w-7 h-7 bg-[#10b981] rounded-full flex items-center justify-center"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}
            >
              <Check className="w-4 h-4 text-white" />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-[32px] font-black text-[#0f172a] mb-3 leading-tight"
          >
            What's your<br />dev personality?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-[#64748b] text-base mb-8 max-w-[280px]"
          >
            6 quick scenarios. No wrong answers. Discover your engineering archetype.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="flex items-center gap-4 text-[11px] font-semibold text-[#94a3b8]"
          >
            <span className="flex items-center gap-1"><Code2 className="w-3.5 h-3.5" /> Architect</span>
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Hacker</span>
            <span className="flex items-center gap-1"><Brain className="w-3.5 h-3.5" /> Analyst</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-sm pb-safe"
        >
          <Button
            onClick={() => setScreen("quiz")}
            className="w-full h-14 rounded-2xl bg-[#0f172a] text-white hover:bg-[#1e293b] font-bold text-lg"
          >
            Start Quiz <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-[11px] text-[#94a3b8] text-center mt-3">Takes 90 seconds</p>
        </motion.div>
      </div>
    );
  }

  // ── QUIZ SCREEN ────────────────────────────────────────────
  if (screen === "quiz") {
    return (
      <div className="min-h-[100dvh] flex flex-col" style={{ background: "#f8fafc" }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={prevQuestion}
              disabled={qIndex === 0}
              className="w-9 h-9 rounded-full bg-white border border-[#e2e8f0] flex items-center justify-center disabled:opacity-30 hover:bg-[#f1f5f9] transition"
            >
              <ArrowRight className="w-4 h-4 rotate-180 text-[#0f172a]" />
            </button>
            <div className="flex-1 h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#f97316]"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-bold text-[#64748b]">{qIndex + 1}/{SCENARIOS.length}</span>
          </div>
        </div>

        {/* Question card */}
        <div className="flex-1 px-5 pb-8 overflow-y-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={qIndex}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: direction * -60, scale: 0.95 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="max-w-sm mx-auto"
            >
              <div className="mb-6">
                <p className="text-[11px] font-bold text-[#f97316] mb-2">SCENARIO {qIndex + 1}</p>
                <h2 className="text-[22px] font-black text-[#0f172a] leading-[1.3]">
                  {scenario.question}
                </h2>
              </div>

              <div className="space-y-3">
                {scenario.options.map((opt, i) => (
                  <motion.button
                    key={opt.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => pickOption(i)}
                    className="w-full text-left bg-white rounded-2xl border-2 border-[#e2e8f0] hover:border-[#0f172a] p-4 transition-all active:bg-[#f8fafc]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#f1f5f9] flex items-center justify-center flex-shrink-0 font-black text-[#475569] text-sm">
                        {String.fromCharCode(65 + i)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[15px] text-[#0f172a]">{opt.label}</p>
                        <p className="text-[12px] text-[#94a3b8] mt-0.5">{opt.desc}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#cbd5e1] flex-shrink-0" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── REVEAL SCREEN ───────────────────────────────────────────
  if (screen === "reveal" && archetype) {
    const meta = ARCHETYPE_META[archetype];
    const Icon = meta.icon;

    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-between p-6" style={{ background: meta.color }}>
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm text-center text-white">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.2 }}
            className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 border border-white/30"
          >
            <Icon className="w-12 h-12 text-white" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-white/70 text-sm font-bold uppercase tracking-wider mb-2"
          >
            Your Archetype
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 150, damping: 14, delay: 0.7 }}
            className="text-4xl font-black mb-2"
          >
            {meta.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-white/85 text-base mb-8"
          >
            {meta.tagline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="flex flex-wrap justify-center gap-2 mb-8"
          >
            {meta.traits.map(t => (
              <span key={t} className="text-xs font-bold bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
                {t}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 w-full max-w-xs"
          >
            <p className="text-[13px] text-white/80 leading-relaxed">
              Based on your answers, you're naturally drawn to <strong>{meta.fieldMatch}</strong>. We'll personalise your roadmap around this.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
          className="w-full max-w-sm pb-safe"
        >
          <Button
            onClick={() => setScreen("details")}
            className="w-full h-14 rounded-2xl bg-white font-bold text-lg shadow-xl"
            style={{ color: meta.color }}
          >
            Continue <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── DETAILS SCREEN (minimal fields) ────────────────────────────────
  if (screen === "details") {
    const meta = ARCHETYPE_META[archetype!];
    const canSubmit = form.name.trim() && form.year && form.field;

    return (
      <div className="min-h-[100dvh] flex flex-col" style={{ background: "#f8fafc" }}>
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setScreen("reveal")}
              className="w-9 h-9 rounded-full bg-white border border-[#e2e8f0] flex items-center justify-center hover:bg-[#f1f5f9] transition"
            >
              <ArrowRight className="w-4 h-4 rotate-180 text-[#0f172a]" />
            </button>
            <h2 className="text-lg font-black text-[#0f172a]">Almost there</h2>
          </div>
          <div className="h-1 bg-[#e2e8f0] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#f97316]" style={{ width: "80%" }} />
          </div>
        </div>

        <div className="flex-1 px-5 pt-6 pb-8 overflow-y-auto max-w-sm mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-6 p-3 bg-white rounded-xl border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: meta.color + "20" }}>
                <meta.icon className="w-5 h-5" style={{ color: meta.color }} />
              </div>
              <div>
                <p className="text-xs text-[#94a3b8] font-medium">Your archetype</p>
                <p className="text-sm font-bold text-[#0f172a]">{meta.title}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#64748b] mb-1.5 block">Name</label>
                <Input
                  autoFocus
                  placeholder="e.g. Aarav"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="h-12 rounded-xl bg-white border-2 border-[#e2e8f0] focus-visible:border-[#0f172a] focus-visible:ring-0 text-[16px] px-4 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748b] mb-1.5 block">Email</label>
                <Input
                  type="email"
                  placeholder="you@college.edu"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="h-12 rounded-xl bg-white border-2 border-[#e2e8f0] focus-visible:border-[#0f172a] focus-visible:ring-0 text-[16px] px-4 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748b] mb-1.5 block">College + City</label>
                <Input
                  placeholder="e.g. PICT Pune"
                  value={form.collegeFull}
                  onChange={e => setForm(f => ({ ...f, collegeFull: e.target.value }))}
                  className="h-12 rounded-xl bg-white border-2 border-[#e2e8f0] focus-visible:border-[#0f172a] focus-visible:ring-0 text-[16px] px-4 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748b] mb-1.5 block">Year</label>
                <div className="grid grid-cols-2 gap-2">
                  {YEARS.map(y => (
                    <button
                      key={y}
                      onClick={() => setForm(f => ({ ...f, year: y }))}
                      className={`h-12 rounded-xl border-2 font-bold text-sm transition-all ${
                        form.year === y
                          ? "border-[#0f172a] bg-[#0f172a] text-white"
                          : "border-[#e2e8f0] bg-white text-[#0f172a] hover:border-[#94a3b8]"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748b] mb-1.5 block">Field</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Web Dev", "AI/ML", "App Dev", "Cybersecurity", "Data"].map(f => (
                    <button
                      key={f}
                      onClick={() => setForm(fm => ({ ...fm, field: f }))}
                      className={`h-11 rounded-xl border-2 font-bold text-[13px] transition-all ${
                        form.field === f
                          ? "border-[#0f172a] bg-[#0f172a] text-white"
                          : "border-[#e2e8f0] bg-white text-[#0f172a] hover:border-[#94a3b8]"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm font-bold text-[#ef4444]">{error}</p>}
            </div>
          </motion.div>
        </div>

        <div className="shrink-0 p-4 pb-6 border-t border-[#e2e8f0] bg-white">
          <div className="max-w-sm mx-auto">
            <Button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="w-full h-14 rounded-2xl bg-[#0f172a] text-white hover:bg-[#1e293b] font-bold text-lg disabled:opacity-40"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Profile <Sparkles className="ml-2 w-5 h-5" /></>}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBMITTING ────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center" style={{ background: "#f8fafc" }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 rounded-2xl bg-[#f97316] flex items-center justify-center mb-6"
      >
        <Sparkles className="w-10 h-10 text-white" />
      </motion.div>
      <h2 className="text-2xl font-black text-[#0f172a] mb-2">Building your profile...</h2>
      <p className="text-[#64748b] text-sm">Your {ARCHETYPE_META[archetype!].title} journey starts now</p>
    </div>
  );
}
