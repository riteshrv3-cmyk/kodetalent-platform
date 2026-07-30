import type { TemplateConfig } from "../templateConfig";

export const minimalTemplate: TemplateConfig = {
  id: "minimal",
  label: "Minimal",
  description: "No rules, generous whitespace — ultra-clean",
  fontFamily: "sans",
  density: "airy",
  accent: null,
  header: {
    align: "left",
    nameCase: "title",
    showHeadline: true,
    accentBar: false,
  },
  sectionHeading: {
    rule: "none",
    ruleWeight: 0,
    useAccent: false,
  },
  bullet: { glyph: "–" },
  headingLabels: {},
};
