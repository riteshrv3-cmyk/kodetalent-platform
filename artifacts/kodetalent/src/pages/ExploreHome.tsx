import { useLocation } from "wouter";
import { Briefcase, FileText, Target, GraduationCap, User, ChevronRight } from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { ClaimOnSignIn } from "@/components/ClaimOnSignIn";
import { PageHeader } from "@/components/PageHeader";
import { DemoSurface } from "@/components/DemoBanner";
import { PressableCard } from "@/components/PressableCard";
import { scoreTextClass } from "@/lib/scoreTone";
import { useStudentId } from "@/hooks/useStudentId";
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
  /** Live "state" line under the value prop (Priya's data in demo mode). */
  state: ReactNode | null;
}

export default function ExploreHome() {
  const [, setLocation] = useLocation();
  const { isDemo } = useStudentId();

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
      state: isDemo ? (
        <>
          Priya's resume · ATS{" "}
          <span className={scoreTextClass(DEMO_RESUMES[0].atsScore)}>
            {DEMO_RESUMES[0].atsScore}
          </span>
        </>
      ) : null,
    },
    {
      key: "practice",
      title: "Practice",
      valueProp: "Mock interviews with an AI interviewer, scored.",
      icon: Target,
      href: "/practice",
      state: isDemo ? (
        <>
          Last mock{" "}
          <span className={scoreTextClass(DEMO_INTERVIEW_REPORT.overallScore * 10)}>
            {DEMO_INTERVIEW_REPORT.overallScore}/10
          </span>
        </>
      ) : null,
    },
    {
      key: "courses",
      title: "Courses",
      valueProp: "Short tracks for the skills your role needs.",
      icon: GraduationCap,
      href: "/practice/courses",
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
      state: isDemo
        ? `${DEMO_PROFILE.name} · ${DEMO_PROFILE.field}`
        : firstName
          ? `Signed in as ${firstName}`
          : null,
    },
  ];

  return (
    <div className="min-h-screen bg-canvas pb-28">
      <ClaimOnSignIn />

      <PageHeader
        title="Everything for placement season."
        subtitle="Free for students. Explore first — no signup needed."
      />

      {/* Content sheet flow: the DemoBanner (rendered by DemoSurface) is the
          first element INSIDE the cards container, not overlapping the canopy
          edge. DemoSurface also suppresses per-card SampleChips — one demo
          signal per surface; Priya's state lines stay in text-brand instead. */}
      <div className="px-4 -mt-6 max-w-md lg:max-w-2xl mx-auto space-y-3">
        <DemoSurface>
          {/* Jobs — the visual anchor. Real content with zero input, so it's
              the obvious first tap: full-width, brand-tinted, larger. */}
          <PressableCard
            onClick={() => setLocation(jobs.href)}
            className="w-full bg-brand text-white rounded-3xl p-5 lg:p-6 shadow-soft flex items-center gap-4"
            data-testid="explore-card-jobs"
          >
            <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <jobs.icon className="w-7 h-7 text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block type-title font-extrabold">{jobs.title}</span>
              <span className="block type-caption text-white/80 mt-0.5">{jobs.valueProp}</span>
              <span className="block type-caption font-semibold text-white/90 mt-1.5">
                {jobs.state}
              </span>
            </span>
            <ChevronRight className="w-6 h-6 text-white/80 shrink-0" />
          </PressableCard>

          {/* Remaining features — secondary weight, 2-up on desktop. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rest.map((card) => {
              const Icon = card.icon;
              return (
                <PressableCard
                  key={card.key}
                  onClick={() => setLocation(card.href)}
                  className="w-full bg-paper rounded-2xl p-4 lg:p-5 shadow-soft flex items-center gap-3.5"
                  data-testid={`explore-card-${card.key}`}
                >
                  <span className="w-11 h-11 rounded-xl bg-brand-soft flex items-center justify-center text-brand shrink-0">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block type-body font-bold text-ink leading-tight">{card.title}</span>
                    <span className="block type-caption text-ink-muted mt-0.5">{card.valueProp}</span>
                    {card.state && (
                      <span className="block type-micro font-semibold text-brand mt-1">
                        {card.state}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="w-5 h-5 text-ink-muted shrink-0" />
                </PressableCard>
              );
            })}
          </div>
        </DemoSurface>
      </div>
    </div>
  );
}
