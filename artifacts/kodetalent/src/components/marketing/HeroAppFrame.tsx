import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BadgeCheck } from "lucide-react";

/**
 * Scripted product demo for the landing hero — a framed mini resume-builder
 * that loops: JD snippet types in → pipeline stages light up → ATS score
 * counts up → "every line verified" badge lands. Pure JSX/motion, no video.
 *
 * The stages shown are the real pipeline stages (jd → map → draft → critic),
 * so the demo never promises something the product doesn't do. With reduced
 * motion the frame renders the finished state statically.
 */

const JD_TEXT = "SDE-1 · React, Node, SQL · 0-1 yrs · Bengaluru";

const STAGES = [
  "reading the job post",
  "mapping your real work",
  "drafting every line",
  "tough-love critic pass",
];

/** Timeline (ms from loop start) for each phase of the script. */
const T_TYPE_END = 1800; // JD finishes typing
const T_STAGE_MS = 850; // per stage chip
const T_SCORE = T_TYPE_END + STAGES.length * T_STAGE_MS; // score starts
const T_BADGE = T_SCORE + 1100; // badge lands
const T_LOOP = T_BADGE + 2600; // full loop length

const ATS_TARGET = 86;

export function HeroAppFrame() {
  const reduced = useReducedMotion();
  const [now, setNow] = useState(reduced ? T_LOOP : 0);

  useEffect(() => {
    if (reduced) return;
    const started = performance.now();
    let raf: number;
    const tick = (t: number) => {
      setNow((t - started) % T_LOOP);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const typedChars = reduced
    ? JD_TEXT.length
    : Math.min(JD_TEXT.length, Math.floor((now / T_TYPE_END) * JD_TEXT.length));
  const activeStage = reduced
    ? STAGES.length
    : now < T_TYPE_END
      ? -1
      : Math.min(STAGES.length, Math.floor((now - T_TYPE_END) / T_STAGE_MS) + 1);
  const scoreProgress = reduced
    ? 1
    : now < T_SCORE
      ? 0
      : Math.min(1, (now - T_SCORE) / 900);
  const score = Math.round(ATS_TARGET * scoreProgress);
  const showBadge = reduced || now >= T_BADGE;

  return (
    <div className="w-full max-w-[440px] bg-paper rounded-2xl shadow-soft overflow-hidden select-none" aria-hidden="true">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-line">
        <span className="w-2.5 h-2.5 rounded-full bg-line" />
        <span className="w-2.5 h-2.5 rounded-full bg-line" />
        <span className="w-2.5 h-2.5 rounded-full bg-line" />
        <span className="ml-3 text-[10px] font-semibold text-ink-muted tracking-wide">
          kodetalent · resume builder
        </span>
      </div>

      <div className="p-4 lg:p-5">
        {/* JD input being typed */}
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">
          Target job
        </p>
        <div className="rounded-xl border border-line bg-canvas px-3 py-2.5 mb-4 min-h-[38px]">
          <span className="text-[12px] font-medium text-ink">
            {JD_TEXT.slice(0, typedChars)}
            {!reduced && typedChars < JD_TEXT.length && (
              <span className="inline-block w-[2px] h-[13px] bg-brand align-middle ml-0.5 animate-pulse" />
            )}
          </span>
        </div>

        {/* Pipeline stages */}
        <div className="flex flex-col gap-2 mb-4">
          {STAGES.map((label, i) => {
            const state = i < activeStage ? "done" : i === activeStage ? "active" : "idle";
            return (
              <div key={label} className="flex items-center gap-2.5">
                <motion.span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  animate={{
                    backgroundColor:
                      state === "idle" ? "#ecedf3" : state === "active" ? "#eef0fb" : "#4a55c7",
                  }}
                  transition={{ duration: 0.25 }}
                >
                  {state === "done" ? (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : state === "active" ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                  ) : null}
                </motion.span>
                <span
                  className={
                    "text-[12px] font-semibold transition-colors duration-200 " +
                    (state === "idle" ? "text-ink-muted/60" : "text-ink")
                  }
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ATS score + verified badge */}
        <div className="flex items-center justify-between rounded-xl bg-brand-soft px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand/70 mb-0.5">
              ATS score
            </p>
            <p className="text-[24px] font-extrabold text-brand leading-none tabular-nums">
              {score}
            </p>
          </div>
          <AnimatePresence>
            {showBadge && (
              <motion.span
                initial={reduced ? false : { scale: 0.6, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
                className="inline-flex items-center gap-1.5 bg-paper rounded-full pl-2 pr-3 py-1.5 shadow-soft"
              >
                <BadgeCheck className="w-4 h-4 text-brand" />
                <span className="text-[11px] font-bold text-ink">every line verified</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
