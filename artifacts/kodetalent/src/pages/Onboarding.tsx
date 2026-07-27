import { useState } from "react";
import { useLocation } from "wouter";
import { apiFetch, setGuestToken } from "@/lib/api/authFetch";

type Screen = "goal" | "explore";

const ROLES = ["SDE", "Data/ML", "App Dev", "Cybersecurity", "Not sure"];
const BATCHES = [2025, 2026, 2027, 2028];

/**
 * Where each goal drops the student in the Opportunities taxonomy, so the
 * screen right after onboarding is real jobs/internships/freelance work for
 * the role they picked rather than an empty browse grid. Each role maps to
 * its most general specialisation — they can switch once they're in.
 * "Not sure" intentionally has no mapping: it lands on the domain grid.
 */
const ROLE_DESTINATIONS: Record<string, { domain: string; sub: string; label: string }> = {
  "SDE": { domain: "webdev", sub: "fullstack", label: "Full Stack" },
  "Data/ML": { domain: "data", sub: "data-science", label: "Data Science" },
  "App Dev": { domain: "mobile", sub: "rn", label: "React Native" },
  "Cybersecurity": { domain: "security", sub: "security-analysis", label: "Security Analysis" },
};

function opportunitiesHref(role: string | null): string {
  const dest = role ? ROLE_DESTINATIONS[role] : undefined;
  return dest ? `/opportunities?domain=${dest.domain}&sub=${dest.sub}` : "/opportunities";
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [screen, setScreen] = useState<Screen>("goal");
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState<string | null>(null);
  const [targetBatch, setTargetBatch] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitGoal() {
    setSubmitting(true);
    setError(null);
    try {
      // Signed-in users land here already claimed (via /auth/claim in App.tsx) with a
      // real row — this screen only fills in the goal, never creates a second student.
      const existingId = localStorage.getItem("studentId");
      let studentId: number;

      if (existingId) {
        studentId = Number(existingId);
        if (name.trim()) {
          await apiFetch(`/api/students/${studentId}/profile`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim() }),
          }).catch(() => null);
        }
      } else {
        const createRes = await apiFetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || "Student",
            email: "", // ignored server-side for anonymous creates; CreateStudentBody just requires the field to be present
            college: "Not set",
            city: "Not set",
            year: 1,
            field: "Not set",
          }),
        });
        if (!createRes.ok) throw new Error("Failed to create profile");
        const student = await createRes.json();
        studentId = student.id;
        localStorage.setItem("studentId", String(studentId));
        if (student.guestToken) setGuestToken(student.guestToken);
      }

      const inviteCode = sessionStorage.getItem("inviteCode");
      if (inviteCode) {
        await apiFetch(`/api/invite/${encodeURIComponent(inviteCode)}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId }),
        }).catch(() => null);
        sessionStorage.removeItem("inviteCode");
        sessionStorage.removeItem("inviteCollegeName");
        sessionStorage.removeItem("inviteCollegeCity");
      }

      if (targetRole || targetBatch) {
        await apiFetch(`/api/students/${studentId}/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(targetRole ? { targetRole } : {}),
            ...(targetBatch ? { targetBatch } : {}),
          }),
        }).catch(() => null);
      }

      setScreen("explore");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (screen === "explore") {
    const dest = targetRole ? ROLE_DESTINATIONS[targetRole] : undefined;
    return (
      <div className="min-h-[100dvh] bg-brand flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-white/70 mb-3">You're in</p>
        <h1 className="text-[28px] font-extrabold text-white leading-[1.1] mb-3">
          {dest ? `Here's what's open in ${dest.label}.` : "Let's find your opportunities."}
        </h1>
        <p className="text-[14px] text-white/70 mb-8 max-w-xs">
          Live jobs, internships and freelance work
          {targetRole && targetRole !== "Not sure" ? ` for ${targetRole}` : ""} — updated daily.
        </p>
        <button
          onClick={() => setLocation(opportunitiesHref(targetRole))}
          className="w-full max-w-xs bg-white text-brand text-[15px] font-bold rounded-full py-4"
        >
          See opportunities
        </button>
        <button onClick={() => setLocation("/home")} className="mt-4 text-[13px] text-white/70 underline">
          Skip for now
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <div className="bg-brand px-6 pt-16 pb-10">
        <h1 className="text-[26px] font-extrabold text-white leading-[1.1] mb-1">What's your goal?</h1>
        <p className="text-[13px] text-white/70">This shapes everything the app suggests for you.</p>
      </div>

      <div className="bg-paper rounded-t-3xl -mt-6 px-6 pt-6 pb-10 max-w-md lg:max-w-lg mx-auto shadow-soft">
        <label className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider mb-2 block">Your name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand mb-6"
        />

        <label className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider mb-2 block">Target role</label>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => setTargetRole(role)}
              className={`h-12 rounded-xl border-2 font-semibold text-[14px] transition-colors ${
                targetRole === role ? "bg-brand text-white border-brand" : "bg-paper text-ink border-line"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <label className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider mb-2 block">Target batch</label>
        <div className="grid grid-cols-4 gap-2 mb-8">
          {BATCHES.map((batch) => (
            <button
              key={batch}
              onClick={() => setTargetBatch(batch)}
              className={`h-12 rounded-xl border-2 font-semibold text-[14px] transition-colors ${
                targetBatch === batch ? "bg-brand text-white border-brand" : "bg-paper text-ink border-line"
              }`}
            >
              {batch}
            </button>
          ))}
        </div>

        {error && <p className="text-[12px] text-danger mb-4">{error}</p>}

        <button
          onClick={submitGoal}
          disabled={submitting}
          className="w-full bg-brand text-white text-[15px] font-bold rounded-full py-4 disabled:opacity-40"
        >
          {submitting ? "Setting up…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
