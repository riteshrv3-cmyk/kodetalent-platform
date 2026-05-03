import { useQuery } from "@tanstack/react-query";
import { defaultQueryFn } from "@/lib/queryClient";
import type { AdminStudent } from "@/lib/api";
import { useState, useMemo } from "react";

export default function Students() {
  const { data = [] } = useQuery<AdminStudent[]>({
    queryKey: ["/api/admin/students"],
    queryFn: defaultQueryFn,
  });
  const [q, setQ] = useState("");
  const [openOnly, setOpenOnly] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.filter((s) => {
      if (openOnly && !s.openToWork) return false;
      if (!needle) return true;
      return (
        s.name.toLowerCase().includes(needle) ||
        s.email.toLowerCase().includes(needle) ||
        s.college.toLowerCase().includes(needle) ||
        s.field.toLowerCase().includes(needle)
      );
    });
  }, [data, q, openOnly]);

  return (
    <div className="p-8 space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.length} total · {filtered.length} shown
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => setOpenOnly(e.target.checked)}
              className="accent-primary"
            />
            Open to work only
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, college…"
            className="px-3 py-2 rounded-md bg-card border border-card-border text-sm w-72"
          />
        </div>
      </header>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">College</th>
              <th className="text-left px-4 py-3">Year/Field</th>
              <th className="text-right px-4 py-3">Score</th>
              <th className="text-right px-4 py-3">Strength</th>
              <th className="text-right px-4 py-3">Commit</th>
              <th className="text-right px-4 py-3">XP</th>
              <th className="text-right px-4 py-3">Streak</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.slice(0, 200).map((s) => (
              <tr key={s.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.email}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div>{s.college}</div>
                  <div className="text-[11px] text-muted-foreground">{s.city}</div>
                </td>
                <td className="px-4 py-2.5">
                  Y{s.year} · {s.field}
                </td>
                <td className="px-4 py-2.5 text-right font-bold">{s.overallScore}</td>
                <td className="px-4 py-2.5 text-right">{s.profileStrength}%</td>
                <td className="px-4 py-2.5 text-right">{s.commitmentScore}</td>
                <td className="px-4 py-2.5 text-right">{s.xp}</td>
                <td className="px-4 py-2.5 text-right">{s.streakCount}🔥</td>
                <td className="px-4 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {s.openToWork && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-success/15 text-success font-bold">
                        OPEN
                      </span>
                    )}
                    {s.isPro && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent/20 text-accent font-bold">
                        PRO
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No students match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
