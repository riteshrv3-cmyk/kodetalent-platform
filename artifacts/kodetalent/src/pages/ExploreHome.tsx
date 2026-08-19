import { useLocation } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Briefcase, FileText, Target, GraduationCap, User, ChevronRight } from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { ClaimOnSignIn } from "@/components/ClaimOnSignIn";
import { useStudentId } from "@/hooks/useStudentId";
import { DemoBanner, SampleChip } from "@/components/DemoBanner";
import {
  DEMO_PROFILE,
  DEMO_RESUMES,
  DEMO_INTERVIEW_REPORT,
  DEMO_ENROLLMENT,
  DEMO_MATCHED_TEASER,
} from "@/data/demoStudent";

// Explore-first home. kodetalent.in opens straight here — anonymous visitors
// browse in DEMO mode (sample student "Priya Sharma"), and the first real
// action routes through the NameGate. This is a feature-cards launcher, NOT a
// momentum hub: no daily strip, no streak, no tasks, and NO load animation —
// perceived speed matters, so nothing animates on first paint.

interface FeatureCard {
  key: string;
  title: string;
  valueProp: string;
  icon: ElementType;
  href: string;
  /** Live "state" line under the value prop. `sample` badges Priya's data. */
  state: ReactNode | null;
  sample: boolean;
}

export default function ExploreHome() {
  const [, setLocation] = useLocation();
  const { isDemo } = useStudentId();
  const reduced = useReducedMotion();
  const tap = reduced ? undefined : { scale: 0.98 };

  // Real mode stays cheap: no new API calls on the home surface. The only
  // dynamic bit is the guest's own name, already in localStorage (no fetch).
  const firstName =
    typeof window !== "undefined"
      ? (localStorage.getItem("studentName") ?? "").trim().split(/\s+/)[0]
      : "";

  const jobs: FeatureCard = {
    key: "jobs",
    title: "Jobs",
    valueProp: "Real jobs, internships and freelance work — updated daily.",
    icon: Briefcase,
    href: "/opportunities",
    sample: isDemo,
    state: isDemo
      ? `${DEMO_MATCHED_TEASER.length} roles match Priya`
      : "Live roles, updated daily",
  };

  const rest: FeatureCard[] = [
    {
      key: "resume",
      title: "Resume",
      valueProp: "Build an ATS-friendly resume from your GitHub.",
      icon: FileText,
      href: "/resume",
      sample: isDemo,
      state: isDemo ? `Priya's resume · ATS ${DEMO_RESUMES[0].atsScore}` : null,
    },
    {
      key: "practice",
      title: "Practice",
      valueProp: "Mock interviews with an AI interviewer, scored.",
      icon: Target,
      href: "/practice",
      sample: isDemo,
      state: isDemo ? `Last mock ${DEMO_INTERVIEW_REPORT.overallScore}/10` : null,
    },
    {
      key: "courses",
      title: "Courses",
      valueProp: "Short tracks for the skills your role needs.",
      icon: GraduationCap,
      href: "/practice/courses",
      sample: isDemo,
      state: isDemo
        ? `${DEMO_ENROLLMENT.subDomainName} · ${DEMO_ENROLLMENT.progressPct}%`
        : null,
    },
    {
      key: "profile",
      title: "Profile",
      valueProp: "Your evidence — projects, skills and links.",
      icon: User,
      href: "/profile",
      sample: isDemo,
      state: isDemo
        ? `${DEMO_PROFILE.name} · ${DEMO_PROFILE.field}`
        : firstName
          ? `Signed in as ${firstName}`
          : null,
    },
  ];

  const StateLine = ({ card }: { card: FeatureCard }) =>
    card.state ? (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        <span>{card.state}</span>
        {card.sample && <SampleChip />}
      </span>
    ) : null;

  return (
    <div className="min-h-screen bg-canvas pb-28">
      <ClaimOnSignIn />

      {/* Canopy header — positioning is visible immediately, no animation. */}
      <div className="bg-brand px-4 pt-8 pb-12">
        <div className="max-w-md lg:max-w-2xl mx-auto">
          <h1 className="text-display text-[28px] lg:text-[34px] font-extrabold text-white leading-[1.1] tracking-tight text-balance">
            Everything for placement season.
          </h1>
          <p className="text-[14px] text-white/80 mt-2">
            Free for students. Explore first — no signup needed.
          </p>
        </div>
      </div>

      <div className="px-4 -mt-7 max-w-md lg:max-w-2xl mx-auto space-y-3">
        {isDemo && <DemoBanner />}

        {/* Jobs — the visual anchor. Real content with zero input, so it's the
            obvious first tap: full-width, brand-tinted, larger than the rest. */}
        <motion.button
          whileTap={tap}
          onClick={() => setLocation(jobs.href)}
          className="w-full text-left bg-brand text-white rounded-3xl p-5 shadow-soft flex items-center gap-4"
          data-testid="explore-card-jobs"
        >
          <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <jobs.icon className="w-7 h-7 text-white" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[22px] font-extrabold leading-tight">{jobs.title}</span>
            <span className="block text-[13px] text-white/80 mt-0.5">{jobs.valueProp}</span>
            <span className="block text-[12px] font-semibold text-white/90 mt-1.5">
              <StateLine card={jobs} />
            </span>
          </span>
          <ChevronRight className="w-6 h-6 text-white/80 shrink-0" />
        </motion.button>

        {/* Remaining features — secondary weight, 2-up on desktop. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {rest.map((card) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.key}
                whileTap={tap}
                onClick={() => setLocation(card.href)}
                className="w-full text-left bg-paper rounded-2xl p-4 shadow-soft flex items-center gap-3.5"
                data-testid={`explore-card-${card.key}`}
              >
                <span className="w-11 h-11 rounded-xl bg-brand-soft flex items-center justify-center text-brand shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[16px] font-bold text-ink leading-tight">{card.title}</span>
                  <span className="block text-[12px] text-ink-muted mt-0.5">{card.valueProp}</span>
                  {card.state && (
                    <span className="block text-[11px] font-semibold text-brand mt-1">
                      <StateLine card={card} />
                    </span>
                  )}
                </span>
                <ChevronRight className="w-5 h-5 text-ink-muted shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
