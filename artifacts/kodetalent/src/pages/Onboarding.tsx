import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, Sparkles, Zap, Loader2, Send,
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

type StepDef = {
  key: keyof FormData;
  aiText: string;
  aiFollowup?: (val: string) => string;
  type: "text" | "email" | "chips";
  placeholder?: string;
  options?: string[];
  optional?: boolean;
  showIf?: (d: FormData) => boolean;
};

const STEP_DEFS: StepDef[] = [
  {
    key: "name",
    aiText: "Hi there! I'm Kode, your AI career companion. Let's get you set up — won't take more than a minute. What should I call you?",
    aiFollowup: (v) => `Nice to meet you, ${v.split(" ")[0]}! Let's build something great together.`,
    type: "text", placeholder: "e.g. Aarav", optional: true,
  },
  {
    key: "email",
    aiText: "Drop your email so you can pick up where you left off anytime.",
    aiFollowup: () => "Got it. Your progress is safe with us.",
    type: "email", placeholder: "you@college.edu", optional: true,
  },
  {
    key: "year",
    aiText: "Which year are you in right now?",
    aiFollowup: (v) => {
      const map: Record<string, string> = {
        "1st Year": "Fresh start! Best time to build habits.",
        "2nd Year": "Perfect time to go deep into your field.",
        "3rd Year": "Internship season incoming. Let's prep.",
        "4th Year": "Placement mode. We'll hustle together.",
      };
      return map[v] || "Great, let's get to work.";
    },
    type: "chips", options: ["1st Year", "2nd Year", "3rd Year", "4th Year"], optional: true,
  },
  {
    key: "field",
    aiText: "What field excites you the most?",
    aiFollowup: (v) => {
      const map: Record<string, string> = {
        "Web Dev": "Web dev is always in demand. Solid pick.",
        "AI/ML": "AI/ML — the hottest field right now.",
        "App Dev": "Mobile apps run the world. Smart choice.",
        "Cybersecurity": "Security experts are rare and valued.",
        "Data": "Data is the new oil. Great direction.",
      };
      return map[v] || "Love it! We'll tailor everything for this.";
    },
    type: "chips", options: ["Web Dev", "AI/ML", "App Dev", "Cybersecurity", "Data"], optional: true,
  },
  {
    key: "collegeFull",
    aiText: "Where are you studying? (College + city)",
    aiFollowup: () => "Noted. We'll connect you with peers from there.",
    type: "text", placeholder: "e.g. PICT Pune", optional: true,
  },
  {
    key: "cgpa",
    aiText: "What's your current CGPA? Be honest — we use it to calibrate your roadmap.",
    aiFollowup: (v) => {
      const n = parseFloat(v);
      if (n >= 9) return `${v}? That's excellent. Top companies will notice.`;
      if (n >= 7.5) return `${v} is a strong foundation. Let's push it higher.`;
      return "No worries — skills matter more than grades here.";
    },
    type: "text", placeholder: "e.g. 8.4", optional: true,
  },
  {
    key: "githubUrl",
    aiText: "Have a GitHub profile? Paste the link and I'll analyse your repos.",
    aiFollowup: () => "I'll scan your repos once we're in. Recruiters love active profiles.",
    type: "text", placeholder: "github.com/username", optional: true,
    showIf: d => d.year === "3rd Year" || d.year === "4th Year",
  },
  {
    key: "dreamCompany",
    aiText: "Who's your dream company?",
    aiFollowup: (v) => `${v}? Ambitious. I'll bias your roadmap towards tier-1 prep.`,
    type: "text", placeholder: "e.g. Google, Razorpay", optional: true,
  },
  {
    key: "targetPackage",
    aiText: "What's your target package range?",
    aiFollowup: () => "Locked in. Let's make it happen.",
    type: "chips", options: ["<6 LPA", "6–10 LPA", "10–20 LPA", "20+ LPA"], optional: true,
  },
];

const FIELD_TONE: Record<string, string> = {
  "Web Dev": "#4f46e5", "AI/ML": "#f97316", "App Dev": "#10b981",
  "Cybersecurity": "#0f172a", "Data": "#0ea5e9",
};

