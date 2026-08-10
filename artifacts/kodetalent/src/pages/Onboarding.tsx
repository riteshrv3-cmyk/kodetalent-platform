import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Github, Loader2, X, CheckCircle2 } from "lucide-react";
import { apiFetch, setGuestToken } from "@/lib/api/authFetch";
import { ResumeImport, type ImportSummary } from "@/components/ResumeImport";
import { ROLE_DESTINATIONS } from "@/data/domains";
import { Toko } from "@/components/kodetalent/Toko";
import { WizardShell } from "@/components/onboarding/WizardShell";

/**
 * Onboarding wizard (design v3) — a 4-step journey, tailored by the `journey`
 * query param the landing's JourneyCards set (placement | builder | beginner,
 * defaulting to placement). Guest-first request sequence is preserved from
 * the original 3-screen flow: nothing hits the network until the student
 * needs a real row (builder syncs GitHub immediately; placement/beginner
 * defer creation to the final submit, exactly as before).
 */

type Journey = "placement" | "builder" | "beginner";

const ROLES = ["SDE", "Data/ML", "App Dev", "Cybersecurity", "Not sure"];
const CURRENT_YEAR = new Date().getFullYear();
const BATCHES = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2, CURRENT_YEAR + 3];
const BEGINNER_SKILLS = ["HTML", "CSS", "JavaScript", "Python", "C++", "Java", "SQL", "Git"];

const STEP_TITLES: Record<Journey, [string, string, string, string]> = {
  placement: ["your stack", "target goal", "target batch", "you're in"],
  builder: ["connect github", "target goal", "confirm your stack", "you're in"],
  beginner: ["your stack", "target goal", "starting skills", "you're in"],
};

interface GithubStats {
  username: string;
  publicRepos: number;
  followers: number;
  topLanguages: string[];
}

function opportunitiesHref(role: string | null): string {
  const dest = role ? ROLE_DESTINATIONS[role] : undefined;
  return dest ? `/opportunities?domain=${dest.domain}&sub=${dest.sub}` : "/opportunities";
}

