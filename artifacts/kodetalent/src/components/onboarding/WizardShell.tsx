import { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { WizardProgress } from "./WizardProgress";

interface WizardShellProps {
  step: number;
  totalSteps: number;
  title: string;
  /** 1 = advancing forward, -1 = going back. Drives slide direction. */
  direction: 1 | -1;
  onBack?: () => void;
  children: ReactNode;
}

/**
 * Fullscreen chrome for the onboarding wizard — renders outside AppLayout
 * (see AppLayout.tsx's isFullscreenRoute check for "/onboarding"), so this is
 * a self-contained page shell: canopy strip with back + progress, paper sheet
 * for the step body. `.marketing` scopes step headings to the display font +
 * lowercase voice, same as the landing page.
 */
export function WizardShell({ step, totalSteps, title, direction, onBack, children }: WizardShellProps) {
  const reduced = useReducedMotion();

  return (
    <div className="marketing min-h-[100dvh] bg-canvas" style={{ overflowX: "clip" }}>
      <div className="bg-brand px-6 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-8">
        <div className="flex items-center justify-between mb-5 min-h-6">
          {onBack ? (
            // 44px tap target (WCAG touch-target minimum) via a fixed hit box,
            // offset with -ml-2.5 so the visible icon lands where a bare p-1
            // button would have sat — the row's own height stays untouched.
            <button
              onClick={onBack}
              aria-label="Back"
              className="w-11 h-11 -ml-2.5 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <span />
          )}
          <span
            className="text-[13px] font-bold tracking-[0.1em] text-white/50"
            style={{ fontFamily: "var(--font-display)" }}
          >
            kodetalent
          </span>
        </div>
        <WizardProgress step={step} totalSteps={totalSteps} title={title} />
      </div>

      <div className="bg-paper rounded-t-3xl -mt-6 px-6 pt-7 pb-10 max-w-md lg:max-w-lg mx-auto shadow-soft relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduced ? false : { opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
