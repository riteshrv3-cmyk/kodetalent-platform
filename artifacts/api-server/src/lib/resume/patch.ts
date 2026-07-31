import type { CriticPatch, ResumeDocument } from "@workspace/resume-core";

const BULLET_PATH = /^(experience|projects)\[(\d+)\]\.bullets\[(\d+)\]\.text$/;
const SKILL_CATEGORY_PATH = /^skillSections\[(\d+)\]\.category$/;
const ACHIEVEMENT_PATH = /^achievements\[(\d+)\]\.text$/;

/**
 * Applies critic patches. Every patch REPLACES an existing string at an
 * allowed path — never inserts a new array entry — so the critic cannot
 * smuggle in new content, only rewrite what's already there.
 */
export function applyPatches(doc: ResumeDocument, patches: CriticPatch[]): ResumeDocument {
  let next = doc;

  for (const patch of patches) {
    if (patch.path === "summary") {
      next = { ...next, summary: patch.value };
      continue;
    }
    if (patch.path === "headline") {
      next = { ...next, headline: patch.value };
      continue;
    }

    const bulletMatch = patch.path.match(BULLET_PATH);
    if (bulletMatch) {
      const [, section, entryIdxRaw, bulletIdxRaw] = bulletMatch;
      const entryIdx = Number(entryIdxRaw);
      const bulletIdx = Number(bulletIdxRaw);
      if (section === "experience" && next.experience[entryIdx]?.bullets[bulletIdx]) {
        const experience = next.experience.map((e, i) =>
          i !== entryIdx ? e : { ...e, bullets: e.bullets.map((b, j) => (j === bulletIdx ? { ...b, text: patch.value } : b)) },
        );
        next = { ...next, experience };
      } else if (section === "projects" && next.projects[entryIdx]?.bullets[bulletIdx]) {
        const projects = next.projects.map((p, i) =>
          i !== entryIdx ? p : { ...p, bullets: p.bullets.map((b, j) => (j === bulletIdx ? { ...b, text: patch.value } : b)) },
        );
        next = { ...next, projects };
      }
      continue;
    }

    const skillMatch = patch.path.match(SKILL_CATEGORY_PATH);
    if (skillMatch) {
      const idx = Number(skillMatch[1]);
      if (next.skillSections[idx]) {
        const skillSections = next.skillSections.map((s, i) => (i === idx ? { ...s, category: patch.value } : s));
        next = { ...next, skillSections };
      }
      continue;
    }

    const achMatch = patch.path.match(ACHIEVEMENT_PATH);
    if (achMatch) {
      const idx = Number(achMatch[1]);
      if (next.achievements[idx]) {
        const achievements = next.achievements.map((a, i) => (i === idx ? { ...a, text: patch.value } : a));
        next = { ...next, achievements };
      }
    }
  }

  return next;
}
