// Deterministic, non-LLM fallbacks shared across the pipeline stages — kept
// here once so ledger.ts and stage3-draft.ts don't drift on the same
// flat-field formatting when a student hasn't filled the structured
// Education card yet.

const FIELD_DEGREES: Record<string, string> = {
  "Computer Science": "B.Tech Computer Science & Engineering",
  "Electronics": "B.Tech Electronics & Communication Engineering",
  "Mechanical": "B.Tech Mechanical Engineering",
  "Civil": "B.Tech Civil Engineering",
  "Electrical": "B.Tech Electrical Engineering",
  "Information Technology": "B.Tech Information Technology",
  "Data Science": "B.Tech Data Science & AI",
};

export function formatDegree(field: string): string {
  return FIELD_DEGREES[field] ?? `B.Tech ${field} Engineering`;
}

export function gradYearFor(year: number): number {
  return new Date().getFullYear() + (4 - year);
}
