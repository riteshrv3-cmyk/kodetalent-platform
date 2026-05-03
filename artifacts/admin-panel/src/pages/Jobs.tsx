import { useQuery } from "@tanstack/react-query";
import { defaultQueryFn } from "@/lib/queryClient";
import type { AdminJob } from "@/lib/api";

export default function Jobs() {
  const { data = [] } = useQuery<AdminJob[]>({
    queryKey: ["/api/admin/jobs"],
    queryFn: defaultQueryFn,
  });
  return (
    <div className="p-8 space-y-4">
      <header>
        <h1 className="text-3xl font-bold">Recruiter Jobs</h1>
        <p className="text-sm text-muted-foreground mt-1">{data.length} job postings</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((j) => (
          <div key={j.id} className="bg-card border border-card-border rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg">{j.title}</h3>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {j.recruiterCompany ?? "—"} · {j.recruiterName ?? "—"}
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  j.status === "active"
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {j.status}
              </span>
            </div>
            {j.parsedRequirements && (
              <div className="mt-3 text-xs space-y-1.5">
                <div>
                  <span className="text-muted-foreground">Role:</span>{" "}
                  <span className="font-medium">
                    {j.parsedRequirements.role} · {j.parsedRequirements.seniority}
                  </span>
                </div>
                {j.parsedRequirements.location && (
                  <div>
                    <span className="text-muted-foreground">Location:</span>{" "}
                    <span className="font-medium">{j.parsedRequirements.location}</span>
                  </div>
                )}
                {j.parsedRequirements.mustHaveSkills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {j.parsedRequirements.mustHaveSkills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-semibold"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
              <span>{j.invitesSent} invites sent</span>
              <span>{new Date(j.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="col-span-2 bg-card border border-card-border rounded-xl p-10 text-center text-muted-foreground">
            No jobs posted yet.
          </div>
        )}
      </div>
    </div>
  );
}
