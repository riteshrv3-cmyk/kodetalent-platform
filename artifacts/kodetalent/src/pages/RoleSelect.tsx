import { useState } from "react";
import { useLocation } from "wouter";
import { FileText, Mic, ListChecks, Briefcase, GraduationCap, UserRound } from "lucide-react";
import { Toko } from "@/components/kodetalent/Toko";
import { apiFetch, setGuestToken } from "@/lib/api/authFetch";

/**
 * Landing screen for logged-out visitors.
 *
 * Primary CTA: paste a JD, click "Build my resume" — creates a guest student
 * and opens Resume page with the JD pre-seeded into GenerateSheet.
 * Secondary CTAs: onboarding flow (explore jobs) and sign in.
 *
 * Built for Indian engineering students prepping for placements. No pricing,
 * no monetization surface — the whole product is free to use.
 *
 * Any count shown here has to come from a real endpoint. Do not hardcode one.
 */

const FEATURES = [
  {
    icon: FileText,
    title: "Resume that's actually you",
    body: "Every bullet traces back to real work — projects, internships, hackathons. ATS-friendly, no fluff.",
  },
  {
    icon: Mic,
    title: "AI mock interview",
    body: "Voice and camera practice with live feedback and a score report, before the real placement round.",
  },
  {
    icon: ListChecks,
    title: "Aptitude mock tests",
    body: "Timed MCQ sets that feel like a campus drive. Quant, logical reasoning and core CS.",
  },
  {
    icon: Briefcase,
    title: "Curated jobs & internships",
    body: "Fresher-friendly openings, India-first, refreshed daily. Freelance gigs too.",
  },
  {
    icon: GraduationCap,
    title: "Skill courses on demand",
    body: "Learn the exact skills a job asks for, generated into a short focused course.",
  },
  {
    icon: UserRound,
    title: "A recruiter-ready profile",
    body: "One profile that recruiters can find you by. Import from your resume in one tap.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Paste a JD or pick a role",
    body: "Tell us the job you're aiming for. Or just start blank and add it later.",
  },
  {
    n: "2",
    title: "We build from your real work",
    body: "Toko turns your projects and experience into a tailored, honest resume.",
  },
  {
    n: "3",
    title: "Practice, then apply",
    body: "Run a mock interview, sharpen weak spots, and apply to matched openings.",
  },
];

export default function RoleSelect() {
  const [, setLocation] = useLocation();
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuildResume() {
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
    <div className="min-h-[100dvh] bg-canvas">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="bg-brand">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-4">
          <span className="text-[13px] font-bold uppercase tracking-[0.16em] text-white/80">
            KodeTalent
          </span>
          <button
            onClick={() => setLocation("/sign-in")}
            className="text-[13px] font-semibold text-white/80 hover:text-white transition-colors"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="bg-brand">
        <div className="max-w-6xl mx-auto w-full px-6 pb-14 lg:pb-20 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left: copy + JD box */}
          <div className="pt-6 lg:pt-4 order-2 lg:order-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50 mb-4">
              Built for Indian engineering students
            </p>
            <h1 className="text-[32px] lg:text-[44px] font-extrabold text-white leading-[1.05] tracking-tight mb-3">
              Crack placements.<br />
              Start with a resume that's really you.
            </h1>
            <p className="text-[14px] lg:text-[15px] text-white/70 leading-relaxed mb-6 max-w-md">
              Resume, mock interviews, aptitude tests and matched jobs — one place
              to get placement-ready. Every line traces back to something you
              actually did. No fluff, no guessing.
            </p>

            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description here… (or leave blank to add it inside)"
              className="w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-[13px] px-4 py-3 resize-none focus:outline-none focus:border-white/60 mb-3"
              rows={4}
            />

            {error && <p className="text-[12px] text-red-300 mb-2">{error}</p>}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleBuildResume}
                disabled={loading}
                className="flex-1 bg-white text-brand text-[15px] font-bold rounded-full py-4 px-6 disabled:opacity-50 hover:bg-white/90 transition-colors"
                data-testid="build-resume-start"
              >
                {loading ? "Setting up…" : "Build my resume — free"}
              </button>
              <button
                onClick={() => setLocation("/onboarding")}
                className="flex-1 sm:flex-none bg-white/10 border border-white/25 text-white text-[15px] font-semibold rounded-full py-4 px-6 hover:bg-white/15 transition-colors"
              >
                Explore jobs instead
              </button>
            </div>

            <p className="text-[11px] text-white/40 mt-3">
              No account needed to generate. Free for students.
            </p>
          </div>

          {/* Right: Toko */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="relative">
              <Toko pose="hero" size={220} priority className="drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-6 py-14 lg:py-20">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">
          Everything for placement season
        </p>
        <h2 className="text-[24px] lg:text-[30px] font-extrabold text-ink leading-tight tracking-tight mb-8 max-w-lg">
          One app from first resume to offer letter.
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-paper rounded-2xl shadow-soft p-5">
                <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-brand" />
                </div>
                <h3 className="text-[15px] font-bold text-ink mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-ink-muted leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="bg-brand-soft">
        <div className="max-w-6xl mx-auto w-full px-6 py-14 lg:py-20">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand mb-2">
            How it works
          </p>
          <h2 className="text-[24px] lg:text-[30px] font-extrabold text-ink leading-tight tracking-tight mb-8">
            Three steps to placement-ready.
          </h2>

          <div className="grid sm:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-paper rounded-2xl shadow-soft p-5">
                <div className="w-9 h-9 rounded-full bg-brand text-white text-[15px] font-bold flex items-center justify-center mb-3">
                  {s.n}
                </div>
                <h3 className="text-[15px] font-bold text-ink mb-1.5">{s.title}</h3>
                <p className="text-[13px] text-ink-muted leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-6 py-16 lg:py-24 text-center">
        <Toko pose="cheer" size={96} className="mx-auto mb-5" />
        <h2 className="text-[26px] lg:text-[34px] font-extrabold text-ink leading-tight tracking-tight mb-3">
          Your placement season starts now.
        </h2>
        <p className="text-[14px] text-ink-muted leading-relaxed mb-7 max-w-md mx-auto">
          Build your first resume in under a minute. No sign-up, no cost.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleBuildResume}
            disabled={loading}
            className="bg-brand text-white text-[15px] font-bold rounded-full py-4 px-8 disabled:opacity-50 hover:bg-brand/90 transition-colors"
          >
            {loading ? "Setting up…" : "Build my resume — free"}
          </button>
          <button
            onClick={() => setLocation("/onboarding")}
            className="bg-paper text-brand border border-brand/20 text-[15px] font-semibold rounded-full py-4 px-8 hover:bg-brand-soft transition-colors"
          >
            Explore jobs
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto w-full px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-ink-muted">
            KodeTalent
          </span>
          <p className="text-[12px] text-ink-muted">
            Made for engineering students in India.
          </p>
          <button
            onClick={() => setLocation("/sign-in")}
            className="text-[12px] font-semibold text-brand hover:underline"
          >
            Already have an account? Sign in
          </button>
        </div>
      </footer>
    </div>
  );
}
