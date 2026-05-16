import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Zap, Loader2, ArrowLeft, User, GraduationCap, Code2, Building2 } from "lucide-react";
import { useCreateStudent } from "@workspace/api-client-react";

type FormData = {
  name: string;
  year: string;
  field: string;
  college: string;
};

type StepDef = {
  key: keyof FormData;
  icon: React.ReactNode;
  label: string;
  question: string;
  subtitle: string;
  type: "text" | "chips";
  placeholder?: string;
  options?: string[];
  skippable?: boolean;
};

const STEPS: StepDef[] = [
  {
    key: "name",
    icon: <User className="w-8 h-8 text-white" />,
    label: "LET'S GET TO KNOW YOU",
    question: "What should we call you?",
    subtitle: "First name works. No formal vibes here.",
    type: "text",
    placeholder: "e.g. Aarav",
  },
  {
    key: "year",
    icon: <GraduationCap className="w-8 h-8 text-white" />,
    label: "TELL US YOUR VIBE",
    question: "Which year are you in?",
    subtitle: "Tap the one that fits — no judgement",
    type: "chips",
    options: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
  },
  {
    key: "field",
    icon: <Code2 className="w-8 h-8 text-white" />,
    label: "OOH, THIS IS THE FUN PART",
    question: "What's your jam?",
    subtitle: "Pick the one that excites you most. Change it anytime.",
    type: "chips",
    options: ["Web Dev", "AI/ML", "App Dev", "Cybersecurity", "Data"],
  },
  {
    key: "college",
    icon: <Building2 className="w-8 h-8 text-white" />,
    label: "ALMOST THERE",
    question: "Which college are you from?",
    subtitle: "Helps us show you the college leaderboard.",
    type: "text",
    placeholder: "e.g. PICT Pune",
    skippable: true,
  },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const inviteCode = typeof window !== "undefined" ? sessionStorage.getItem("inviteCode") : null;
  const inviteCollegeName = typeof window !== "undefined" ? sessionStorage.getItem("inviteCollegeName") : null;
  const inviteCollegeCity = typeof window !== "undefined" ? sessionStorage.getItem("inviteCollegeCity") : null;

  const [screen, setScreen] = useState<"welcome" | "form" | "submitting">("welcome");
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    name: "",
    year: "",
    field: "",
    college: inviteCollegeName
      ? `${inviteCollegeName}${inviteCollegeCity ? " " + inviteCollegeCity : ""}`.trim()
      : "",
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const createStudent = useCreateStudent();

  const visibleSteps = STEPS.filter(s => !(inviteCode && s.key === "college"));
  const step = visibleSteps[stepIdx];
  const isLast = stepIdx === visibleSteps.length - 1;
  const total = visibleSteps.length;

  useEffect(() => {
    if (screen === "form" && step?.type === "text") {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [stepIdx, screen, step?.type]);

  function canProceed() {
    return form[step.key].trim().length > 0 || step.skippable;
  }

  function advance(skipVal?: string) {
    const val = skipVal ?? form[step.key];
    setForm(f => ({ ...f, [step.key]: val }));
    if (isLast) {
      void submit({ ...form, [step.key]: val });
    } else {
      setDirection(1);
      setStepIdx(i => i + 1);
    }
  }

  function goBack() {
    if (stepIdx > 0) {
      setDirection(-1);
      setStepIdx(i => i - 1);
    }
  }

  async function submit(finalForm: FormData) {
    setScreen("submitting");
    setError(null);
    try {
      const yearMap: Record<string, number> = {
        "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4,
      };
      const raw = finalForm.college.trim();
      const parts = raw.split(/\s+/);
      const city = parts.length > 1 ? parts.pop()! : "Unknown";
      const college = parts.join(" ") || raw || "College";

      const student = await createStudent.mutateAsync({
        data: {
          name: finalForm.name.trim() || "Student",
          email: "student@example.com",
          college,
          city,
          year: yearMap[finalForm.year] || 1,
          field: finalForm.field || "Web Dev",
        },
      });

      localStorage.setItem("studentId", student.id.toString());
      localStorage.setItem("studentCollege", student.college || college);
      localStorage.setItem("newUser", "1");

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
      setLocation("/home");
    } catch {
      setError("Something went wrong. Please try again.");
      setScreen("form");
    }
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  /* ── Welcome screen ──────────────────────────────────────── */
  if (screen === "welcome") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-between p-6" style={{ background: "#f8fafc", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Helmet><title>KodeTalent — Create Your Profile</title></Helmet>
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
            className="w-20 h-20 rounded-2xl bg-[#f97316] flex items-center justify-center mb-8"
          >
            <Zap className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-black text-[#0f172a] mb-3 leading-tight"
          >
            Your AI Career<br />Companion
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-[#64748b] text-base mb-8 max-w-[260px]"
          >
            4 quick questions to personalise your journey.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-2"
          >
            {["AI Roadmaps", "Mock Interviews", "Recruiter Connect"].map(l => (
              <span key={l} className="text-[11px] font-semibold text-[#475569] bg-white border border-[#e2e8f0] rounded-full px-3 py-1">
                {l}
              </span>
            ))}
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm pb-safe"
        >
          <button
            data-testid="onboarding-start"
            onClick={() => setScreen("form")}
            className="w-full h-12 rounded-xl bg-[#0f172a] text-white hover:bg-[#1e293b] font-bold text-base flex items-center justify-center gap-2 transition active:scale-[0.97]"
          >
            Get Started <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── Submitting ────────────────────────────────────────────────────── */
  if (screen === "submitting") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-white">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 rounded-2xl bg-[#f97316] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </motion.div>
        <p className="text-[#0f172a] font-bold text-lg">Setting up your profile…</p>
      </div>
    );
  }

  /* ── Form screen ────────────────────────────────────────────────────── */
  const pct = Math.round(((stepIdx) / total) * 100);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Helmet><title>KodeTalent — Create Your Profile</title></Helmet>

      {/* Top bar */}
      <div className="shrink-0 px-5 pt-5 pb-2 flex items-center gap-3">
        <button
          onClick={goBack}
          disabled={stepIdx === 0}
          className="w-9 h-9 rounded-full bg-[#f1f5f9] flex items-center justify-center disabled:opacity-30 transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#0f172a]" />
        </button>
        <div className="flex-1 h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full rounded-full bg-[#4f46e5]"
          />
        </div>
        <span className="text-[13px] font-bold text-[#64748b] w-10 text-right">{stepIdx + 1}/{total}</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-5 pt-6 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={stepIdx}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col flex-1"
          >
            {/* Illustration + label */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#4f46e5] flex items-center justify-center shrink-0 shadow-lg shadow-[#4f46e5]/20">
                {step.icon}
              </div>
              <span className="text-[12px] font-black text-white bg-[#4f46e5] rounded-full px-4 py-2 tracking-wide uppercase">
                {step.label}
              </span>
            </div>

            {/* Question */}
            <h1 className="text-[28px] font-black text-[#0f172a] leading-tight mb-2">
              {step.question}
            </h1>
            <p className="text-[15px] text-[#64748b] mb-8">{step.subtitle}</p>

            {/* Text input */}
            {step.type === "text" && (
              <input
                ref={inputRef}
                data-testid={`onboarding-input-${step.key}`}
                placeholder={step.placeholder}
                value={form[step.key]}
                onChange={e => setForm(f => ({ ...f, [step.key]: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter" && canProceed()) advance(); }}
                className="w-full h-14 px-5 rounded-2xl border-2 border-[#e2e8f0] focus:border-[#4f46e5] outline-none text-[17px] font-semibold text-[#0f172a] placeholder:text-[#cbd5e1] transition-colors bg-white"
              />
            )}

            {/* Chips — 2-column grid */}
            {step.type === "chips" && (
              <div className="grid grid-cols-2 gap-3">
                {step.options!.map(opt => (
                  <button
                    key={opt}
                    data-testid={`onboarding-chip-${opt}`}
                    onClick={() => {
                      setForm(f => ({ ...f, [step.key]: opt }));
                      setTimeout(() => advance(), 120);
                    }}
                    className="h-14 rounded-2xl border-2 font-bold text-[15px] transition-all active:scale-95 flex items-center justify-center"
                    style={{
                      borderColor: form[step.key] === opt ? "#4f46e5" : "#e2e8f0",
                      background: form[step.key] === opt ? "#4f46e5" : "white",
                      color: form[step.key] === opt ? "white" : "#0f172a",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Skip link */}
            {step.skippable && (
              <button
                onClick={() => advance("")}
                className="mt-6 text-[14px] text-[#94a3b8] hover:text-[#64748b] text-left font-medium transition-colors"
              >
                Skip — I'll add it later
              </button>
            )}

            {error && (
              <p className="mt-4 text-sm font-bold text-[#ef4444]">{error}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA — only for text steps */}
      {step.type === "text" && (
        <div className="shrink-0 px-5 pb-10 pt-4">
          <button
            data-testid="onboarding-next"
            onClick={() => advance()}
            disabled={!canProceed()}
            className="w-full h-14 rounded-2xl font-black text-[17px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-30"
            style={{ background: canProceed() ? "#4f46e5" : "#e2e8f0", color: canProceed() ? "white" : "#94a3b8" }}
          >
            {isLast ? "Let's go" : "Next"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
