import { useQuery } from "@tanstack/react-query";
import { defaultQueryFn } from "@/lib/queryClient";
import type { AdminInvite } from "@/lib/api";

const STATUS_TONE: Record<string, string> = {
  pending: "bg-accent/15 text-accent",
  accepted: "bg-success/15 text-success",
  declined: "bg-destructive/15 text-destructive",
};

export default function Invites() {
  const { data = [] } = useQuery<AdminInvite[]>({
    queryKey: ["/api/admin/invites"],
    queryFn: defaultQueryFn,
  });
  return (
    <div className="p-8 space-y-4">
      <header>
        <h1 className="text-3xl font-bold">Recruiter Invites</h1>
        <p className="text-sm text-muted-foreground mt-1">{data.length} invites total</p>
      </header>
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Student</th>
              <th className="text-left px-4 py-3">College</th>
              <th className="text-left px-4 py-3">From</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((i) => (
              <tr key={i.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5 font-semibold">
                  {i.studentName ?? `#${i.studentId}`}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{i.studentCollege ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <div className="font-medium">{i.recruiterCompany}</div>
                  <div className="text-[11px] text-muted-foreground">{i.recruiterName}</div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{i.role ?? "—"}</td>
                <td className="px-4 py-2.5 text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      STATUS_TONE[i.status] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {new Date(i.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No invites yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
