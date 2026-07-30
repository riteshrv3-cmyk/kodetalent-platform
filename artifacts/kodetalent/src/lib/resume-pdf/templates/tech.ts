import type { TemplateConfig } from "../templateConfig";

export const techTemplate: TemplateConfig = {
  id: "tech",
  label: "Tech-Focused",
  description: "Compact, brand accent — highlights your stack",
  fontFamily: "sans",
  density: "compact",
  accent: { r: 74, g: 85, b: 199 }, // brand indigo, an inset accent bar/rule — never full-bleed
  header: {
    align: "left",
    nameCase: "title",
    showHeadline: true,
    accentBar: { height: 3 },
  },
  sectionHeading: {
    rule: "short",
    ruleWeight: 2,
    useAccent: true,
  },
  bullet: { glyph: "▪" },
  headingLabels: {},
};
