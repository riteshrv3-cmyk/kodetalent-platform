export type TemplateDensity = "compact" | "normal" | "airy";

export interface LedgerVolume {
  experienceCount: number;
  projectCount: number;
  certificationCount: number;
  skillCount: number;
}

export interface DensityBudget {
  summaryMaxSentences: number;
  experienceMaxEntries: number;
  experienceMaxBulletsPerEntry: number;
  projectsMaxEntries: number;
  projectsMaxBulletsPerEntry: number;
  skillsMaxCategories: number;
  skillsMaxItemsPerCategory: number;
  achievementsMaxItems: number;
}

const DENSITY_MULTIPLIER: Record<TemplateDensity, number> = {
  compact: 1.15,
  normal: 1.0,
  airy: 0.85,
};

const BASE: DensityBudget = {
  summaryMaxSentences: 3,
  experienceMaxEntries: 3,
  experienceMaxBulletsPerEntry: 4,
  projectsMaxEntries: 3,
  projectsMaxBulletsPerEntry: 3,
  skillsMaxCategories: 5,
  skillsMaxItemsPerCategory: 8,
  achievementsMaxItems: 4,
};

function scale(n: number, mult: number): number {
  return Math.max(1, Math.round(n * mult));
}

/**
 * Computes a per-generation density budget: template density controls
 * whitespace/count generosity, but the budget is also capped by what the
 * ledger actually has — a student with 2 projects gets a budget that can't
 * exceed 2 project entries, so the drafting prompt is never invited to pad
 * with invented projects to "fill" a bigger budget.
 */
export function densityBudget(templateDensity: TemplateDensity, volume: LedgerVolume): DensityBudget {
  const mult = DENSITY_MULTIPLIER[templateDensity];
  return {
    summaryMaxSentences: BASE.summaryMaxSentences,
    experienceMaxEntries: Math.min(scale(BASE.experienceMaxEntries, mult), Math.max(volume.experienceCount, 0)) || 0,
    experienceMaxBulletsPerEntry: scale(BASE.experienceMaxBulletsPerEntry, mult),
    projectsMaxEntries: Math.min(scale(BASE.projectsMaxEntries, mult), Math.max(volume.projectCount, 0)) || 0,
    projectsMaxBulletsPerEntry: scale(BASE.projectsMaxBulletsPerEntry, mult),
    skillsMaxCategories: scale(BASE.skillsMaxCategories, mult),
    skillsMaxItemsPerCategory: scale(BASE.skillsMaxItemsPerCategory, mult),
    achievementsMaxItems: Math.min(scale(BASE.achievementsMaxItems, mult), Math.max(volume.certificationCount + 2, 1)),
  };
}

/** Renders the budget as the text block injected into the stage-3 drafting prompt. */
export function renderDensityBudget(budget: DensityBudget): string {
  return [
    `- summary: max ${budget.summaryMaxSentences} sentences`,
    `- experience: max ${budget.experienceMaxEntries} entries, max ${budget.experienceMaxBulletsPerEntry} bullets each`,
    `- projects: max ${budget.projectsMaxEntries} entries, max ${budget.projectsMaxBulletsPerEntry} bullets each`,
    `- skills: max ${budget.skillsMaxCategories} categories, max ${budget.skillsMaxItemsPerCategory} items each`,
    `- achievements: max ${budget.achievementsMaxItems} items`,
  ].join("\n");
}
