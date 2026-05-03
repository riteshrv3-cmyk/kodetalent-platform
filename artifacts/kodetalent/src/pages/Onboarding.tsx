import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Check, Sparkles, GraduationCap, Code2,
  Building2, Github, Trophy, Target, User, Mail, Loader2,
} from "lucide-react";
import { useCreateStudent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormData = {
  name: string;
  email: string;
  year: string;
  field: string;
  collegeFull: string;
  cgpa: string;
  githubUrl: string;
  dreamCompany: string;
  targetPackage: string;
};

const initialData: FormData = {
  name: "", email: "", year: "", field: "", collegeFull: "",
  cgpa: "", githubUrl: "", dreamCompany: "", targetPackage: "",
};

type Step = {
  key: keyof FormData;
  icon: typeof User;
  emoji: string;
  title: string;
  subtitle: string;
  type: "text" | "email" | "chips";
  placeholder?: string;
  options?: string[];
  optional?: boolean;
  showIf?: (d: FormData) => boolean;
};

const STEPS: Step[] = [
  {
    key: "name", icon: User, emoji: "👋",
    title: "What's your name?",
    subtitle: "Let's start with the basics",
    type: "text", placeholder: "e.g. Aarav Sharma",
  },
  {
    key: "email", icon: Mail, emoji: "📧",
    title: "Your email address",
    subtitle: "We'll use this to save your progress",
    type: "email", placeholder: "you@college.edu",
  },
  {
    key: "year", icon: GraduationCap, emoji: "🎓",
    title: "Which year are you in?",
    subtitle: "So we tailor the right opportunities",
    type: "chips", options: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
  },
  {
    key: "field", icon: Code2, emoji: "💻",
    title: "Pick your field",
    subtitle: "Don't worry, you can change this later",
    type: "chips",
    options: ["Web Dev", "AI/ML", "App Dev", "Cybersecurity", "Data"],
  },
  {
    key: "collegeFull", icon: Building2, emoji: "🏫",
    title: "Your college and city",
    subtitle: "e.g. PICT Pune or VIT Vellore",
    type: "text", placeholder: "College name + City",
  },
  {
    key: "cgpa", icon: Trophy, emoji: "📊",
    title: "Current CGPA?",
    subtitle: "Out of 10 — recruiters love seeing it",
    type: "text", placeholder: "e.g. 8.4", optional: true,
  },
  {
    key: "githubUrl", icon: Github, emoji: "🐙",
    title: "GitHub profile?",
    subtitle: "Paste the URL, we'll auto-analyze it later",
    type: "text", placeholder: "https://github.com/username",
    optional: true,
    showIf: d => d.year === "3rd Year" || d.year === "4th Year",
  },
  {
    key: "dreamCompany", icon: Sparkles, emoji: "✨",
    title: "Dream company?",
    subtitle: "We'll tune your roadmap towards them",
    type: "text", placeholder: "e.g. Google, Razorpay, OpenAI",
    optional: true,
  },
  {
    key: "targetPackage", icon: Target, emoji: "🎯",
    title: "Salary you're aiming for?",
    subtitle: "Tap one — totally fine to dream big",
    type: "chips",
    options: ["<6 LPA", "6–10 LPA", "10–20 LPA", "20+ LPA"],
  },
];

const FIELD_TONE: Record<string, string> = {
  "Web Dev": "from-[#4f46e5] to-[#7c3aed]",
  "AI/ML": "from-[#ec4899] to-[#f59e0b]",
  "App Dev": "from-[#10b981] to-[#0ea5e9]",
  "Cybersecurity": "from-[#0f172a] to-[#4f46e5]",
  "Data": "from-[#0ea5e9] to-[#10b981]",
};

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<FormData>(initialData);
  const [stepIdx, setStepIdx] = useState(-1); // -1 = welcome screen
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createStudent = useCreateStudent();

  const visibleSteps = useMemo(
    () => STEPS.filter(s => !s.showIf || s.showIf(data)),
    [data]
  );

  const step = stepIdx >= 0 ? visibleSteps[stepIdx] : null;
  const value = step ? data[step.key] : "";
  const progress = step ? Math.round(((stepIdx + 1) / visibleSteps.length) * 100) : 0;
  const isLast = stepIdx === visibleSteps.length - 1;
  const canContinue = step ? (step.optional || value.trim().length > 0) : true;

  function setVal(v: string) {
    if (!step) return;
    setData(d => ({ ...d, [step.key]: v }));
  }

  function next() {
    if (!step || !canContinue) return;
    if (isLast) return submit();
    setStepIdx(i => i + 1);
  }

  function back() {
    if (stepIdx > 0) setStepIdx(i => i - 1);
    else if (stepIdx === 0) setStepIdx(-1);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const yearMap: Record<string, number> = {
        "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4,
      };
      const parts = data.collegeFull.trim().split(/\s+/);
      const city = parts.length > 1 ? parts.pop()! : "Unknown";
      const college = parts.join(" ") || data.collegeFull || "College";

      const student = await createStudent.mutateAsync({
        data: {
          name: data.name.trim() || "Student",
          email: data.email.trim() || "student@example.com",
          college,
          city,
          year: yearMap[data.year] || 1,
          field: data.field || "Web Dev",
          githubUrl: data.githubUrl.trim() || undefined,
          cgpa: data.cgpa.trim() || undefined,
          dreamCompany: data.dreamCompany.trim() || undefined,
          targetPackage: data.targetPackage || undefined,
        },
      });
      localStorage.setItem("studentId", student.id.toString());
      localStorage.setItem("studentCollege", student.college || college);
      setTimeout(() => setLocation("/home"), 1400);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Tap continue to retry.");
      setSubmitting(false);
    }
  }

  // ── Submitting screen ────────────────────────────────────────
  if (submitting) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-[#4f46e5] via-[#7c3aed] to-[#ec4899] flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-6 shadow-2xl"
        >
          <Sparkles className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-2xl font-black text-white mb-2">Building your career profile…</h2>
        <p className="text-white/80 text-sm mb-8">Setting up your AI companion</p>
        <div className="w-full max-w-xs h-1.5 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        </div>
      </div>
    );
  }

  // ── Welcome screen ───────────────────────────────────────────
  if (stepIdx === -1) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-[#4f46e5] via-[#7c3aed] to-[#ec4899] flex flex-col items-center justify-between p-6 text-center text-white">
        <div className="flex-1 flex flex-col items-center justify-center max-w-md">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className="w-28 h-28 rounded-[28px] bg-white/15 backdrop-blur-md flex items-center justify-center text-5xl mb-8 shadow-2xl"
          >
            ⭐
          </motion.div>
          <motion.h1
            initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-4xl font-black mb-3 leading-tight"
          >
            Your AI Career<br />Companion
          </motion.h1>
          <motion.p
            initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-white/85 text-base mb-10 max-w-xs"
          >
            We'll set you up in under a minute. 9 quick questions, then you're in.
          </motion.p>
          <motion.div
            initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="grid grid-cols-3 gap-3 w-full max-w-sm mb-2"
          >
            {[
              { e: "🎯", l: "Personalised roadmap" },
              { e: "🚀", l: "Real opportunities" },
              { e: "🤝", l: "Recruiter network" },
            ].map(it => (
              <div key={it.l} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
                <div className="text-2xl mb-1">{it.e}</div>
                <div className="text-[10px] font-bold text-white/90 leading-tight">{it.l}</div>
              </div>
            ))}
          </motion.div>
        </div>
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-md pb-safe"
        >
          <Button
            data-testid="onboarding-start"
            onClick={() => setStepIdx(0)}
            className="w-full h-14 rounded-2xl bg-white text-[#4f46e5] hover:bg-white/95 font-extrabold text-base shadow-2xl"
          >
            Get Started <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-[11px] text-white/60 mt-3">Free forever · No credit card</p>
        </motion.div>
      </div>
    );
  }

  // ── Question screen ──────────────────────────────────────────
  if (!step) return null;
  const Icon = step.icon;
  const tone = FIELD_TONE[data.field] || "from-[#4f46e5] to-[#7c3aed]";

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] flex flex-col max-w-md mx-auto">
      {/* Progress header */}
      <div className="sticky top-0 z-10 bg-[#f8fafc] px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={back}
            data-testid="onboarding-back"
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 hover:bg-[#f1f5f9] transition"
          >
            <ArrowLeft className="w-4 h-4 text-[#0f172a]" />
          </button>
          <div className="flex-1 h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${tone} rounded-full`}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <span className="text-xs font-extrabold text-[#64748b] tabular-nums">
            {stepIdx + 1}/{visibleSteps.length}
          </span>
        </div>
      </div>

      {/* Question card */}
      <div className="flex-1 px-5 pt-4 pb-32 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${tone} text-white text-2xl mb-5 shadow-lg`}>
              <Icon className="w-7 h-7" />
            </div>
            <h1 className="text-[26px] font-black text-[#0f172a] leading-tight mb-2">
              {step.emoji} {step.title}
            </h1>
            <p className="text-[15px] text-[#64748b] mb-6">{step.subtitle}</p>

            {step.type === "chips" ? (
              <div className="grid grid-cols-2 gap-3">
                {step.options!.map(opt => {
                  const selected = value === opt;
                  return (
                    <motion.button
                      key={opt}
                      data-testid={`onboarding-chip-${opt}`}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setVal(opt);
                        setTimeout(() => {
                          if (isLast) submit();
                          else setStepIdx(i => i + 1);
                        }, 220);
                      }}
                      className={`relative h-16 rounded-2xl border-2 font-bold text-[15px] transition-all ${
                        selected
                          ? `bg-gradient-to-br ${tone} text-white border-transparent shadow-lg`
                          : "bg-white border-[#e2e8f0] text-[#0f172a] hover:border-[#4f46e5]/40"
                      }`}
                    >
                      {opt}
                      {selected && (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-white" />
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <Input
                autoFocus
                type={step.type === "email" ? "email" : "text"}
                inputMode={step.type === "email" ? "email" : undefined}
                placeholder={step.placeholder}
                value={value}
                onChange={e => setVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && canContinue) next(); }}
                className="h-14 rounded-2xl bg-white border-2 border-[#e2e8f0] focus-visible:border-[#4f46e5] focus-visible:ring-0 text-[16px] px-5 font-medium text-[#0f172a]"
                data-testid={`onboarding-input-${step.key}`}
              />
            )}

            {step.optional && (
              <button
                onClick={() => { setVal(""); next(); }}
                data-testid="onboarding-skip"
                className="mt-4 text-sm font-bold text-[#94a3b8] hover:text-[#64748b] transition"
              >
                Skip for now →
              </button>
            )}

            {error && (
              <p className="mt-4 text-sm font-bold text-[#ef4444]">{error}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Continue bar (hidden for chip steps which auto-advance) */}
      {step.type !== "chips" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent z-20">
          <div className="max-w-md mx-auto">
            <Button
              onClick={next}
              disabled={!canContinue}
              data-testid="onboarding-continue"
              className={`w-full h-14 rounded-2xl font-extrabold text-base text-white shadow-lg disabled:opacity-40 disabled:shadow-none bg-gradient-to-r ${tone}`}
            >
              {isLast ? (
                <>{submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finish <Sparkles className="ml-2 w-5 h-5" /></>}</>
              ) : (
                <>Continue <ArrowRight className="ml-2 w-5 h-5" /></>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
