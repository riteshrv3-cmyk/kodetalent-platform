// Semantic color for scores and match percentages. Scores are judgements, not
// decoration — they must never render in brand indigo. One mapping app-wide:
//   >= 70  done (green)   "you're there"
//   40-69  amber          "getting there"
//   <  40  danger (red)   "needs work"
// Pass 0-100 values; for /10 scores multiply by 10 first.

export type ScoreTone = "done" | "amber" | "danger";

export function scoreTone(pct: number): ScoreTone {
  if (pct >= 70) return "done";
  if (pct >= 40) return "amber";
  return "danger";
}

/** Text color class for a 0-100 score. */
export function scoreTextClass(pct: number): string {
  return { done: "text-done", amber: "text-amber", danger: "text-danger" }[scoreTone(pct)];
}

/** Soft badge (bg + text) classes for a 0-100 score. */
export function scoreBadgeClass(pct: number): string {
  return {
    done: "bg-done/10 text-done",
    amber: "bg-amber/10 text-amber",
    danger: "bg-danger/10 text-danger",
  }[scoreTone(pct)];
}
