import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FileText, Hammer, Sprout } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Three entry paths on the landing page. Each routes into onboarding with a
 * journey param that tailors the wizard (step 3 differs per journey).
 * Framing is KodeTalent's own: placement season now / building already /
 * just starting — not persona labels.
 */

const JOURNEYS = [
  {
    key: "placement",
    icon: FileText,
    eyebrow: "journey 1 · placement season",
    title: "placement season is now",
    body: "Resume first. Paste a JD, add your real work, and walk out with an ATS-ready resume in minutes.",
    cta: "build my resume",
  },
  {
    key: "builder",
    icon: Hammer,
    eyebrow: "journey 2 · already building",
    title: "i ship projects already",
    body: "Start from your GitHub. We turn repos and projects into evidence recruiters can actually check.",
    cta: "start from github",
  },
  {
    key: "beginner",
    icon: Sprout,
    eyebrow: "journey 3 · just starting",
    title: "i'm just getting started",
    body: "Pick your starting skills and get a roadmap plus daily tasks — no resume material needed yet.",
    cta: "see where to start",
  },
] as const;

export function JourneyCards() {
  const [, setLocation] = useLocation();
  const reduced = useReducedMotion();

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {JOURNEYS.map((j, i) => {
        const Icon = j.icon;
        return (
          <motion.button
            key={j.key}
            type="button"
            onClick={() => setLocation(`/onboarding?journey=${j.key}`)}
            initial={reduced ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
            whileHover={reduced ? undefined : { y: -4 }}
            className="text-left bg-paper rounded-2xl shadow-soft p-6 flex flex-col group cursor-pointer"
            data-testid={`journey-${j.key}`}
          >
            <div className="w-11 h-11 rounded-xl bg-brand-soft flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-brand" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted mb-2">
              {j.eyebrow}
            </p>
            <h3 className="text-[19px] font-bold text-ink leading-snug mb-2">{j.title}</h3>
            <p className="text-[13px] text-ink-muted leading-relaxed mb-5 flex-1">{j.body}</p>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand">
              {j.cta}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
