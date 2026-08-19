import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Download, Share2, Pencil, FileText, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBanner, SampleChip } from "@/components/DemoBanner";
import { DEMO_RESUMES } from "@/data/demoStudent";

// Read-only explore-mode view of the resume feature for anonymous visitors
// (no localStorage.studentId). Renders PURELY from fixtures — it never touches
// an authed /students/:id endpoint, so it can't trigger the 401 localStorage
// wipe. Every button funnels to `onStart`, which routes the first real action
// through the NameGate up in Resume.tsx.

export default function ResumeDemo({ onStart }: { onStart: () => void }) {
  const reduce = useReducedMotion();
  const demo = DEMO_RESUMES[0];

  return (
    <div className="p-4 pb-28 max-w-md lg:max-w-3xl mx-auto space-y-5 min-h-screen bg-canvas">
      <DemoBanner />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-display text-[30px] lg:text-[36px] font-extrabold text-ink leading-[1.06] tracking-tight">
            My Resumes
          </h1>
          <p className="text-[13px] text-ink-muted mt-1">
            AI-generated from your real profile · ATS-friendly
          </p>
        </div>
        <motion.div whileTap={reduce ? undefined : { scale: 0.96 }}>
          <Button
            onClick={onStart}
            className="rounded-full bg-brand text-white hover:bg-brand/90 font-bold px-4 h-10"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Build
          </Button>
        </motion.div>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Sample Resume</p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          className="bg-paper rounded-2xl shadow-soft p-4 space-y-3"
        >
          {/* Header row: title + sample chip + ATS badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-ink text-[15px]">{demo.title}</p>
                <SampleChip />
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] text-ink-muted font-medium flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {demo.targetRole}
                </span>
                <span className="text-[11px] text-ink-muted">{demo.updatedLabel}</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand shrink-0">
              ATS match {demo.atsScore}%
            </span>
          </div>

          {/* How caption — quietly sells the action that produced this */}
          <p className="text-[11px] text-ink-muted italic leading-snug">{demo.howCaption}</p>

          {/* Headline + summary */}
          <div className="space-y-1.5 pt-1">
            <p className="text-[13px] font-bold text-ink">{demo.headline}</p>
            <p className="text-[12px] text-ink-muted leading-relaxed">{demo.summary}</p>
          </div>

          {/* Highlights */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Highlights</p>
            <ul className="space-y-1.5">
              {demo.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-ink leading-relaxed">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-brand shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions — all funnel to onStart */}
          <div className="flex gap-2 flex-wrap pt-2">
            <Button
              onClick={onStart}
              variant="outline"
              className="flex-1 h-9 rounded-full font-bold text-xs border border-line text-brand"
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              onClick={onStart}
              className="flex-1 h-9 rounded-full bg-brand text-white hover:bg-brand/90 font-bold text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              PDF
            </Button>
            <Button
              onClick={onStart}
              variant="outline"
              className="flex-1 h-9 rounded-full font-bold text-xs border border-line text-ink-muted"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              DOCX
            </Button>
            <Button
              onClick={onStart}
              variant="outline"
              className="h-9 w-9 rounded-full border border-line text-ink-muted flex items-center justify-center shrink-0"
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Primary CTA */}
      <motion.div whileTap={reduce ? undefined : { scale: 0.98 }}>
        <Button
          onClick={onStart}
          className="w-full h-12 rounded-full bg-brand text-white hover:bg-brand/90 font-bold text-[15px]"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Build my resume
        </Button>
      </motion.div>
      <p className="text-center text-[12px] text-ink-muted -mt-2">
        Built from your GitHub and a job post — yours in minutes.
      </p>
    </div>
  );
}