// ── Tiny inline components ───────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-5">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function Onboarding() {
  const [, setLocation] = useLocation();
  const inviteCode = typeof window !== "undefined" ? sessionStorage.getItem("inviteCode") : null;
  const inviteCollegeName = typeof window !== "undefined" ? sessionStorage.getItem("inviteCollegeName") : null;
  const inviteCollegeCity = typeof window !== "undefined" ? sessionStorage.getItem("inviteCollegeCity") : null;
  const [data, setData] = useState<FormData>(() => ({
    ...initialData,
    collegeFull: inviteCollegeName ? `${inviteCollegeName}${inviteCollegeCity ? " " + inviteCollegeCity : ""}`.trim() : "",
  }));
  const [stepIdx, setStepIdx] = useState(-1); // -1 = welcome
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<{ role: "ai" | "user"; text: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createStudent = useCreateStudent();

  const visibleSteps = useMemo(
    () => STEP_DEFS.filter(s => !s.showIf || s.showIf(data)).filter(s => !(inviteCode && s.key === "collegeFull")),
    [data, inviteCode]
  );

  const step = stepIdx >= 0 ? visibleSteps[stepIdx] : null;
  const isLast = stepIdx === visibleSteps.length - 1;
  const tone = FIELD_TONE[data.field] || "#4f46e5";

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, typing, stepIdx]);

  // Focus input when a text step appears
  useEffect(() => {
    if (step && step.type !== "chips" && !typing && !submitting) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [step, typing, submitting]);

  function pushHistory(role: "ai" | "user", text: string) {
    setHistory(h => [...h, { role, text }]);
  }

  async function aiSay(text: string, delay = 600) {
    setTyping(true);
    await new Promise(r => setTimeout(r, delay));
    setTyping(false);
    pushHistory("ai", text);
  }

  function setFormVal(key: keyof FormData, val: string) {
    setData(d => ({ ...d, [key]: val }));
  }

  async function handleUserResponse(val: string) {
    if (!step || submitting) return;
    const trimmed = val.trim();
    if (!trimmed && !step.optional) return;

    // Show user bubble immediately
    pushHistory("user", trimmed || "Skipped");
    setInputVal("");

    // Save data
    setFormVal(step.key, trimmed);

    // AI followup reaction
    if (step.aiFollowup && trimmed) {
      await aiSay(step.aiFollowup(trimmed), 400);
    }

    // Advance
    if (isLast) {
      await aiSay("You're all set! Creating your profile now...", 300);
      void submit();
      return;
    }

    // Next question after brief pause
    setStepIdx(i => i + 1);
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
        } catch (e) { /* ignore */ }
        sessionStorage.removeItem("inviteCode");
        sessionStorage.removeItem("inviteCollegeName");
        sessionStorage.removeItem("inviteCollegeCity");
      }
      setTimeout(() => setLocation("/home"), 1600);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Tap retry to try again.");
      setSubmitting(false);
      pushHistory("ai", "Oops, that didn't work. Tap the button below to retry.");
    }
  }

  // ── Welcome screen ───────────────────────────────────────────
  if (stepIdx === -1) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-between p-6" style={{ background: "#f8fafc" }}>
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm text-center">
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
            A quick chat to personalise your journey.
          </motion.p>
          <motion.div
            initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap justify-center gap-2 w-full max-w-sm"
          >
            {["AI Roadmaps", "Mock Interviews", "Recruiter Connect"].map(l => (
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
            onClick={async () => {
              setStepIdx(0);
              await aiSay(visibleSteps[0].aiText, 400);
            }}
            className="w-full h-12 rounded-xl bg-[#0f172a] text-white hover:bg-[#1e293b] font-bold text-base"
          >
            Start Chat <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Submitting state ─────────────────────────────────────────
  if (submitting) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center" style={{ background: "#f8fafc" }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 rounded-2xl bg-[#f97316] flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-xl font-black text-[#0f172a] mb-2">Building your profile...</h2>
        <p className="text-[#64748b] text-sm">Setting up your career companion</p>
      </div>
    );
  }

  // ── Chat screen ────────────────────────────────────────────
  if (!step) return null;

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#f8fafc" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f8fafc] border-b border-[#e2e8f0] px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#0f172a] truncate">Kode</p>
          <p className="text-[11px] text-[#10b981] font-medium">Online</p>
        </div>
        <span className="text-[11px] font-bold text-[#94a3b8] tabular-nums">
          {stepIdx + 1}/{visibleSteps.length}
        </span>
      </div>

      {/* Chat history */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {history.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                msg.role === "ai"
                  ? "bg-white text-[#0f172a] border border-[#e2e8f0] rounded-tl-sm"
                  : "bg-[#0f172a] text-white rounded-tr-sm"
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {typing && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-[#e2e8f0] rounded-2xl rounded-tl-sm px-4 py-3">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current question chips (inline, not yet answered) */}
        {step.type === "chips" && !typing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 justify-end"
          >
            {step.options!.map(opt => (
              <button
                key={opt}
                data-testid={`onboarding-chip-${opt}`}
                onClick={() => void handleUserResponse(opt)}
                className="h-11 px-5 rounded-full border border-[#e2e8f0] bg-white text-[#0f172a] font-semibold text-[14px] hover:border-[#0f172a] transition active:scale-[0.97]"
              >
                {opt}
              </button>
            ))}
            {step.optional && (
              <button
                onClick={() => void handleUserResponse("")}
                className="h-11 px-5 rounded-full border border-dashed border-[#cbd5e1] text-[#94a3b8] font-medium text-[14px] hover:border-[#94a3b8] transition"
              >
                Skip
              </button>
            )}
          </motion.div>
        )}

        {error && (
          <div className="flex justify-center">
            <p className="text-sm font-bold text-[#ef4444] bg-white px-4 py-2 rounded-full border border-[#fecaca]">
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Input bar */}
      {step.type !== "chips" && (
        <div className="shrink-0 p-3 pb-6 border-t border-[#e2e8f0] bg-white">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <Input
              ref={inputRef}
              autoFocus
              type={step.type === "email" ? "email" : "text"}
              inputMode={step.type === "email" ? "email" : undefined}
              placeholder={step.placeholder || "Type your answer..."}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && inputVal.trim()) { e.preventDefault(); void handleUserResponse(inputVal); }}}
              className="h-12 rounded-full bg-[#f8fafc] border border-[#e2e8f0] focus-visible:border-[#0f172a] focus-visible:ring-0 text-[16px] px-5 font-medium text-[#0f172a]"
              data-testid={`onboarding-input-${step.key}`}
            />
            <Button
              onClick={() => void handleUserResponse(inputVal)}
              disabled={!inputVal.trim() && !step.optional}
              className="h-12 w-12 rounded-full p-0 flex items-center justify-center shrink-0"
              style={{ backgroundColor: tone }}
            >
              {isLast ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
