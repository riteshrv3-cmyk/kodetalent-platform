import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Zap, Loader2 } from "lucide-react";
import { useCreateStudent } from "@workspace/api-client-react";

type FormData = {
  name: string;
  year: string;
  field: string;
  college: string;
};

type Step = {
  key: keyof FormData;
  question: string;
  subtitle: string;
  type: "text" | "chips";
  placeholder?: string;
  options?: string[];
  skippable?: boolean;
};

const STEPS: Step[] = [
  {
    key: "name",
    question: "What should we call you?",
    subtitle: "First name works. No formal vibes here.",
    type: "text",
    placeholder: "e.g. Aarav",
    skippable: false,
  },
  {
    key: "year",
    question: "Which year are you in?",
    subtitle: "We'll tailor your roadmap around this.",
    type: "chips",
    options: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
  },
  {
    key: "field",
    question: "What excites you the most?",
    subtitle: "Pick your domain — we'll personalise everything.",
    type: "chips",
    options: ["Web Dev", "AI/ML", "App Dev", "Cybersecurity", "Data"],
  },
  {
    key: "college",
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

  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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
  const value = form[step.key];

  useEffect(() => {
    if (step.type === "text") {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [stepIdx, step.type]);

  function canProceed() {
    return value.trim().length > 0 || step.skippable;
  }

  function advance(skipVal?: string) {
    const val = skipVal ?? value;
    setForm(f => ({ ...f, [step.key]: val }));
    if (isLast) {
      void submit({ ...form, [step.key]: val });
    } else {
      setDirection(1);
      setStepIdx(i => i + 1);
    }
  }

  async function submit(finalForm: FormData) {
    setSubmitting(true);
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
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-white">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-2xl bg-[#f97316] flex items-center justify-center"
        >
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </motion.div>
        <p className="text-[#0f172a] font-bold text-lg">Setting up your profile…</p>
      </div>
    );
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white relative" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Helmet><title>KodeTalent — Create Your Profile</title></Helmet>

      {/* Top bar */}
      <div className="shrink-0 px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl bg-[#f97316] flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {/* Step progress pills */}
        <div className="flex gap-1.5">
          {visibleSteps.map((_, i) => (
            <motion.div
              key={i}
              animate={{ width: i === stepIdx ? 24 : 8, opacity: i <= stepIdx ? 1 : 0.25 }}
              transition={{ duration: 0.3 }}
              className="h-2 rounded-full bg-[#4f46e5]"
            />
          ))}
        </div>
      </div>

      {/* Content — animated per step, centered on screen */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={stepIdx}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-sm"
          >
            {/* Question */}
            <h1 className="text-[28px] font-black text-[#0f172a] leading-tight mb-2">
              {step.question}
            </h1>
            <p className="text-[15px] text-[#64748b] mb-8">{step.subtitle}</p>

            {/* Input: text */}
            {step.type === "text" && (
              <input
                ref={inputRef}
                data-testid={`onboarding-input-${step.key}`}
                placeholder={step.placeholder}
                value={value}
                onChange={e => setForm(f => ({ ...f, [step.key]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === "Enter" && canProceed()) advance();
                }}
                className="w-full h-14 px-5 rounded-2xl border-2 border-[#e2e8f0] focus:border-[#4f46e5] outline-none text-[17px] font-semibold text-[#0f172a] placeholder:text-[#cbd5e1] transition-colors bg-white"
              />
            )}

            {/* Input: chips */}
            {step.type === "chips" && (
              <div className="flex flex-wrap gap-3">
                {step.options!.map(opt => (
                  <button
                    key={opt}
                    data-testid={`onboarding-chip-${opt}`}
                    onClick={() => {
                      setForm(f => ({ ...f, [step.key]: opt }));
                      setTimeout(() => advance(), 120);
                    }}
                    className="px-5 py-3 rounded-2xl border-2 font-bold text-[15px] transition-all active:scale-95"
                    style={{
                      borderColor: value === opt ? "#4f46e5" : "#e2e8f0",
                      background: value === opt ? "#4f46e5" : "white",
                      color: value === opt ? "white" : "#0f172a",
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
                className="mt-4 text-[14px] text-[#94a3b8] hover:text-[#64748b] text-left font-medium transition-colors"
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

      {/* Bottom CTA — only for text steps (chips auto-advance) */}
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
