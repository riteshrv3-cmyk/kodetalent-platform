import { useLocation } from "wouter";
import {
  FileText,
  Mic,
  GraduationCap,
  Briefcase,
  ArrowRight,
} from "lucide-react";

// First-visit landing. Shows the product before the app: credibility page for
// students, parents, TPOs and recruiters who want to read before touching.
// Seen ONCE per device — the Explore CTA (or any prior visit that entered the
// app) sets `kt:entered`, after which "/" goes straight to the explore home
// (see HomeGate in App.tsx). Marketing voice: the `.marketing` wrapper gives
// lowercase display-face headlines (index.css), body copy stays sentence case.
// No load animations — this page's job is to feel instant, then get out of
// the way.

const FEATURES = [
  {
    icon: FileText,
    title: "AI resume",
    desc: "Built from your real work — GitHub, projects, internships. ATS-checked, no fluff.",
  },
  {
    icon: Mic,
    title: "Mock interviews",
    desc: "A voice AI interviewer that asks real questions and scores you honestly.",
  },
  {
    icon: GraduationCap,
    title: "Courses + certificates",
    desc: "Quiz-gated courses that end in a verifiable certificate — exam plus AI interview, earned not given.",
  },
  {
    icon: Briefcase,
    title: "Real jobs",
    desc: "Fresher-friendly openings and internships, India-first, updated daily.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "look around",
    desc: "Open the app and explore everything through a sample student — no signup, no forms.",
  },
  {
    n: "2",
    title: "do it for real",
    desc: "The first time you act, we ask one thing: your name. That's the whole onboarding.",
  },
  {
    n: "3",
    title: "walk out with proof",
    desc: "A resume that's really you, and a certificate anyone can verify with a link.",
  },
];

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const [, setLocation] = useLocation();

  const enter = () => {
    localStorage.setItem("kt:entered", "1");
    onEnter();
  };

  return (
    <div className="marketing min-h-[100dvh] bg-paper">
      {/* Header */}
      <header className="max-w-5xl mx-auto flex items-center justify-between px-5 py-4">
        <span className="text-display font-extrabold text-ink text-[20px]">
          kodetalent
        </span>
        <button
          type="button"
          onClick={() => setLocation("/sign-in")}
          className="type-caption font-bold text-brand rounded-full border border-line px-4 py-2"
        >
          Sign in
        </button>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-8 pb-14 lg:pt-16 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-[38px] lg:text-[52px] leading-[1.05] text-ink text-balance">
            crack placements.
            <br />
            see the app first.
          </h1>
          <p className="type-body text-ink-muted mt-4 max-w-[46ch]">
            Resume, AI mock interviews, courses with verifiable certificates,
            and real jobs — one app for placement season. Explore all of it
            before you even sign up.
          </p>
          <div className="mt-7 flex items-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={enter}
              data-testid="landing-explore-cta"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-brand text-white type-body font-bold"
            >
              Explore the app free <ArrowRight className="w-4 h-4" />
            </button>
            <span className="type-caption text-ink-muted">
              No account needed to look around.
            </span>
          </div>
        </div>

        {/* Phone frame — the real app, not a mockup */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-[270px] rounded-[2.2rem] border-[6px] border-ink bg-ink shadow-[0_24px_60px_rgba(26,29,46,0.25)] overflow-hidden">
            <img
              src="/landing/shot-home.jpg"
              alt="KodeTalent app home"
              className="w-full block"
              width={360}
              height={780}
            />
          </div>
        </div>
      </section>

      {/* Feature row */}
      <section className="bg-canvas py-14">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-[26px] lg:text-[32px] text-ink mb-8">
            everything placement season asks of you.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-paper rounded-2xl p-5 shadow-soft"
              >
                <span className="w-11 h-11 rounded-xl bg-brand-soft flex items-center justify-center text-brand mb-3">
                  <f.icon className="w-5 h-5" />
                </span>
                <h3 className="type-body font-bold text-ink">{f.title}</h3>
                <p className="type-caption text-ink-muted mt-1">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Two supporting screens */}
          <div className="mt-10 grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="rounded-2xl border border-line overflow-hidden bg-paper shadow-soft">
              <img
                src="/landing/shot-practice.jpg"
                alt="Mock interview practice screen"
                className="w-full block"
                width={360}
                height={780}
                loading="lazy"
              />
            </div>
            <div className="rounded-2xl border border-line overflow-hidden bg-paper shadow-soft">
              <img
                src="/landing/shot-resume.jpg"
                alt="AI resume screen"
                className="w-full block"
                width={360}
                height={780}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-[26px] lg:text-[32px] text-ink mb-8">
            three steps, zero friction.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-line p-5">
                <span className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-extrabold type-body mb-3">
                  {s.n}
                </span>
                <h3 className="type-body font-bold text-ink">{s.title}</h3>
                <p className="type-caption text-ink-muted mt-1">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={enter}
              className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-brand text-white type-body font-bold"
            >
              Explore the app free <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-8">
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between flex-wrap gap-3">
          <span className="type-caption text-ink-muted">
            KodeTalent — built for Indian engineering students.
          </span>
          <button
            type="button"
            onClick={() => setLocation("/sign-in")}
            className="type-caption font-bold text-brand"
          >
            Sign in
          </button>
        </div>
      </footer>
    </div>
  );
}
