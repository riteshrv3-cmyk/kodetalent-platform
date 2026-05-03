import { useQuery } from "@tanstack/react-query";
import { defaultQueryFn } from "@/lib/queryClient";
import type { AdminCollege } from "@/lib/api";

export default function Colleges() {
  const { data = [] } = useQuery<AdminCollege[]>({
    queryKey: ["/api/admin/colleges"],
    queryFn: defaultQueryFn,
  });
  return (
    <div className="p-8 space-y-4">
      <header>
        <h1 className="text-3xl font-bold">Colleges</h1>
        <p className="text-sm text-muted-foreground mt-1">{data.length} colleges represented</p>
      </header>
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">College</th>
              <th className="text-right px-4 py-3">Students</th>
              <th className="text-right px-4 py-3">Open to Work</th>
              <th className="text-right px-4 py-3">Avg Score</th>
              <th className="text-right px-4 py-3">Avg Strength</th>
              <th className="text-right px-4 py-3">Total XP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((c) => (
              <tr key={c.college} className="hover:bg-muted/20">
                <td className="px-4 py-2.5 font-semibold">{c.college}</td>
                <td className="px-4 py-2.5 text-right font-bold">{c.students}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-success font-semibold">{c.openToWork}</span>
                </td>
                <td className="px-4 py-2.5 text-right">{c.avgScore}</td>
                <td className="px-4 py-2.5 text-right">{c.avgStrength}%</td>
                <td className="px-4 py-2.5 text-right">{c.totalXp.toLocaleString()}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No colleges yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
