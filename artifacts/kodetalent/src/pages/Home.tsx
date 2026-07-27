import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Cat } from "lucide-react";
import { TaskRow } from "@/components/kodetalent/TaskRow";
import { useTodayTasks } from "@/hooks/useTodayTasks";
import { apiFetch } from "@/lib/api/authFetch";

interface StudentProfile {
  id: number;
  name: string;
  field: string;
  year: number;
  targetRole: string | null;
  targetBatch: number | null;
  skills: Record<string, number>;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) {
      setLocation("/onboarding");
      return;
    }
    setStudentId(id);
    let alive = true;

    apiFetch(`/api/students/${id}/full-profile`)
      .then((r) => r.json())
      .then((prof) => alive && setProfile(prof))
      .catch(() => null);

    return () => {
      alive = false;
    };
  }, [setLocation]);

  const { tasks, toggleManual, streakCount, noticing } = useTodayTasks({ studentId });

  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const goal = profile?.targetRole
    ? `${profile.targetRole}${profile.targetBatch ? ` · Batch ${profile.targetBatch}` : ""}`
    : profile?.field && profile.field !== "Not set"
      ? `${profile.field}${profile.year ? ` · Year ${profile.year}` : ""}`
      : null;

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="bg-brand px-6 pt-8 pb-14">
        <div className="lg:max-w-2xl lg:mx-auto">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-white/70">Good {greeting}</p>
              <h1 className="text-[30px] font-extrabold text-white leading-[1.06] tracking-tight">{firstName}.</h1>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0 mt-1">
              <Cat className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {goal && <span className="text-[12px] text-white/70">{goal}</span>}
            {streakCount > 0 && (
              <>
                {goal && <span className="text-white/40">·</span>}
                <span className="text-[12px] font-semibold text-white">{streakCount} day{streakCount === 1 ? "" : "s"} in a row</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-canvas rounded-t-3xl -mt-6 px-6 pt-6 lg:max-w-2xl lg:mx-auto">
        {noticing && (
          <div className="bg-brand-soft rounded-2xl p-4 mb-4">
            <button
              type="button"
              onClick={() => setLocation(noticing.href)}
              className="w-full flex items-start gap-3 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
                <Cat className="w-4 h-4" strokeWidth={2} />
              </div>
              <p className="text-[13px] font-medium text-ink leading-snug pt-1">{noticing.text}</p>
            </button>
            <button
              type="button"
              onClick={() => setLocation("/notebook")}
              className="text-[11px] font-bold text-brand mt-2 ml-11"
            >
              See everything Kit has noticed →
            </button>
          </div>
        )}
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            label={task.label}
            sublabel={task.sublabel}
            done={task.done}
            hot={task.hot}
            ctaLabel={task.ctaLabel}
            onToggle={task.manual ? () => toggleManual(task.id) : undefined}
            onAction={() => setLocation(task.href)}
          />
        ))}
      </div>
    </div>
  );
}
