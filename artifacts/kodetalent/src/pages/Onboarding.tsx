import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Check, Sparkles, GraduationCap, Code2,
  Building2, Github, Trophy, Target, User, Mail, Loader2, Zap,
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
    title: "What should we call you?",
    subtitle: "First name works. No formal vibes here.",
    type: "text", placeholder: "e.g. Aarav", optional: true,
  },
  {
    key: "email", icon: Mail, emoji: "📬",
    title: "Drop your email",
    subtitle: "So you can come back to your progress anytime",
    type: "email", placeholder: "you@college.edu", optional: true,
  },
  {
    key: "year", icon: GraduationCap, emoji: "🎓",
    title: "Which year are you in?",
    subtitle: "Tap the one that fits — no judgement",
    type: "chips", options: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    optional: true,
  },
  {
    key: "field", icon: Code2, emoji: "💻",
    title: "What's your jam?",
    subtitle: "Pick the one that excites you most. Change it anytime.",
    type: "chips",
    options: ["Web Dev", "AI/ML", "App Dev", "Cybersecurity", "Data"],
    optional: true,
  },
  {
    key: "collegeFull", icon: Building2, emoji: "🏫",
    title: "Where you studying?",
    subtitle: "College + city, like PICT Pune or VIT Vellore",
    type: "text", placeholder: "College name + City", optional: true,
  },
  {
    key: "cgpa", icon: Trophy, emoji: "📊",
    title: "Current CGPA?",
    subtitle: "Out of 10. Be honest, recruiters check 😉",
    type: "text", placeholder: "e.g. 8.4", optional: true,
  },
  {
    key: "githubUrl", icon: Github, emoji: "🐙",
    title: "GitHub profile?",
    subtitle: "Paste the URL — our AI will analyse your repos",
    type: "text", placeholder: "github.com/username",
    optional: true,
    showIf: d => d.year === "3rd Year" || d.year === "4th Year",
  },
  {
    key: "dreamCompany", icon: Sparkles, emoji: "✨",
    title: "Dream company?",
    subtitle: "We'll secretly bias your roadmap towards them 🤫",
    type: "text", placeholder: "e.g. Google, Razorpay, OpenAI",
    optional: true,
  },
  {
    key: "targetPackage", icon: Target, emoji: "🎯",
    title: "Goal package?",
    subtitle: "Dream big — we love an ambitious answer",
    type: "chips",
    options: ["<6 LPA", "6–10 LPA", "10–20 LPA", "20+ LPA"],
    optional: true,
  },
];

// Hype line above each question — keeps energy up
const FIELD_TONE: Record<string, string> = {
  "Web Dev": "#4f46e5",
  "AI/ML": "#f97316",
  "App Dev": "#10b981",
  "Cybersecurity": "#0f172a",
  "Data": "#0ea5e9",
};

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const inviteCode = typeof window !== "undefined" ? sessionStorage.getItem("inviteCode") : null;
  const inviteCollegeName = typeof window !== "undefined" ? sessionStorage.getItem("inviteCollegeName") : null;
  const inviteCollegeCity = typeof window !== "undefined" ? sessionStorage.getItem("inviteCollegeCity") : null;
  const [data, setData] = useState<FormData>(() => ({
    ...initialData,
    collegeFull: inviteCollegeName ? `${inviteCollegeName}${inviteCollegeCity ? " " + inviteCollegeCity : ""}`.trim() : "",
  }));
  const [stepIdx, setStepIdx] = useState(-1); // -1 = welcome screen
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createStudent = useCreateStudent();

  const visibleSteps = useMemo(
    () => STEPS.filter(s => !s.showIf || s.showIf(data)).filter(s => !(inviteCode && s.key === "collegeFull")),
    [data, inviteCode]
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
    if (isLast) { void submit(); return; }
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
      if (inviteCode) {
        try {
          await fetch(`/api/invite/${encodeURIComponent(inviteCode)}/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId: student.id }),
          });
        } catch (e) { console.warn("invite claim failed", e); }
        sessionStorage.removeItem("inviteCode");
        sessionStorage.removeItem("inviteCollegeName");
        sessionStorage.removeItem("inviteCollegeCity");
      }
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
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center" style={{ background: "#f8fafc" }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-2xl bg-[#f97316] flex items-center justify-center mb-6"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-xl font-black text-[#0f172a] mb-2">Building your profile…</h2>
        <p className="text-[#64748b] text-sm mb-8">Setting up your career companion</p>
        <div className="w-full max-w-xs h-1 bg-[#e2e8f0] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#f97316] rounded-full"
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
      <div className="min-h-[100dvh] flex flex-col items-center justify-between p-6 text-center" style={{ background: "#f8fafc" }}>
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className="w-20 h-20 rounded-2xl bg-[#f97316] flex items-center justify-center mb-8"
          >
            <Zap className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h1
            initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-3xl font-black text-[#0f172a] mb-3 leading-tight"
          >
            Your AI Career<br />Companion
          </motion.h1>
          <motion.p
            initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-[#64748b] text-base mb-10 max-w-xs"
          >
            A few quick questions and you'll be ready to go.
          </motion.p>
          <motion.div
            initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap justify-center gap-2 w-full max-w-sm"
          >
            {[
              "Personalised roadmap",
              "Real opportunities",
              "Recruiter network",
            ].map(l => (
              <span key={l} className="text-[11px] font-semibold text-[#475569] bg-white border border-[#e2e8f0] rounded-full px-3 py-1">
                {l}
              </span>
            ))}
          </motion.div>
        </div>
        <motion.div
          initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="w-full max-w-sm pb-safe"
        >
          <Button
            data-testid="onboarding-start"
            onClick={() => setStepIdx(0)}
            className="w-full h-12 rounded-xl bg-[#0f172a] text-white hover:bg-[#1e293b] font-bold text-base"
          >
            Get Started <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Question screen ──────────────────────────────────────────
  if (!step) return null;
  const Icon = step.icon;
  const tone = FIELD_TONE[data.field] || "#4f46e5";

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
          <div className="flex-1 h-1 bg-[#e2e8f0] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: tone }}
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
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 14 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-white mb-4"
              style={{ backgroundColor: tone }}
            >
              <Icon className="w-6 h-6" />
            </motion.div>
            <p className="text-[11px] font-bold text-[#94a3b8] mb-1">
              Step {stepIdx + 1} of {visibleSteps.length}
            </p>
            <h1 className="text-[28px] font-black text-[#0f172a] leading-[1.15] mb-2">
              {step.title}
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
                      className={`relative h-14 rounded-xl border font-bold text-[15px] transition-all ${
                        selected
                          ? "text-white border-transparent shadow-sm"
                          : "bg-white border-[#e2e8f0] text-[#0f172a] hover:border-[#94a3b8]"
                      }`}
                      style={selected ? { backgroundColor: tone } : undefined}
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
                className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#94a3b8] hover:text-[#4f46e5] transition px-3 py-1.5 rounded-full hover:bg-[#eef2ff]"
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

      {/* Continue bar (hidden for chip steps which auto-advance) */}
      {step.type !== "chips" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe z-20">
          <div className="max-w-md mx-auto">
            <Button
              onClick={next}
              disabled={!canContinue}
              data-testid="onboarding-continue"
              className="w-full h-12 rounded-xl font-bold text-base text-white shadow-sm disabled:opacity-40 disabled:shadow-none"
              style={{ backgroundColor: tone }}
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