/** Small reusable skill-chip picker — add-by-text or toggle-from-suggestions. */
function SkillChips({
  skills,
  onAdd,
  onRemove,
  suggestions,
}: {
  skills: string[];
  onAdd: (skill: string) => void;
  onRemove: (skill: string) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  function submitDraft() {
    const value = draft.trim();
    if (value && !skills.includes(value)) onAdd(value);
    setDraft("");
  }

  return (
    <div>
      {suggestions && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s) => {
            const active = skills.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => (active ? onRemove(s) : onAdd(s))}
                className={`h-9 px-3.5 rounded-full border-2 text-[13px] font-semibold transition-colors ${
                  active ? "bg-brand text-white border-brand" : "bg-paper text-ink border-line"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2 mb-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitDraft();
            }
          }}
          placeholder="Add another skill…"
          className="flex-1 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={submitDraft}
          className="px-4 py-2.5 rounded-xl border border-line text-brand font-bold text-[13px]"
        >
          Add
        </button>
      </div>
      {skills.filter((s) => !suggestions?.includes(s)).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills
            .filter((s) => !suggestions?.includes(s))
            .map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full bg-brand-soft text-brand text-[13px] font-semibold"
              >
                {s}
                <button type="button" onClick={() => onRemove(s)} aria-label={`Remove ${s}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [journey] = useState<Journey>(() => {
    const j = new URLSearchParams(search).get("journey");
    return j === "builder" || j === "beginner" ? j : "placement";
  });

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const totalSteps = 4;
  const titles = STEP_TITLES[journey];

  // Step 1 state (placement/beginner: resume + skills; builder: GitHub sync)
  const [parsedResumeText, setParsedResumeText] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [githubUsername, setGithubUsername] = useState("");
  const [githubStats, setGithubStats] = useState<GithubStats | null>(null);
  const [syncingGithub, setSyncingGithub] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Step 2 state
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState<string | null>(null);

  // Step 3 state
  const [targetBatch, setTargetBatch] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goTo(n: number) {
    setDirection(n > step ? 1 : -1);
    setStep(n);
  }

  function addSkill(s: string) {
    setSkills((prev) => (prev.includes(s) ? prev : [...prev, s]));
  }
  function removeSkill(s: string) {
    setSkills((prev) => prev.filter((x) => x !== s));
  }

  async function syncGithub() {
    const username = githubUsername.trim();
    if (!username) return;
    setSyncingGithub(true);
    setGithubError(null);
    try {
      let studentId = Number(localStorage.getItem("studentId") ?? "");
      if (!studentId) {
        const createRes = await apiFetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Student",
            email: "",
            college: "Not set",
            city: "Not set",
            year: 1,
            field: "Not set",
          }),
        });
        if (!createRes.ok) throw new Error("Couldn't set up your profile");
        const student = await createRes.json();
        studentId = student.id;
        localStorage.setItem("studentId", String(studentId));
        if (student.guestToken) setGuestToken(student.guestToken);
      }

      const r = await apiFetch(`/api/students/${studentId}/analyze-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: `https://github.com/${username}` }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Couldn't find that GitHub user");
      }
      const data = (await r.json()) as GithubStats;
      setGithubStats(data);
      setSkills(data.topLanguages ?? []);
    } catch (e) {
      setGithubError(e instanceof Error ? e.message : "GitHub sync failed");
    } finally {
      setSyncingGithub(false);
    }
  }

  async function submitAll() {
    setSubmitting(true);
    setError(null);
    try {
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
            email: "",
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

      // Skills chips first — import-resume below merges on top of these
      // server-side, so this order never clobbers what the resume parses out.
      if (skills.length > 0) {
        const skillMap = Object.fromEntries(skills.map((s) => [s, 50]));
        await apiFetch(`/api/students/${studentId}/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skills: skillMap }),
        }).catch(() => null);
      }

      if (parsedResumeText) {
        try {
          const r = await apiFetch(`/api/students/${studentId}/profile/import-resume`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeText: parsedResumeText }),
          });
          if (r.ok) {
            const data = (await r.json()) as { summary: ImportSummary };
            setImportSummary(data.summary);
          }
        } catch {
          // Import is a bonus, never blocks onboarding.
        }
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

      goTo(4);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step 4: summary ─────────────────────────────────────────────────────

  if (step === 4) {
    const dest = targetRole ? ROLE_DESTINATIONS[targetRole] : undefined;
    const rows = [
      name.trim() && { label: "Name", value: name.trim() },
      targetRole && { label: "Target role", value: targetRole },
      journey === "placement" && targetBatch && { label: "Batch", value: String(targetBatch) },
      journey === "builder" && githubStats && { label: "GitHub", value: `@${githubStats.username}` },
      skills.length > 0 && { label: "Skills", value: skills.slice(0, 4).join(", ") + (skills.length > 4 ? "…" : "") },
    ].filter(Boolean) as { label: string; value: string }[];

    const ctaLabel = journey === "beginner" ? "See my course picks" : "Build my resume";
    const ctaHref = journey === "beginner" ? opportunitiesHref(targetRole) : "/resume";

    return (
      <div className="marketing min-h-[100dvh] bg-brand flex flex-col items-center justify-center px-6 text-center">
        <Toko pose="cheer" size={88} className="mb-5" />
        <p className="text-[13px] font-semibold uppercase tracking-wider text-white/70 mb-3">you're in</p>
        <h1 className="text-[28px] font-extrabold text-white leading-[1.1] mb-6 max-w-xs">
          {importSummary && (importSummary.projectsAdded > 0 || importSummary.experienceAdded > 0)
            ? "profile pre-filled from your resume."
            : dest
              ? `here's what's open in ${dest.label}.`
              : "let's get you placement-ready."}
        </h1>

        {rows.length > 0 && (
          <div className="w-full max-w-xs bg-white/10 rounded-2xl p-4 mb-8 text-left">
            {rows.map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                className={`flex justify-between py-2 ${i > 0 ? "border-t border-white/10" : ""}`}
              >
                <span className="text-[12px] font-semibold text-white/50">{r.label}</span>
                <span className="text-[13px] font-bold text-white">{r.value}</span>
              </motion.div>
            ))}
          </div>
        )}

        <button
          onClick={() => setLocation(ctaHref)}
          className="w-full max-w-xs bg-white text-brand text-[15px] font-bold rounded-full py-4"
        >
          {ctaLabel}
        </button>
        <button onClick={() => setLocation(opportunitiesHref(targetRole))} className="mt-4 text-[13px] text-white/70 underline">
          Browse jobs instead
        </button>
      </div>
    );
  }

  // ── Step 1 ───────────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <WizardShell step={1} totalSteps={totalSteps} title={titles[0]} direction={direction}>
        {journey === "builder" ? (
          <>
            <h1 className="text-[24px] font-extrabold text-ink leading-[1.1] mb-1.5">connect your github</h1>
            <p className="text-[13px] text-ink-muted mb-6">
              We'll scan your public repos for evidence recruiters can check.
            </p>

            <div className="flex gap-2 mb-3">
              <div className="flex-1 flex items-center rounded-xl border border-line bg-paper px-3.5">
                <Github className="w-4 h-4 text-ink-muted shrink-0" />
                <input
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="your-github-username"
                  className="w-full py-3 px-2 text-[14px] text-ink placeholder:text-ink-muted focus:outline-none bg-transparent"
                />
              </div>
              <button
                onClick={syncGithub}
                disabled={syncingGithub || !githubUsername.trim()}
                className="px-4 rounded-xl bg-ink text-white font-bold text-[13px] disabled:opacity-40"
              >
                {syncingGithub ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync"}
              </button>
            </div>
            {githubError && <p className="text-[12px] text-danger mb-3">{githubError}</p>}

            {githubStats && (
              <div className="rounded-2xl bg-brand-soft p-4 mb-6 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
                <p className="text-[13px] text-ink">
                  Synced <strong>@{githubStats.username}</strong> · {githubStats.publicRepos} repos ·{" "}
                  {githubStats.topLanguages.slice(0, 3).join(", ") || "no languages detected"}
                </p>
              </div>
            )}

            <button
              onClick={() => goTo(2)}
              disabled={!githubStats}
              className="w-full bg-brand text-white text-[15px] font-bold rounded-full py-4 disabled:opacity-40"
            >
              Continue
            </button>
            {!githubStats && (
              <button onClick={() => goTo(2)} className="mt-4 w-full text-[13px] text-ink-muted text-center">
                Skip for now
              </button>
            )}
          </>
        ) : (
          <>
            <h1 className="text-[24px] font-extrabold text-ink leading-[1.1] mb-1.5">verify your stack</h1>
            <p className="text-[13px] text-ink-muted mb-6">
              Upload your resume and add any skills — we'll build from what's real.
            </p>

            <div className="mb-5 rounded-2xl border-2 border-brand/20 bg-brand/5 p-5">
              <p className="text-[13px] font-semibold text-ink mb-1">Upload resume or CV</p>
              <p className="text-[11px] text-ink-muted mb-4">
                LinkedIn tip: Profile &gt; More &gt; Save to PDF — works too.
              </p>
              <ResumeImport deferred onTextReady={(text) => setParsedResumeText(text)} />
              {parsedResumeText && (
                <p className="text-[12px] text-done font-medium mt-3">Resume loaded. Continue to finish setup.</p>
              )}
            </div>

            <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
              Add skills manually
            </p>
            <SkillChips skills={skills} onAdd={addSkill} onRemove={removeSkill} />

            <button
              onClick={() => goTo(2)}
              className="w-full bg-brand text-white text-[15px] font-bold rounded-full py-4 mt-6"
            >
              {parsedResumeText || skills.length > 0 ? "Continue" : "Continue without uploading"}
            </button>
          </>
        )}
      </WizardShell>
    );
  }

  // ── Step 2: target goal ─────────────────────────────────────────────────

  if (step === 2) {
    return (
      <WizardShell step={2} totalSteps={totalSteps} title={titles[1]} direction={direction} onBack={() => goTo(1)}>
        <h1 className="text-[24px] font-extrabold text-ink leading-[1.1] mb-1.5">target goal</h1>
        <p className="text-[13px] text-ink-muted mb-6">This shapes what the app suggests for you.</p>

        <label className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider mb-2 block">
          Your name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand mb-6"
        />

        <label className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider mb-2 block">
          Target role
        </label>
        <div className="grid grid-cols-2 gap-2 mb-8">
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

        <button
          onClick={() => goTo(3)}
          className="w-full bg-brand text-white text-[15px] font-bold rounded-full py-4"
        >
          Continue
        </button>
      </WizardShell>
    );
  }

  // ── Step 3: journey-dependent ────────────────────────────────────────────

  return (
    <WizardShell step={3} totalSteps={totalSteps} title={titles[2]} direction={direction} onBack={() => goTo(2)}>
      {journey === "placement" && (
        <>
          <h1 className="text-[24px] font-extrabold text-ink leading-[1.1] mb-1.5">target batch</h1>
          <p className="text-[13px] text-ink-muted mb-6">When's your placement season?</p>
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
        </>
      )}

      {journey === "builder" && (
        <>
          <h1 className="text-[24px] font-extrabold text-ink leading-[1.1] mb-1.5">confirm your stack</h1>
          <p className="text-[13px] text-ink-muted mb-6">
            From your repos. Edit before we build your resume from it.
          </p>
          <SkillChips
            skills={skills}
            onAdd={addSkill}
            onRemove={removeSkill}
            suggestions={githubStats?.topLanguages}
          />
          <div className="h-4" />
        </>
      )}

      {journey === "beginner" && (
        <>
          <h1 className="text-[24px] font-extrabold text-ink leading-[1.1] mb-1.5">starting skills</h1>
          <p className="text-[13px] text-ink-muted mb-6">
            Pick what you know so far — zero-decision, we'll map the rest.
          </p>
          <SkillChips skills={skills} onAdd={addSkill} onRemove={removeSkill} suggestions={BEGINNER_SKILLS} />
          <div className="h-4" />
        </>
      )}

      {error && <p className="text-[12px] text-danger mb-4">{error}</p>}

      <button
        onClick={submitAll}
        disabled={submitting}
        className="w-full bg-brand text-white text-[15px] font-bold rounded-full py-4 disabled:opacity-40"
      >
        {submitting ? "Setting up…" : "Continue"}
      </button>
    </WizardShell>
  );
}
