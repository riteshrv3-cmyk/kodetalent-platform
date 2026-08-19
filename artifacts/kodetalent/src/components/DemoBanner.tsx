import { Eye } from "lucide-react";

// Explore-mode signposting. The banner sits at the top of a feature in demo
// mode; the chip marks any individual card whose data is the sample student's,
// so a visitor can never mistake Priya's resume/report for real personal data.

export function DemoBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl bg-brand-soft px-3.5 py-2.5 text-brand ${className}`}
      role="note"
    >
      <Eye className="w-4 h-4 flex-shrink-0" />
      <p className="text-[13px] font-semibold leading-tight">
        You're viewing a sample student — tap any action to start your own.
      </p>
    </div>
  );
}

/** Small "Sample" pill for an individual demo card. */
export function SampleChip({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand ${className}`}
    >
      Sample
    </span>
  );
}
