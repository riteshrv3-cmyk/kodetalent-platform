import { useState } from "react";
import { useLocation } from "wouter";
import { Toko } from "@/components/kodetalent/Toko";
import { apiFetch, setGuestToken } from "@/lib/api/authFetch";

/**
 * Landing screen for logged-out visitors.
 *
 * Primary CTA: paste a JD, click "Build my resume" — creates a guest student
 * and opens Resume page with the JD pre-seeded into GenerateSheet.
 * Secondary CTA: onboarding flow (explore jobs / role selection).
 *
 * Any count shown here has to come from a real endpoint. Do not hardcode one.
 */
export default function RoleSelect() {
  const [, setLocation] = useLocation();
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuildResume() {
    if (!jd.trim()) {
      // Allow empty — guest creation still works, GenerateSheet lets them paste later.
    }
    setLoading(true);
    setError(null);
    try {
      // Create a guest student (same path Onboarding uses).
      const res = await apiFetch("/api/students", {
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
      if (!res.ok) throw new Error("Failed to create guest session");
      const student = await res.json();
      localStorage.setItem("studentId", String(student.id));
      if (student.guestToken) setGuestToken(student.guestToken);

      // Seed the generate sheet — consumed once in Resume.tsx and removed.
      if (jd.trim()) {
        sessionStorage.setItem("resumeContext", JSON.stringify({ jd: jd.trim() }));
      }
      setLocation("/resume");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-brand flex flex-col px-6 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="flex-1 flex flex-col justify-center max-w-md lg:max-w-lg mx-auto w-full">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50 mb-5">
          KodeTalent
        </p>

        <Toko pose="hero" size={120} priority className="mb-5 -ml-2" />

        <h1 className="text-[30px] font-extrabold text-white leading-[1.06] tracking-tight mb-2">
          Paste a JD.<br />Get a tailored resume.
        </h1>
        <p className="text-[13px] text-white/70 leading-relaxed mb-5">
          Every line traces back to something you actually did. No fluff, no guessing.
        </p>

        {/* JD input hero */}
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the job description here… (or leave blank to add it inside)"
          className="w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-[13px] px-4 py-3 resize-none focus:outline-none focus:border-white/60 mb-3"
          rows={5}
        />

        {error && <p className="text-[12px] text-red-300 mb-2">{error}</p>}

        <button
          onClick={handleBuildResume}
          disabled={loading}
          className="w-full bg-white text-brand text-[15px] font-bold rounded-full py-4 disabled:opacity-50"
          data-testid="build-resume-start"
        >
          {loading ? "Setting up…" : "Build my resume — free"}
        </button>

        <p className="text-center text-[11px] text-white/40 mt-2">No account needed to generate</p>
      </div>

      <div className="max-w-md lg:max-w-lg mx-auto w-full border-t border-white/10 pt-5">
        <button
          onClick={() => setLocation("/onboarding")}
          className="w-full text-[13px] font-semibold text-white/70 underline mb-3"
        >
          Explore jobs and opportunities instead
        </button>
        <button
          onClick={() => setLocation("/sign-in")}
          className="w-full text-[13px] font-semibold text-white/50 underline"
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
}
