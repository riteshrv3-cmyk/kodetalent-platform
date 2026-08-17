import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft, BookOpen, CreditCard, HelpCircle, CheckCircle2,
  XCircle, RotateCcw, Star, AlertTriangle, Trophy, ChevronRight,
  ChevronDown, PlayCircle, FileText, PenLine, Hammer, ExternalLink,
  Clock, Lock, X, Loader2, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/authFetch";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CourseContext {
  subDomainId: string;
  subDomainName: string;
  domainName: string;
  domainColor: string;
  domainBg: string;
  domainEmoji: string;
  skills: string[];
}

interface Lesson {
  id: string;
  title: string;
  type: "video" | "reading" | "exercise" | "project";
  duration: string;
  description: string;
  keyPoints: string[];
  searchQuery: string;
}

interface CourseModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  emoji: string;
  topics: string[];
  lessons: Lesson[];
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

interface CourseData {
  modules: CourseModule[];
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
}

interface CardSM2 {
  n: number;
  EF: number;
  I: number;
  due: string;
  lapses: number;
}

type Tab = "roadmap" | "flashcards" | "quiz";

// ─── SM-2 Utilities ───────────────────────────────────────────────────────────

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

function sm2Update(state: CardSM2, grade: 1 | 3 | 4 | 5): CardSM2 {
  const { n, EF, I } = state;
  const due = new Date();
  if (grade >= 3) {
    const newI = n === 0 ? 1 : n === 1 ? 6 : Math.round(I * EF);
    const newEF = Math.max(1.3, EF + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    due.setDate(due.getDate() + newI);
    return { n: n + 1, EF: newEF, I: newI, due: due.toISOString(), lapses: state.lapses };
  }
  due.setDate(due.getDate() + 1);
  return { n: 0, EF: state.EF, I: 1, due: due.toISOString(), lapses: state.lapses + 1 };
}

function getCardDifficulty(ef: number): "easy" | "moderate" | "hard" {
  if (ef >= 2.5) return "easy";
  if (ef >= 1.8) return "moderate";
  return "hard";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ─── YouTube helpers ──────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtu.be/<id>
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    // youtube.com/watch?v=<id>  or  youtube.com/embed/<id>
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/");
      const embedIdx = parts.indexOf("embed");
      if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Lesson type config ───────────────────────────────────────────────────────

const LESSON_TYPE = {
  video:    { Icon: PlayCircle,  label: "Video" },
  reading:  { Icon: FileText,    label: "Reading" },
  exercise: { Icon: PenLine,     label: "Exercise" },
  project:  { Icon: Hammer,      label: "Project" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Course() {
  const [, setLocation] = useLocation();
  const reduced = useReducedMotion();

  const [ctx, setCtx] = useState<CourseContext | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [animReady, setAnimReady] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("roadmap");

  // ── Roadmap state ──────────────────────────────────────────────────────────
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  // ── In-app YouTube player ──────────────────────────────────────────────────
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);   // "lessonId|ytId" when playing
  const [videoLoading, setVideoLoading] = useState<string | null>(null);       // lessonId being fetched
  const [videoFallbackId, setVideoFallbackId] = useState<string | null>(null); // lessonId with no video result
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());  // lesson IDs of watched videos

  // ── Flashcard state ────────────────────────────────────────────────────────
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [progress, setProgress] = useState<Record<string, CardSM2>>({});
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [streak, setStreak] = useState(0);
  const [newCardsToday, setNewCardsToday] = useState(0);
  const DAILY_NEW_LIMIT = 20;

  // ── Quiz state ─────────────────────────────────────────────────────────────
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, boolean>>({});

  const hasFetched = useRef(false);

  const LOAD_MSGS = [
    "Mapping your learning path...",
    "Building lesson modules...",
    "Crafting flashcards...",
    "Writing quiz questions...",
    "Personalising the content...",
    "Almost ready...",
  ];
  const MIN_ANIM_MS = 3000;

  // ── Animation clock — rotates messages and enforces minimum display time ────
  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIndex(i => (i + 1) % LOAD_MSGS.length), 520);
    const doneTimer = setTimeout(() => setAnimReady(true), MIN_ANIM_MS);
    return () => { clearInterval(msgTimer); clearTimeout(doneTimer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("courseContext");
    if (!raw) { setLocation("/practice/courses"); return; }
    const c: CourseContext = JSON.parse(raw);
    setCtx(c);

    // Persist as "last opened course" for Home's Resume card
    try {
      localStorage.setItem("lastCourseContext", JSON.stringify({ ...c, openedAt: new Date().toISOString() }));
    } catch {/* quota — ignore */}

    // Load lesson progress
    const lp = localStorage.getItem(`lesson_progress_${c.subDomainId}`);
    if (lp) setCompletedLessons(new Set(JSON.parse(lp)));

    // Load watched video history
    const wv = localStorage.getItem(`watched_videos_${c.subDomainId}`);
    if (wv) setWatchedVideos(new Set(JSON.parse(wv)));

    // v2 cache key — includes lesson data
    const cacheKey = `course_content_v3_${c.subDomainId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setCourseData(JSON.parse(cached));
      setDataReady(true);
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    (async () => {
      try {
        const resp = await fetch("/api/course/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subDomainName: c.subDomainName, domainName: c.domainName, skills: c.skills }),
        });
        if (!resp.ok) throw new Error("Failed");
        const data: CourseData = await resp.json();
        localStorage.setItem(cacheKey, JSON.stringify(data));
        setCourseData(data);
        setDataReady(true);
      } catch {
        setError("Couldn't generate course. Please try again.");
        setDataReady(true);
      }
    })();
  }, [setLocation]);

  // ── Sync course progress to the server — feeds the Home checklist's R3 rule ──
  useEffect(() => {
    if (!courseData || !ctx) return;
    const studentId = localStorage.getItem("studentId");
    if (!studentId) return;
    const total = courseData.modules.reduce((s, m) => s + (m.lessons?.length ?? 0), 0);
    apiFetch(`/api/students/${studentId}/course-progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subDomainId: ctx.subDomainId,
        subDomainName: ctx.subDomainName,
        completed: completedLessons.size,
        total,
      }),
    }).catch(() => null);
  }, [courseData, ctx, completedLessons]);

  // ── Build flashcard queue ──────────────────────────────────────────────────
  useEffect(() => {
    if (!courseData || !ctx) return;
    const stored: Record<string, CardSM2> = JSON.parse(localStorage.getItem(`flashcards_progress_${ctx.subDomainId}`) || "{}");
    setProgress(stored);
    const todayCount = parseInt(localStorage.getItem(`daily_new_${ctx.subDomainId}_${todayKey()}`) || "0", 10);
    setNewCardsToday(todayCount);
    const now = new Date();
    const due = courseData.flashcards
      .filter(c => stored[c.id] && new Date(stored[c.id].due) <= now)
      .sort((a, b) => new Date(stored[a.id].due).getTime() - new Date(stored[b.id].due).getTime());
    const newC = fisherYatesShuffle(courseData.flashcards.filter(c => !stored[c.id])).slice(0, Math.max(0, DAILY_NEW_LIMIT - todayCount));
    setQueue([...due, ...newC]);
    setQueueIndex(0);
    const last = localStorage.getItem("flashcard_last_study");
    const today = todayKey();
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().slice(0, 10);
    const s = parseInt(localStorage.getItem("flashcard_streak") || "0", 10);
    setStreak(last === today || last === yestStr ? s : 0);
  }, [courseData, ctx]);

  // ── Mark video as watched ──────────────────────────────────────────────────
  const markVideoWatched = useCallback((lessonId: string) => {
    if (!ctx) return;
    setWatchedVideos(prev => {
      if (prev.has(lessonId)) return prev;
      const next = new Set(prev);
      next.add(lessonId);
      localStorage.setItem(`watched_videos_${ctx.subDomainId}`, JSON.stringify([...next]));
      return next;
    });
  }, [ctx]);

  // ── Toggle lesson complete ─────────────────────────────────────────────────
  const toggleLesson = useCallback((lessonId: string) => {
    if (!ctx) return;
    setCompletedLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId); else next.add(lessonId);
      localStorage.setItem(`lesson_progress_${ctx.subDomainId}`, JSON.stringify([...next]));
      return next;
    });
  }, [ctx]);

  // ── Grade card ─────────────────────────────────────────────────────────────
  const gradeCard = useCallback((grade: 1 | 3 | 4 | 5) => {
    if (!ctx || queue.length === 0) return;
    const card = queue[queueIndex];
    const existing: CardSM2 = progress[card.id] || { n: 0, EF: 2.5, I: 0, due: new Date().toISOString(), lapses: 0 };
    const updated = sm2Update(existing, grade);
    const isNew = !progress[card.id];
    const newProg = { ...progress, [card.id]: updated };
    setProgress(newProg);
    localStorage.setItem(`flashcards_progress_${ctx.subDomainId}`, JSON.stringify(newProg));
    if (isNew) {
      const dk = `daily_new_${ctx.subDomainId}_${todayKey()}`;
      const nc = newCardsToday + 1;
      setNewCardsToday(nc);
      localStorage.setItem(dk, String(nc));
    }
    const correct = grade >= 3;
    setSessionStats(s => ({ reviewed: s.reviewed + 1, correct: s.correct + (correct ? 1 : 0) }));
    const today = todayKey();
    const last = localStorage.getItem("flashcard_last_study");
    if (last !== today) {
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      const cur = parseInt(localStorage.getItem("flashcard_streak") || "0", 10);
      const ns = last === yest.toISOString().slice(0, 10) ? cur + 1 : 1;
      setStreak(ns);
      localStorage.setItem("flashcard_streak", String(ns));
      localStorage.setItem("flashcard_last_study", today);
    }
    setIsFlipped(false);
    setTimeout(() => setQueueIndex(i => i + 1), 200);
  }, [ctx, queue, queueIndex, progress, sessionStats, newCardsToday]);

  // ── Quiz ───────────────────────────────────────────────────────────────────
  const selectAnswer = (opt: string) => {
    if (selectedAnswer) return;
    const letter = opt.charAt(0);
    setSelectedAnswer(letter);
    setShowExplanation(true);
    const q = courseData!.quizQuestions[quizIndex];
    if (letter === q.answer) setQuizScore(s => s + 1);
    setQuizAnswers(a => ({ ...a, [q.id]: letter === q.answer }));
  };
  const nextQuestion = () => {
    if (!courseData) return;
    if (quizIndex + 1 >= courseData.quizQuestions.length) setQuizComplete(true);
    else { setQuizIndex(i => i + 1); setSelectedAnswer(null); setShowExplanation(false); }
  };
  const resetQuiz = () => { setQuizIndex(0); setSelectedAnswer(null); setShowExplanation(false); setQuizScore(0); setQuizComplete(false); setQuizAnswers({}); };

  if (!ctx) return null;

  const isLoading = !dataReady || !animReady;

  // ── Live-generation animation ──────────────────────────────────────────────
  if (isLoading) {
    const steps = [
      { label: "Analysing domain", done: msgIndex >= 1 },
      { label: "Building lesson modules", done: msgIndex >= 2 },
      { label: "Creating flashcards", done: msgIndex >= 4 },
      { label: "Writing quiz questions", done: msgIndex >= 5 },
    ];
    const progressPct = Math.min(100, Math.round((msgIndex / (LOAD_MSGS.length - 1)) * 100));

    return (
      <div className="min-h-screen bg-paper flex flex-col px-6 pb-28 pt-16 lg:max-w-2xl lg:mx-auto">
        {/* Domain pill */}
        <div className="flex justify-center mb-8">
          <span className="text-xs font-extrabold px-3 py-1 rounded-full border border-line text-ink-muted">
            {ctx.domainEmoji} {ctx.domainName}
          </span>
        </div>

        {/* Pulsing emoji */}
        <div className="flex justify-center mb-6">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl border border-line bg-paper"
          >
            {ctx.domainEmoji}
          </motion.div>
        </div>

        {/* Title */}
        <h2 className="text-display text-xl font-extrabold text-ink text-center mb-1">
          {ctx.subDomainName} Course
        </h2>
        <p className="text-[13px] text-ink-muted text-center mb-8">AI is building your personalised course</p>

        {/* Progress bar */}
        <div className="w-full bg-line rounded-full h-2 mb-3 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-brand"
            initial={{ width: "4%" }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <p className="text-[11px] font-extrabold text-center mb-8 text-ink">{progressPct}%</p>

        {/* Rotating message */}
        <div className="h-8 flex items-center justify-center mb-10">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm font-bold text-ink-muted text-center"
            >
              {LOAD_MSGS[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Step checklist */}
        <div>
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className="flex items-center gap-3 py-4 border-t border-line first:border-t-0"
            >
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500",
                step.done ? "bg-done" : "border border-line"
              )}>
                {step.done && (
                  <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} viewBox="0 0 12 12" className="w-3 h-3">
                    <polyline points="1.5,6 5,9.5 10.5,2.5" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                )}
              </div>
              <p className={cn("text-[13px] font-bold", step.done ? "text-ink" : "text-ink-muted")}>
                {step.label}
              </p>
              {!step.done && (
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-brand" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 pb-28 lg:max-w-2xl lg:mx-auto">
        <h2 className="text-display text-lg font-extrabold text-ink mb-2">Something went wrong</h2>
        <p className="text-sm text-ink-muted text-center mb-6">{error}</p>
        <Button onClick={() => { setDataReady(false); setAnimReady(false); setMsgIndex(0); hasFetched.current = false; }} className="bg-brand hover:bg-brand/90 text-paper font-bold rounded-xl px-6">
          Try again
        </Button>
      </div>
    );
  }

  // Computed values
  const totalLessons = courseData.modules.reduce((s, m) => s + (m.lessons?.length ?? 0), 0);
  const completedCount = completedLessons.size;
  const overallPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const currentCard = queue[queueIndex];
  const cardsLeft = queue.length - queueIndex;
  const accuracy = sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0;
  const currentQ = courseData.quizQuestions[quizIndex];

  const TABS = [
    { id: "roadmap" as Tab, label: "Course", icon: BookOpen },
    { id: "flashcards" as Tab, label: "Flashcards", icon: CreditCard },
    { id: "quiz" as Tab, label: "Quiz", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-paper pb-28">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-paper px-4 pt-4 pb-0">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setLocation("/opportunities")}
            className="w-9 h-9 rounded-full border border-line flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-ink" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted truncate">{ctx.domainEmoji} {ctx.domainName}</p>
            <h1 className="text-display text-[18px] font-extrabold text-ink truncate">{ctx.subDomainName}</h1>
          </div>
        </div>
        <div className="flex gap-2 mb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-extrabold transition-colors",
                  active ? "bg-brand text-paper" : "text-ink-muted border border-line")}>
                <Icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-3">
        <AnimatePresence mode="wait">

          {/* ══════════════════════════════════════════════════════
              ROADMAP / COURSE TAB — Coursera-style
          ══════════════════════════════════════════════════════ */}
          {activeTab === "roadmap" && (
            <motion.div key="roadmap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="lg:max-w-3xl lg:mx-auto">

              {/* Hero progress banner */}
              <div className="rounded-2xl bg-paper shadow-soft p-4 mb-4">
                <div className="flex items-center gap-4">
                  {/* Circular progress ring */}
                  <div className="relative flex-shrink-0 w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" className="stroke-line" strokeWidth="6" />
                      <circle cx="32" cy="32" r="26" fill="none" className="stroke-brand transition-all duration-700" strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - overallPct / 100)}`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-ink font-extrabold text-[13px]">{overallPct}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-extrabold text-base leading-tight text-ink">{ctx.subDomainName} Course</p>
                    <p className="text-[12px] text-ink-muted mt-0.5">{completedCount} / {totalLessons} lessons complete</p>
                    <p className="text-[11px] text-ink-muted mt-1">{courseData.modules.length} modules · {ctx.skills.slice(0, 2).join(", ")}</p>
                  </div>
                </div>
              </div>

              {/* ── Build a Project CTA ─────────────────────────────── */}
              <button
                onClick={() => {
                  const params = new URLSearchParams({
                    addProject: "1",
                    from: ctx.subDomainName,
                    tech: ctx.skills.slice(0, 4).join(","),
                  });
                  setLocation(`/profile?${params.toString()}`);
                }}
                data-testid="cta-build-project"
                className="w-full mb-4 rounded-2xl p-4 text-left bg-paper shadow-soft hover:shadow-md transition-shadow flex items-center gap-3 group"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border border-line text-lg">
                  🚀
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-ink text-[14px] leading-tight">
                    {overallPct === 100 ? "Course complete! Ship a project →" : "Build a project with what you've learned →"}
                  </p>
                  <p className="text-[11px] text-ink-muted mt-0.5 truncate">
                    Add a {ctx.subDomainName} project to your profile — recruiters &amp; TPOs will see it
                  </p>
                </div>
                <ArrowLeft className="w-4 h-4 text-ink-muted rotate-180 group-hover:text-ink flex-shrink-0" />
              </button>

              {/* Module accordion */}
              <div>
                {courseData.modules.map((mod, modIdx) => {
                  const lessons = mod.lessons ?? [];
                  const modCompleted = lessons.filter(l => completedLessons.has(l.id)).length;
                  const modPct = lessons.length > 0 ? Math.round((modCompleted / lessons.length) * 100) : 0;
                  const isExpanded = expandedModule === mod.id;
                  const isLocked = modIdx > 0 && courseData.modules[modIdx - 1].lessons?.every(l => !completedLessons.has(l.id));

                  return (
                    <motion.div key={mod.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: modIdx * 0.07 }}
                      className="border-t border-line first:border-t-0">
                      {/* Module header */}
                      <button
                        onClick={() => { setExpandedModule(isExpanded ? null : mod.id); setExpandedLesson(null); }}
                        className="w-full overflow-hidden text-left"
                      >
                        <div className="py-4">
                          <div className="flex items-center gap-3">
                            {/* Module icon circle */}
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl border border-line bg-paper">
                              {modCompleted === lessons.length && lessons.length > 0
                                ? <CheckCircle2 className="w-5 h-5 text-done" />
                                : <span>{mod.emoji}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                                    Module {modIdx + 1}
                                  </p>
                                  <p className="font-extrabold text-ink text-[14px] leading-tight">{mod.title}</p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {isLocked && <Lock className="w-3.5 h-3.5 text-ink-muted" />}
                                  <ChevronDown className={cn("w-4 h-4 text-ink-muted transition-transform duration-200", isExpanded && "rotate-180")} />
                                </div>
                              </div>
                              {/* Progress bar */}
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${modPct}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-ink-muted whitespace-nowrap">
                                  {modCompleted}/{lessons.length} · <Clock className="w-2.5 h-2.5 inline" /> {mod.duration}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Lesson list — shown when expanded */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="overflow-hidden border-t border-line"
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="pl-3 py-1">
                                {lessons.map((lesson, lessonIdx) => {
                                  const cfg = LESSON_TYPE[lesson.type] ?? LESSON_TYPE.video;
                                  const LIcon = cfg.Icon;
                                  const done = completedLessons.has(lesson.id);
                                  const lessonOpen = expandedLesson === lesson.id;

                                  return (
                                    <div key={lesson.id} className="border-t border-line first:border-t-0">
                                      {/* Lesson row */}
                                      <button
                                        onClick={() => setExpandedLesson(lessonOpen ? null : lesson.id)}
                                        className="w-full flex items-center gap-3 py-3 text-left"
                                      >
                                        {/* Type icon */}
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border border-line">
                                          {done
                                            ? <CheckCircle2 className="w-4 h-4 text-done" />
                                            : <LIcon className="w-4 h-4 text-ink-muted" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className={cn("text-[13px] font-bold leading-tight",
                                            done ? "text-ink-muted line-through" : "text-ink")}>
                                            {lessonIdx + 1}. {lesson.title}
                                          </p>
                                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-line text-ink-muted">
                                              {cfg.label}
                                            </span>
                                            <span className="text-[10px] text-ink-muted font-bold flex items-center gap-1">
                                              <Clock className="w-2.5 h-2.5" />{lesson.duration}
                                            </span>
                                            {lesson.type === "video" && watchedVideos.has(lesson.id) && (
                                              <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-line text-ink-muted">
                                                <Eye className="w-2.5 h-2.5" /> Watched
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <ChevronRight className={cn("w-4 h-4 text-ink-muted transition-transform flex-shrink-0", lessonOpen && "rotate-90")} />
                                      </button>

                                      {/* Lesson detail — inline expand */}
                                      <AnimatePresence>
                                        {lessonOpen && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                          >
                                            <div className="ml-11 mb-3 rounded-2xl overflow-hidden bg-paper shadow-soft">
                                              {/* Description */}
                                              <div className="p-4 pb-3">
                                                <p className="text-xs text-ink font-bold leading-relaxed mb-3">
                                                  {lesson.description}
                                                </p>

                                                {/* Key points */}
                                                {lesson.keyPoints?.length > 0 && (
                                                  <div className="space-y-1.5 mb-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                                      What you'll learn
                                                    </p>
                                                    {lesson.keyPoints.map((pt, i) => (
                                                      <div key={i} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-brand" />
                                                        <p className="text-[12px] text-ink font-bold leading-snug">{pt}</p>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}

                                                {/* Actions */}
                                                <div className="flex gap-2">
                                                  {lesson.type === "video" ? (
                                                    /* ── In-app YouTube embed for video lessons ── */
                                                    playingVideoId?.startsWith(lesson.id + "|") ? (
                                                      /* Playing — show close button */
                                                      <button
                                                        onClick={() => setPlayingVideoId(null)}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-[12px] border border-line text-ink"
                                                      >
                                                        <X className="w-4 h-4" /> Close video
                                                      </button>
                                                    ) : (
                                                      <>
                                                        <button
                                                          onClick={async () => {
                                                            const q = lesson.searchQuery || lesson.title;
                                                            setVideoFallbackId(null);
                                                            setVideoLoading(lesson.id);
                                                            try {
                                                              const r = await fetch(`/api/course/best-video?q=${encodeURIComponent(q)}`);
                                                              const data = r.ok ? await r.json() as { watchUrl?: string | null } : null;
                                                              const ytId = data?.watchUrl ? extractYouTubeId(data.watchUrl) : null;
                                                              if (ytId) {
                                                                setPlayingVideoId(lesson.id + "|" + ytId);
                                                                markVideoWatched(lesson.id);
                                                              } else {
                                                                /* no embeddable video — show in-card search link */
                                                                setVideoFallbackId(lesson.id);
                                                              }
                                                            } catch {
                                                              setVideoFallbackId(lesson.id);
                                                            } finally {
                                                              setVideoLoading(null);
                                                            }
                                                          }}
                                                          disabled={videoLoading === lesson.id}
                                                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-[12px] bg-brand text-paper disabled:opacity-70"
                                                        >
                                                          {videoLoading === lesson.id
                                                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                                                            : <><PlayCircle className="w-4 h-4" /> Watch video</>}
                                                        </button>
                                                        {videoFallbackId === lesson.id && (
                                                          <a
                                                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(lesson.searchQuery || lesson.title)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-[11px] font-semibold text-ink underline underline-offset-2 whitespace-nowrap self-center"
                                                          >
                                                            Search on YouTube <ExternalLink className="w-3 h-3" />
                                                          </a>
                                                        )}
                                                      </>
                                                    )
                                                  ) : (
                                                    /* ── External link for reading / exercise / project ── */
                                                    (() => {
                                                      const q = lesson.searchQuery || lesson.title;
                                                      const ACTION = {
                                                        reading:  { label: "Read tutorial",  endpoint: `/api/course/best-link?kind=reading&q=${encodeURIComponent(q)}`,  fallback: `https://www.google.com/search?q=${encodeURIComponent(`${q} tutorial site:w3schools.com OR site:developer.mozilla.org OR site:geeksforgeeks.org`)}`, pickUrl: (d: { url?: string | null }) => d?.url ?? null },
                                                        exercise: { label: "Try exercises",  endpoint: `/api/course/best-link?kind=exercise&q=${encodeURIComponent(q)}`, fallback: `https://www.google.com/search?q=${encodeURIComponent(`${q} practice site:leetcode.com OR site:hackerrank.com OR site:geeksforgeeks.org`)}`,         pickUrl: (d: { url?: string | null }) => d?.url ?? null },
                                                        project:  { label: "Find project",   endpoint: `/api/course/best-link?kind=project&q=${encodeURIComponent(q)}`,  fallback: `https://www.google.com/search?q=${encodeURIComponent(`${q} project ideas site:github.com OR site:freecodecamp.org`)}`,                              pickUrl: (d: { url?: string | null }) => d?.url ?? null },
                                                      } as const;
                                                      const a = ACTION[lesson.type as keyof typeof ACTION];
                                                      if (!a) return null;
                                                      return (
                                                        <button
                                                          onClick={async () => {
                                                            const win = window.open("about:blank", "_blank");
                                                            try {
                                                              const r = await fetch(a.endpoint);
                                                              const data = r.ok ? await r.json() : null;
                                                              const target = (data && a.pickUrl(data)) || a.fallback;
                                                              if (win) win.location.href = target;
                                                              else window.location.href = target;
                                                            } catch {
                                                              if (win) win.location.href = a.fallback;
                                                              else window.location.href = a.fallback;
                                                            }
                                                          }}
                                                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-[12px] bg-brand text-paper"
                                                        >
                                                          <ExternalLink className="w-4 h-4" />
                                                          {a.label}
                                                        </button>
                                                      );
                                                    })()
                                                  )}
                                                  {/* Mark complete */}
                                                  <button
                                                    onClick={() => toggleLesson(lesson.id)}
                                                    className={cn(
                                                      "flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-[12px] border transition-colors",
                                                      done
                                                        ? "bg-line border-line text-ink"
                                                        : "bg-paper border-line text-ink"
                                                    )}
                                                  >
                                                    <CheckCircle2 className={cn("w-4 h-4", done && "text-done")} />
                                                    {done ? "Done!" : "Mark Done"}
                                                  </button>
                                                </div>

                                                {/* ── Inline YouTube player ── */}
                                                {lesson.type === "video" && playingVideoId?.startsWith(lesson.id + "|") && (() => {
                                                  const ytId = playingVideoId.split("|")[1];
                                                  return (
                                                    <>
                                                      <div className="mt-3 rounded-xl overflow-hidden border border-line bg-ink" style={{ aspectRatio: "16/9" }}>
                                                        <iframe
                                                          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                                                          title={lesson.title}
                                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                          allowFullScreen
                                                          className="w-full h-full border-0"
                                                        />
                                                      </div>
                                                      {/* Mark done prompt */}
                                                      {!done && (
                                                        <motion.div
                                                          initial={{ opacity: 0, y: 6 }}
                                                          animate={{ opacity: 1, y: 0 }}
                                                          transition={{ delay: 0.4 }}
                                                          className="mt-2 flex items-center justify-between gap-2 bg-paper rounded-xl px-3 py-2.5 border border-line"
                                                        >
                                                          <p className="text-[12px] font-bold text-ink leading-tight">
                                                            Mark this lesson done?
                                                          </p>
                                                          <button
                                                            onClick={() => toggleLesson(lesson.id)}
                                                            className="flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-lg bg-brand text-paper flex-shrink-0"
                                                          >
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Done
                                                          </button>
                                                        </motion.div>
                                                      )}
                                                    </>
                                                  );
                                                })()}
                                              </div>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom CTA */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="mt-4 rounded-2xl bg-paper shadow-soft p-4">
                <p className="text-sm font-extrabold mb-1 text-ink">
                  {overallPct === 100 ? "Course complete! Now test yourself." : "Learning tip"}
                </p>
                <p className="text-xs text-ink-muted mb-3">
                  {overallPct === 100
                    ? "You've finished all lessons. Reinforce your knowledge with flashcards and the quiz."
                    : "After each lesson, review flashcards and take the quiz to lock in what you learned."}
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => setActiveTab("flashcards")} className="flex-1 h-10 rounded-xl bg-brand hover:bg-brand/90 text-paper font-bold text-[13px]">
                    <CreditCard className="w-4 h-4 mr-1.5" /> Flashcards
                  </Button>
                  <Button onClick={() => setActiveTab("quiz")} variant="outline" className="flex-1 h-10 rounded-xl font-bold text-[13px] border border-line text-brand bg-paper hover:bg-brand-soft">
                    <HelpCircle className="w-4 h-4 mr-1.5" /> Quiz
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════
              FLASHCARDS TAB
          ══════════════════════════════════════════════════════ */}
          {activeTab === "flashcards" && (
            <motion.div key="flashcards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="lg:max-w-2xl lg:mx-auto">
              {/* Stats bar */}
              <div className="flex gap-2 mb-4">
                {[
                  { label: "Reviewed", value: sessionStats.reviewed },
                  { label: "Accuracy", value: `${accuracy}%` },
                  { label: "Streak", value: `🔥 ${streak}` },
                ].map(s => (
                  <div key={s.label} className="flex-1 rounded-xl bg-paper shadow-soft p-3 text-center">
                    <p className="text-[11px] text-ink-muted font-bold">{s.label}</p>
                    <p className="text-lg font-extrabold text-ink">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[11px] font-bold text-ink-muted">
                  {cardsLeft > 0 ? `${queueIndex + 1} / ${queue.length} cards` : "Session complete!"}
                </p>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-ink-muted" />
                  <p className="text-[11px] font-bold text-ink-muted">{cardsLeft} remaining</p>
                </div>
              </div>
              {queue.length > 0 && (
                <div className="h-1.5 bg-line rounded-full mb-4 overflow-hidden">
                  <div className="h-full rounded-full bg-brand transition-all duration-500"
                    style={{ width: `${(queueIndex / queue.length) * 100}%` }} />
                </div>
              )}

              {cardsLeft === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl bg-paper shadow-soft p-8 text-center">
                  {/* Milestone moments are the one place personality is allowed —
                      see the Phase 3 call to keep rare celebrations despite the
                      monochrome palette. */}
                  <h2 className="text-display text-xl font-extrabold text-ink mb-1">
                    {sessionStats.reviewed > 0 ? "Session complete! 🎉" : "All caught up!"}
                  </h2>
                  <p className="text-sm text-ink-muted mb-4">
                    {sessionStats.reviewed > 0
                      ? `You reviewed ${sessionStats.reviewed} cards with ${accuracy}% accuracy.`
                      : "No cards due right now. Come back tomorrow!"}
                  </p>
                  <Button onClick={() => setActiveTab("quiz")} className="w-full h-11 rounded-xl font-bold bg-brand hover:bg-brand/90 text-paper">
                    Try the Quiz <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              ) : (
                <AnimatePresence mode="wait">
                  {currentCard && (
                    <motion.div key={currentCard.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
                      {/* Flip card */}
                      <div className="relative cursor-pointer select-none mb-4" style={{ perspective: "1200px", height: 240 }}
                        onClick={() => setIsFlipped(f => !f)}>
                        <motion.div animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.45, ease: "easeInOut" }}
                          style={{ transformStyle: "preserve-3d", width: "100%", height: "100%" }}>
                          {/* Front */}
                          <div className="absolute inset-0 bg-paper shadow-soft rounded-2xl flex flex-col items-center justify-center p-6 text-center"
                            style={{ backfaceVisibility: "hidden" }}>
                            {progress[currentCard.id] && (
                              <div className="absolute top-3 right-3">
                                <div className={cn("w-2.5 h-2.5 rounded-full", {
                                  "bg-line": getCardDifficulty(progress[currentCard.id].EF) === "easy",
                                  "bg-ink-muted": getCardDifficulty(progress[currentCard.id].EF) === "moderate",
                                  "bg-ink": getCardDifficulty(progress[currentCard.id].EF) === "hard",
                                })} />
                              </div>
                            )}
                            {progress[currentCard.id]?.lapses > 4 && (
                              <div className="absolute top-3 left-3 flex items-center gap-1 text-ink-muted">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">Leech card</span>
                              </div>
                            )}
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-3 text-ink-muted">
                              {currentCard.topic}
                            </p>
                            <p className="text-base font-extrabold text-ink leading-snug">{currentCard.front}</p>
                            <p className="text-[11px] text-ink-muted mt-4">Tap to reveal answer</p>
                          </div>
                          {/* Back */}
                          <div className="absolute inset-0 rounded-2xl bg-paper shadow-soft flex flex-col items-center justify-center p-6 text-center"
                            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-3 text-ink-muted">Answer</p>
                            <p className="text-[14px] font-bold text-ink leading-relaxed">{currentCard.back}</p>
                          </div>
                        </motion.div>
                      </div>

                      <AnimatePresence>
                        {isFlipped && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="grid grid-cols-4 gap-2">
                            {[
                              { grade: 1 as const, label: "Again", emoji: "😰" },
                              { grade: 3 as const, label: "Hard",  emoji: "🤔" },
                              { grade: 4 as const, label: "Good",  emoji: "👍" },
                              { grade: 5 as const, label: "Easy",  emoji: "😎" },
                            ].map(g => (
                              <button key={g.grade} onClick={() => gradeCard(g.grade)}
                                className="flex flex-col items-center py-2.5 rounded-xl font-bold border border-line text-ink bg-paper hover:bg-line active:bg-line transition-colors active:scale-95">
                                <span className="text-xl mb-0.5">{g.emoji}</span>
                                <span className="text-[11px]">{g.label}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════
              QUIZ TAB
          ══════════════════════════════════════════════════════ */}
          {activeTab === "quiz" && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="lg:max-w-2xl lg:mx-auto">
              {quizComplete ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="rounded-2xl bg-paper shadow-soft p-6 text-center mb-4">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-ink" />
                    <h2 className="text-display text-2xl font-extrabold text-ink mb-1">{quizScore} / {courseData.quizQuestions.length}</h2>
                    <p className="text-sm text-ink-muted mb-4">
                      {quizScore === courseData.quizQuestions.length ? "Perfect! You nailed it 🎉"
                        : quizScore >= Math.ceil(courseData.quizQuestions.length * 0.6) ? "Good job! Review the ones you missed."
                        : "Keep studying — try the flashcards first."}
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={resetQuiz} variant="outline" className="flex-1 h-10 rounded-xl font-bold border border-line text-brand bg-paper hover:bg-brand-soft">
                        <RotateCcw className="w-4 h-4 mr-1.5" /> Retry
                      </Button>
                      <Button onClick={() => setActiveTab("flashcards")} className="flex-1 h-10 rounded-xl font-bold bg-brand hover:bg-brand/90 text-paper">
                        Study Cards
                      </Button>
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 px-1">Breakdown</p>
                  {courseData.quizQuestions.map((q, i) => (
                    <motion.div
                      key={q.id}
                      initial={reduced ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
                      className="flex items-center gap-3 py-4 border-t border-line"
                    >
                      {quizAnswers[q.id] ? <CheckCircle2 className="w-5 h-5 text-done flex-shrink-0" /> : <XCircle className="w-5 h-5 text-danger flex-shrink-0" />}
                      <p className="text-sm text-ink font-bold flex-1 leading-snug">{q.question}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-line text-ink-muted">
                        {q.difficulty}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div key={quizIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-[11px] font-bold text-ink-muted">Question {quizIndex + 1} of {courseData.quizQuestions.length}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-line text-ink-muted">
                        {currentQ.difficulty}
                      </span>
                    </div>
                    <div className="h-1.5 bg-line rounded-full mb-4 overflow-hidden">
                      <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${(quizIndex / courseData.quizQuestions.length) * 100}%` }} />
                    </div>
                    <div className="bg-paper shadow-soft rounded-2xl mb-4 p-5">
                      <p className="text-base font-extrabold text-ink leading-snug">{currentQ.question}</p>
                    </div>
                    <div className="space-y-2 mb-4">
                      {currentQ.options.map(opt => {
                        const letter = opt.charAt(0);
                        const chosen = selectedAnswer === letter;
                        const isCorrect = letter === currentQ.answer;
                        let optBg = "bg-paper", optBorder = "border-line";
                        let mark: "correct" | "incorrect" | null = null;
                        if (showExplanation) {
                          if (isCorrect) { optBg = "bg-done/10"; optBorder = "border-done"; mark = "correct"; }
                          else if (chosen) { optBg = "bg-danger/10"; optBorder = "border-danger"; mark = "incorrect"; }
                        } else if (chosen) { optBg = "bg-brand-soft"; optBorder = "border-brand"; }
                        return (
                          <button key={opt} onClick={() => selectAnswer(opt)} disabled={!!selectedAnswer}
                            className={cn("w-full flex items-center gap-2 text-left p-3.5 rounded-xl border font-bold text-sm text-ink transition-colors", optBg, optBorder)}>
                            <span className="flex-1">{opt}</span>
                            {mark === "correct" && <CheckCircle2 className="w-4 h-4 text-done flex-shrink-0" />}
                            {mark === "incorrect" && <XCircle className="w-4 h-4 text-danger flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    <AnimatePresence>
                      {showExplanation && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-paper shadow-soft p-4 mb-4">
                          <div className="flex items-center gap-2 mb-1">
                            {selectedAnswer === currentQ.answer ? <CheckCircle2 className="w-4 h-4 text-done" /> : <XCircle className="w-4 h-4 text-danger" />}
                            <p className="text-[12px] font-extrabold text-ink">
                              {selectedAnswer === currentQ.answer ? "Correct!" : `Correct answer: ${currentQ.answer}`}
                            </p>
                          </div>
                          <p className="text-xs text-ink-muted leading-relaxed">{currentQ.explanation}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {showExplanation && (
                      <Button onClick={nextQuestion} className="w-full h-11 rounded-xl font-bold bg-brand hover:bg-brand/90 text-paper text-[14px]">
                        {quizIndex + 1 < courseData.quizQuestions.length ? "Next Question →" : "See Results"}
                      </Button>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
