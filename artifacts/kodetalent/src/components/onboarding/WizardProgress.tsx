import { motion, useReducedMotion } from "framer-motion";

interface WizardProgressProps {
  step: number;
  totalSteps: number;
  title: string;
}

/**
 * Step label + progress bar for the onboarding wizard canopy. Plain text, not
 * a heading — so it sits outside the .marketing lowercase-heading rule and
 * keeps its own deliberate uppercase tracking, same as the landing's eyebrow
 * labels.
 */
export function WizardProgress({ step, totalSteps, title }: WizardProgressProps) {
  const reduced = useReducedMotion();
  const pct = (step / totalSteps) * 100;

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60 mb-2">
        step {step} of {totalSteps} · {title}
      </p>
      <div className="h-1 rounded-full bg-white/20 overflow-hidden">
        <motion.div
          className="h-full bg-white rounded-full"
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
