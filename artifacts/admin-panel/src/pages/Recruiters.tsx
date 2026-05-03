import { useQuery } from "@tanstack/react-query";
import { defaultQueryFn } from "@/lib/queryClient";
import type { AdminRecruiter } from "@/lib/api";

export default function Recruiters() {
  const { data = [] } = useQuery<AdminRecruiter[]>({
    queryKey: ["/api/admin/recruiters"],
    queryFn: defaultQueryFn,
  });
  return (
    <div className="p-8 space-y-4">
      <header>
        <h1 className="text-3xl font-bold">Recruiters</h1>
        <p className="text-sm text-muted-foreground mt-1">{data.length} accounts</p>
      </header>
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Recruiter</th>
              <th className="text-left px-4 py-3">Company</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-right px-4 py-3">Jobs</th>
              <th className="text-right px-4 py-3">Invites</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="text-left px-4 py-3">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">{r.email}</div>
                </td>
                <td className="px-4 py-2.5 font-medium">{r.company}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.role ?? "—"}</td>
                <td className="px-4 py-2.5 text-right font-bold">{r.jobsPosted}</td>
                <td className="px-4 py-2.5 text-right font-bold">{r.invitesSent}</td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">
                  {new Date(r.lastSeenAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No recruiters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
