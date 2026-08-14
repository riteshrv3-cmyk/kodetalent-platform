import { useQuery } from "@tanstack/react-query";
import { defaultQueryFn } from "@/lib/queryClient";
import type { ActivityEvent } from "@/lib/api";
import { useState } from "react";

const KIND_LABEL: Record<ActivityEvent["kind"], string> = {
  student_signup: "Signup",
  recruiter_invite: "Invite",
  drive_check: "Drive",
  interview: "Interview",
};

const KIND_COLOR: Record<ActivityEvent["kind"], string> = {
  student_signup: "bg-success/15 text-success",
  recruiter_invite: "bg-primary/15 text-primary",
  drive_check: "bg-destructive/15 text-destructive",
  interview: "bg-secondary/15 text-secondary",
};

const ALL_KINDS: ActivityEvent["kind"][] = [
  "student_signup",
  "recruiter_invite",
  "drive_check",
  "interview",
];

export default function ActivityFeed() {
  const { data = [] } = useQuery<ActivityEvent[]>({
    queryKey: ["/api/admin/activity"],
    queryFn: defaultQueryFn,
    refetchInterval: 5_000,
  });
  const [active, setActive] = useState<Set<ActivityEvent["kind"]>>(new Set(ALL_KINDS));
  const toggle = (k: ActivityEvent["kind"]) => {
    const next = new Set(active);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setActive(next);
  };
  const filtered = data.filter((e) => active.has(e.kind));

  return (
    <div className="p-8 space-y-4">
      <header>
        <h1 className="text-3xl font-bold">Live Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filtered.length} of {data.length} events · auto-refreshes every 5s
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {ALL_KINDS.map((k) => (
          <button
            key={k}
            onClick={() => toggle(k)}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-opacity ${
              KIND_COLOR[k]
            } ${active.has(k) ? "opacity-100" : "opacity-30"}`}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="bg-card border border-card-border rounded-xl divide-y divide-border">
        {filtered.map((e, i) => (
          <div key={`${e.kind}-${e.entityId}-${i}`} className="flex items-center gap-4 px-5 py-3.5">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${KIND_COLOR[e.kind]}`}
            >
              {KIND_LABEL[e.kind]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{e.title}</div>
              <div className="text-xs text-muted-foreground truncate">{e.subtitle}</div>
            </div>
            <div className="text-[11px] text-muted-foreground shrink-0">
              {new Date(e.at).toLocaleString()}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            No events match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
