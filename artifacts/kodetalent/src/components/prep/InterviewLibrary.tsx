import { useState } from "react";
import { useLocation } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, ChevronRight } from "lucide-react";
import { useCreateInterviewSession } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import {
  INTERVIEW_PRESETS,
  INTERVIEW_ROLES,
  type InterviewPreset,
} from "@/data/interviewLibrary";

// Self-contained library of ready-made interviews. No props: it reads the
// studentId from localStorage itself and starts a session with the same
// createInterview.mutateAsync({data:{studentId, company, round}}) contract
// Opportunities.startPractice uses, then routes into the live interview.
export default function InterviewLibrary() {
  const [, setLocation] = useLocation();
  const reduced = useReducedMotion();
  const createInterview = useCreateInterviewSession();

  const [role, setRole] = useState<"all" | InterviewPreset["roleId"]>("all");
  const [practicingId, setPracticingId] = useState<string | null>(null);

  const presets =
    role === "all"
      ? INTERVIEW_PRESETS
      : INTERVIEW_PRESETS.filter((p) => p.roleId === role);

  const start = async (preset: InterviewPreset) => {
    const studentId = localStorage.getItem("studentId");
    if (!studentId) {
      setLocation("/");
      return;
    }
    setPracticingId(preset.id);
    try {
      const session = await createInterview.mutateAsync({
        data: {
          studentId: Number(studentId),
          company: `${preset.company} (${preset.label})`,
          round: `${preset.type}|${preset.difficulty}`,
        },
      });
      setLocation(`/practice/interview/${session.id}`);
    } catch {
      setPracticingId(null);
    }
  };

  const filters: { id: "all" | InterviewPreset["roleId"]; label: string }[] = [
    { id: "all", label: "All" },
    ...INTERVIEW_ROLES.map((r) => ({ id: r.id, label: r.label })),
  ];

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-display text-xl font-bold text-ink">Interview library</h2>
        <p className="text-sm text-ink-muted mt-1">
          Ready-made interviews for real companies — start in one tap.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setRole(f.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors",
              role === f.id
                ? "bg-brand text-white"
                : "bg-brand-soft text-brand hover:bg-brand-soft/70"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {presets.map((preset, i) => {
          const loading = practicingId === preset.id;
          return (
            <motion.button
              key={preset.id}
              type="button"
              onClick={() => start(preset)}
              disabled={loading}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : Math.min(i * 0.03, 0.2) }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              className="text-left bg-paper rounded-2xl shadow-soft border border-line p-4 flex items-start gap-3 disabled:opacity-70"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">
                  {preset.roleLabel}
                </div>
                <div className="text-base font-bold text-ink truncate">
                  {preset.company}
                </div>
                <div className="text-sm text-ink-muted truncate">{preset.label}</div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="px-2 py-0.5 rounded-full bg-brand-soft text-brand text-[11px] font-bold">
                    {preset.type}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-brand-soft text-brand text-[11px] font-bold">
                    {preset.difficulty}
                  </span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-brand-soft flex items-center justify-center text-brand shrink-0">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
