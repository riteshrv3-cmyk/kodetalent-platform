import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Zap, Loader2, Send, Check } from "lucide-react";
import { useCreateStudent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormData = {
  name: string;
  year: string;
  field: string;
  collegeFull: string;
};

type Step = {
  key: keyof FormData;
  ask: string;
  react?: (val: string) => string;
  type: "text" | "chips";
  placeholder?: string;
  options?: string[];
};

const STEPS: Step[] = [
  {
    key: "name",
    ask: "Hey! I'm Kode, your AI career companion. What should I call you?",
    react: v => `Nice to meet you, ${v.split(" ")[0]}!`,
    type: "text",
    placeholder: "e.g. Aarav",
  },
  {
    key: "year",
    ask: "Which year are you in right now?",
    react: v => ({
      "1st Year": "Fresh start — best time to build habits!",
      "2nd Year": "Perfect time to go deep into your domain.",
      "3rd Year": "Internship season is coming. Let's prep.",
      "4th Year": "Placement mode. We'll hustle together.",
    }[v] ?? "Let's get to work."),
    type: "chips",
    options: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
  },
  {
    key: "field",
    ask: "What excites you the most?",
    react: v => ({
      "Web Dev": "Solid pick — always in demand.",
      "AI/ML": "The hottest field right now.",
      "App Dev": "Mobile apps run the world.",
      "Cybersecurity": "Security experts are rare and valued.",
      "Data": "Data is the new oil. Great call.",
    }[v] ?? "Great — I'll tailor your roadmap around this."),
    type: "chips",
    options: ["Web Dev", "AI/ML", "App Dev", "Cybersecurity", "Data"],
  },
  {
    key: "collegeFull",
    ask: "Which college are you from?",
    react: () => "Perfect. Your profile is ready — let's go!",
    type: "text",
    placeholder: "e.g. PICT Pune",
  },
];

type Msg = { role: "ai" | "user"; text: string };

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-4 px-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const inviteCode = typeof window !== "undefined" ? sessionStorage.getItem("inviteCode") : null;
  const inviteCollegeName = typeof window !== "undefined" ? sessionStorage.getItem("inviteCollegeName") : null;
  const inviteCollegeCity = typeof window !== "undefined" ? sessionStorage.getItem("inviteCollegeCity") : null;

  const [screen, setScreen] = useState<"welcome" | "chat" | "submitting">("welcome");
  const [stepIdx, setStepIdx] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [form, setForm] = useState<FormData>({
    name: "", year: "", field: "",
    collegeFull: inviteCollegeName
      ? `${inviteCollegeName}${inviteCollegeCity ? " " + inviteCollegeCity : ""}`.trim()
      : "",
  });
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createStudent = useCreateStudent();

  const visibleSteps = STEPS.filter(s => !(inviteCode && s.key === "collegeFull"));
  const step = visibleSteps[stepIdx];
  const isLast = stepIdx === visibleSteps.length - 1;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  useEffect(() => {
    if (screen === "chat" && step?.type === "text" && !typing) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [stepIdx, typing, screen, step?.type]);

  async function pushAI(text: string, delay = 500) {
    setTyping(true);
    await new Promise(r => setTimeout(r, delay));
    setTyping(false);
    setMsgs(m => [...m, { role: "ai", text }]);
  }

  async function startChat() {
    setScreen("chat");
    await pushAI(STEPS[0].ask, 400);
  }

  async function handleAnswer(val: string) {
    const trimmed = val.trim();
    if (!trimmed || typing) return;

    setMsgs(m => [...m, { role: "user", text: trimmed }]);
    setInputVal("");
    setForm(f => ({ ...f, [step.key]: trimmed }));

    if (step.react) {
      await pushAI(step.react(trimmed), 380);
    }

    if (isLast) {
      await submit({ ...form, [step.key]: trimmed });
      return;
    }

    const nextStep = visibleSteps[stepIdx + 1];
    await pushAI(nextStep.ask, 300);
    setStepIdx(i => i + 1);
  }

  async function submit(finalForm: FormData) {
    setScreen("submitting");
    try {
      const yearMap: Record<string, number> = {
        "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4,
      };
      const parts = finalForm.collegeFull.trim().split(/\s+/);
      const city = parts.length > 1 ? parts.pop()! : "Unknown";
      const college = parts.join(" ") || finalForm.collegeFull || "College";

      const student = await createStudent.mutateAsync({
        data: {
          name: finalForm.name.trim() || "Student",
          email: "student@example.com",
          college, city,
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
      setTimeout(() => setLocation("/home"), 1200);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
      setScreen("chat");
    }
  }

  // ── Welcome ─────────────────────────────────────────────────
  if (screen === "welcome") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-between p-6" style={{ background: "#f8fafc" }}>
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
          <Button
            data-testid="onboarding-start"
            onClick={startChat}
            className="w-full h-12 rounded-xl bg-[#0f172a] text-white hover:bg-[#1e293b] font-bold text-base"
          >
            Get Started <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Submitting ────────────────────────────────────────────────
  if (screen === "submitting") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center" style={{ background: "#f8fafc" }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-2xl bg-[#f97316] flex items-center justify-center mb-5"
        >
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </motion.div>
        <h2 className="text-xl font-black text-[#0f172a] mb-1">Setting things up...</h2>
        <p className="text-[#64748b] text-sm">Your career companion is ready soon</p>
      </div>
    );
  }

  // ── Chat ──────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#f8fafc" }}>
      <Helmet><title>KodeTalent — Create Your Profile</title></Helmet>

      {/* Header */}
      <div className="shrink-0 bg-white border-b border-[#e2e8f0] px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#f97316] flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-[#0f172a]">Kode</p>
          <p className="text-[11px] text-[#10b981] font-semibold">Online</p>
        </div>
        {/* Step dots */}
        <div className="flex gap-1.5">
          {visibleSteps.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i <= stepIdx ? "#f97316" : "#e2e8f0" }}
            />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {msgs.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
            >
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${
                msg.role === "ai"
                  ? "bg-white border border-[#e2e8f0] text-[#0f172a] rounded-tl-sm"
                  : "bg-[#0f172a] text-white rounded-tr-sm"
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {typing && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-[#e2e8f0] rounded-2xl rounded-tl-sm px-4 py-3">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chip options */}
        {step?.type === "chips" && !typing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 justify-end"
          >
            {step.options!.map(opt => (
              <button
                key={opt}
                data-testid={`onboarding-chip-${opt}`}
                onClick={() => void handleAnswer(opt)}
                className="h-10 px-4 rounded-full border border-[#e2e8f0] bg-white text-[#0f172a] font-semibold text-[14px] hover:border-[#0f172a] hover:bg-[#f8fafc] transition active:scale-[0.97]"
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}

        {error && (
          <p className="text-center text-sm font-bold text-[#ef4444]">{error}</p>
        )}
      </div>

      {/* Input bar — only for text steps */}
      {step?.type === "text" && (
        <div className="shrink-0 bg-white border-t border-[#e2e8f0] p-3 pb-6">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <Input
              ref={inputRef}
              placeholder={step.placeholder ?? "Type here..."}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && inputVal.trim() && !typing) {
                  e.preventDefault();
                  void handleAnswer(inputVal);
                }
              }}
              className="h-11 rounded-full bg-[#f8fafc] border border-[#e2e8f0] focus-visible:border-[#0f172a] focus-visible:ring-0 text-[15px] px-5 font-medium text-[#0f172a]"
              data-testid={`onboarding-input-${step.key}`}
            />
            <button
              onClick={() => void handleAnswer(inputVal)}
              disabled={!inputVal.trim() || typing}
              className="w-11 h-11 rounded-full bg-[#0f172a] flex items-center justify-center shrink-0 disabled:opacity-30 transition hover:bg-[#1e293b] active:scale-95"
            >
              {isLast ? <Check className="w-5 h-5 text-white" /> : <Send className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
