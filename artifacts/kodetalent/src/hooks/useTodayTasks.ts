import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/authFetch";

export interface TodayTask {
  id: string;
  label: string;
  sublabel?: string;
  done: boolean;
  hot?: boolean;
  ctaLabel?: string;
  href: string;
  /** Manual tasks can be toggled by the student; auto tasks derive `done` from real data. */
  manual?: boolean;
}

interface ServerTask {
  id: string;
  label: string;
  sublabel?: string;
  done: boolean;
  hot: boolean;
  href: string;
  manual: boolean;
}

interface UseTodayTasksInput {
  studentId: string | null;
}

/**
 * Fetches the day's server-generated tasks (rules R1-R7 in lib/dailyTasks.ts on the
 * API server) and the honest, server-computed streak. Replaces the v1 localStorage
 * implementation — completion state and streak are now real, cross-device truth.
 */
export function useTodayTasks({ studentId }: UseTodayTasksInput) {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [streakCount, setStreakCount] = useState(0);

  const load = useCallback(async () => {
    if (!studentId) return;
    try {
      const res = await apiFetch(`/api/students/${studentId}/today-tasks`);
      if (!res.ok) return;
      const data: { tasks: ServerTask[]; streakCount: number } = await res.json();
      setTasks(data.tasks);
      setStreakCount(data.streakCount);
    } catch {
      // Keep whatever was last loaded; the Home screen tolerates a stale/empty list.
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleManual = useCallback(
    async (id: string) => {
      if (!studentId) return;
      const current = tasks.find((t) => t.id === id);
      if (!current) return;
      const nextDone = !current.done;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: nextDone } : t)));
      try {
        const res = await apiFetch(`/api/students/${studentId}/tasks/${id}/${nextDone ? "complete" : "uncomplete"}`, {
          method: "POST",
        });
        if (res.ok) {
          const data: { streakCount: number } = await res.json();
          setStreakCount(data.streakCount);
        } else {
          setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !nextDone } : t)));
        }
      } catch {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !nextDone } : t)));
      }
    },
    [studentId, tasks],
  );

  return { tasks, toggleManual, streakCount };
}
