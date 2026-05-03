import { useQuery } from "@tanstack/react-query";
import { defaultQueryFn } from "@/lib/queryClient";
import type { AdminDriveCheck } from "@/lib/api";

const VERDICT_TONE: Record<string, string> = {
  safe: "bg-success/15 text-success",
  risky: "bg-accent/15 text-accent",
  scam: "bg-destructive/15 text-destructive",
};

export default function DriveChecks() {
  const { data = [] } = useQuery<AdminDriveCheck[]>({
    queryKey: ["/api/admin/drive-checks"],
    queryFn: defaultQueryFn,
  });
  const scams = data.filter((d) => d.scamVerdict === "scam").length;
  const risky = data.filter((d) => d.scamVerdict === "risky").length;

  return (
    <div className="p-8 space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Drive Checks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.length} checks · {scams} scams · {risky} risky
          </p>
        </div>
      </header>
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Student</th>
              <th className="text-left px-4 py-3">Company / Role</th>
              <th className="text-left px-4 py-3">CTC</th>
              <th className="text-center px-4 py-3">Verdict</th>
              <th className="text-right px-4 py-3">Score</th>
              <th className="text-left px-4 py-3">Outcome</th>
              <th className="text-left px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((d) => (
              <tr key={d.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5">
                  <div className="font-semibold">{d.studentName ?? `#${d.studentId}`}</div>
                  <div className="text-[11px] text-muted-foreground">{d.studentCollege ?? "—"}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-medium">{d.company ?? "—"}</div>
                  <div className="text-[11px] text-muted-foreground">{d.role ?? "—"}</div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{d.ctc ?? "—"}</td>
                <td className="px-4 py-2.5 text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      VERDICT_TONE[d.scamVerdict] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {d.scamVerdict}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-bold">{d.scamScore}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{d.outcome}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {new Date(d.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No drive checks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
