import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Lenis from "lenis";
import { motion, useReducedMotion } from "framer-motion";
import { FileText, Mic, ListChecks, Briefcase, GraduationCap, UserRound } from "lucide-react";
import { Toko } from "@/components/kodetalent/Toko";
import { HeroAppFrame } from "@/components/marketing/HeroAppFrame";
import { JourneyCards } from "@/components/marketing/JourneyCards";
import { apiFetch, setGuestToken } from "@/lib/api/authFetch";

/**
 * Landing screen for logged-out visitors (design v3 — motion-first marketing).
 *
 * Primary CTA: "Build my resume" — creates a guest student and opens the
 * Resume page, which asks for real evidence (GitHub, resume, or skills)
 * before generating. The JD box here is optional and only sets the *target*
 * for that generation — it is never the source of the resume's content,
 * since a job description carries no facts about the student.
 * Secondary paths: three journey cards routing into onboarding variants.
 *
 * Marketing voice: lowercase headlines (scoped via the .marketing wrapper in
 * index.css). App surfaces stay sentence case.
 *
 * Built for Indian engineering students prepping for placements. No pricing,
 * no monetization surface — the whole product is free to use.
 *
 * Any count shown here has to come from a real endpoint. Do not hardcode one.
 */

const FEATURES = [
  {
    icon: FileText,
    title: "a resume that's actually you",
    body: "Every bullet traces back to real work — projects, internships, hackathons. ATS-friendly, no fluff.",
  },
  {
    icon: Mic,
    title: "AI mock interview",
    body: "Voice and camera practice with live feedback and a score report, before the real placement round.",
  },
  {
    icon: ListChecks,
    title: "aptitude mock tests",
    body: "Timed MCQ sets that feel like a campus drive. Quant, logical reasoning and core CS.",
  },
  {
    icon: Briefcase,
    title: "curated jobs & internships",
    body: "Fresher-friendly openings, India-first, refreshed daily. Freelance gigs too.",
  },
  {
    icon: GraduationCap,
    title: "skill courses on demand",
    body: "Learn the exact skills a job asks for, generated into a short focused course.",
  },
  {
    icon: UserRound,
    title: "a recruiter-ready profile",
    body: "One profile that recruiters can find you by. Import from your resume in one tap.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "add your real work",
    body: "GitHub, an existing resume, or your skills — whatever you've got. This is what the resume is actually built from.",
  },
  {
    n: "2",
    title: "we build from your real work",
    body: "Toko turns your projects and experience into a tailored, honest resume.",
  },
  {
    n: "3",
    title: "practice, then apply",
    body: "Run a mock interview, sharpen weak spots, and apply to matched openings.",
  },
];

/** Scroll-reveal wrapper: fade+rise once when the block enters the viewport. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function RoleSelect() {
  const [, setLocation] = useLocation();
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion();

  // Smooth scrolling on the marketing page only; native scroll in-app.
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ duration: 1.05 });
    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [reduced]);

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
    <div className="marketing min-h-[100dvh] bg-canvas">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="bg-brand">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-4">
          <span className="text-[14px] font-bold tracking-[0.12em] text-white/90" style={{ fontFamily: "var(--font-display)" }}>
            kodetalent
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
      <section className="bg-brand overflow-hidden">
        <div className="max-w-6xl mx-auto w-full px-6 pb-16 lg:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
          {/* Left: copy + JD box */}
          <div className="pt-8 lg:pt-6 order-2 lg:order-1">
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50 mb-5"
            >
              Built for Indian engineering students
            </motion.p>
            <motion.h1
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
              className="text-[40px] lg:text-[58px] font-extrabold text-white leading-[1.02] tracking-tight mb-4"
              style={{ textWrap: "balance" }}
            >
              crack placements. start with a resume that's{" "}
              <span className="accent-serif font-semibold text-white">really you.</span>
            </motion.h1>
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18, ease: "easeOut" }}
              className="text-[14px] lg:text-[15px] text-white/70 leading-relaxed mb-7 max-w-md"
            >
              Resume, mock interviews, aptitude tests and matched jobs — one place
              to get placement-ready. Every line traces back to something you
              actually did. No fluff, no guessing.
            </motion.p>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.28, ease: "easeOut" }}
            >
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-white/40 mb-1.5">
                Optional — target a specific job
              </label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste a job description here to tailor toward it… (or leave blank and add it inside)"
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
            </motion.div>
          </div>

          {/* Right: animated product frame with Toko presenting it */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.2, ease: "easeOut" }}
            className="order-1 lg:order-2 relative flex justify-center lg:justify-end pt-[104px] lg:pt-10"
          >
            <div className="relative">
              {/* Toko peeks over the frame's top edge — presenter, not obstruction */}
              <Toko
                pose="hero"
                size={116}
                priority
                className="absolute -top-[92px] right-8 drop-shadow-2xl"
              />
              <div className="relative">
                <HeroAppFrame />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Journey selector ────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-6 py-14 lg:py-20">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">
            Choose your path
          </p>
          <h2 className="text-[26px] lg:text-[36px] font-extrabold text-ink leading-tight tracking-tight mb-8 max-w-xl">
            where are you in your placement journey?
          </h2>
        </Reveal>
        <JourneyCards />
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="bg-paper border-y border-line">
        <div className="max-w-6xl mx-auto w-full px-6 py-14 lg:py-20">
          <Reveal>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">
              Everything for placement season
            </p>
            <h2 className="text-[26px] lg:text-[36px] font-extrabold text-ink leading-tight tracking-tight mb-8 max-w-lg">
              one app from first resume to offer letter.
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={i * 0.06}>
                  <div className="bg-canvas rounded-2xl p-5 h-full">
                    <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-brand" />
                    </div>
                    <h3 className="text-[15px] font-bold text-ink mb-1.5">{f.title}</h3>
                    <p className="text-[13px] text-ink-muted leading-relaxed">{f.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="bg-brand-soft">
        <div className="max-w-6xl mx-auto w-full px-6 py-14 lg:py-20">
          <Reveal>
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand mb-2">
              How it works
            </p>
            <h2 className="text-[26px] lg:text-[36px] font-extrabold text-ink leading-tight tracking-tight mb-8">
              three steps to placement-ready.
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="bg-paper rounded-2xl shadow-soft p-5 h-full">
                  <div className="w-9 h-9 rounded-full bg-brand text-white text-[15px] font-bold flex items-center justify-center mb-3">
                    {s.n}
                  </div>
                  <h3 className="text-[15px] font-bold text-ink mb-1.5">{s.title}</h3>
                  <p className="text-[13px] text-ink-muted leading-relaxed">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-6 py-16 lg:py-24 text-center">
        <Reveal>
          <Toko pose="cheer" size={96} className="mx-auto mb-5" />
          <h2 className="text-[28px] lg:text-[40px] font-extrabold text-ink leading-tight tracking-tight mb-3">
            your placement season starts now.
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
        </Reveal>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto w-full px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[12px] font-bold tracking-[0.12em] text-ink-muted" style={{ fontFamily: "var(--font-display)" }}>
            kodetalent
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
