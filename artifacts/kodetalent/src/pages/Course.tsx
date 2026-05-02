import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, CreditCard, HelpCircle, CheckCircle2,
  XCircle, RotateCcw, Star, AlertTriangle, Trophy, ChevronRight,
  ChevronDown, PlayCircle, FileText, PenLine, Hammer, ExternalLink,
  Clock, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

// ─── Lesson type config ───────────────────────────────────────────────────────

const LESSON_TYPE = {
  video:    { Icon: PlayCircle,  label: "Video",    color: "#ef4444", bg: "#fef2f2" },
  reading:  { Icon: FileText,    label: "Reading",  color: "#3b82f6", bg: "#eff6ff" },
  exercise: { Icon: PenLine,     label: "Exercise", color: "#10b981", bg: "#ecfdf5" },
  project:  { Icon: Hammer,      label: "Project",  color: "#f97316", bg: "#fff7ed" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Course() {
  const [, setLocation] = useLocation();

  const [ctx, setCtx] = useState<CourseContext | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("roadmap");

  // ── Roadmap state ──────────────────────────────────────────────────────────
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

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

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("courseContext");
    if (!raw) { setLocation("/opportunities"); return; }
    const c: CourseContext = JSON.parse(raw);
    setCtx(c);

    // Load lesson progress
    const lp = localStorage.getItem(`lesson_progress_${c.subDomainId}`);
    if (lp) setCompletedLessons(new Set(JSON.parse(lp)));

    // v2 cache key — includes lesson data
    const cacheKey = `course_content_v2_${c.subDomainId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setCourseData(JSON.parse(cached));
      setLoading(false);
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
      } catch {
        setError("Couldn't generate course. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [setLocation]);

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

  const color = ctx.domainColor;
  const bg = ctx.domainBg;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f3ff] flex flex-col items-center justify-center px-6 pb-28">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-4 border-t-transparent mb-6"
          style={{ borderColor: `${color}40`, borderTopColor: color }} />
        <h2 className="text-lg font-extrabold text-[#1e1b4b] mb-2">Building your course...</h2>
        <p className="text-sm text-[#6b7280] text-center">
          AI is creating lessons, flashcards and quiz for {ctx.subDomainName}
        </p>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="min-h-screen bg-[#f5f3ff] flex flex-col items-center justify-center px-6 pb-28">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-lg font-extrabold text-[#1e1b4b] mb-2">Something went wrong</h2>
        <p className="text-sm text-[#6b7280] text-center mb-6">{error}</p>
        <Button onClick={() => { setError(null); setLoading(true); hasFetched.current = false; }} style={{ background: color }} className="text-white rounded-xl px-6">
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
    <div className="min-h-screen bg-[#f5f3ff] pb-28">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#f5f3ff] px-4 pt-4 pb-0">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setLocation("/opportunities")}
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-[#1e1b4b]" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-[#6b7280] truncate">{ctx.domainEmoji} {ctx.domainName}</p>
            <h1 className="text-[17px] font-extrabold text-[#1e1b4b] truncate">{ctx.subDomainName}</h1>
          </div>
        </div>
        <div className="flex bg-white rounded-2xl p-1 shadow-sm mb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-extrabold transition-all",
                  active ? "text-white shadow-sm" : "text-[#6b7280]")}
                style={active ? { background: color } : {}}>
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
            <motion.div key="roadmap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Hero progress banner */}
              <div className="rounded-2xl p-4 mb-4 overflow-hidden relative" style={{ background: color }}>
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-10 bg-white" />
                <div className="absolute -right-2 -bottom-8 w-36 h-36 rounded-full opacity-10 bg-white" />
                <div className="flex items-center gap-4 relative z-10">
                  {/* Circular progress ring */}
                  <div className="relative flex-shrink-0 w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6" />
                      <circle cx="32" cy="32" r="26" fill="none" stroke="white" strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - overallPct / 100)}`}
                        strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-extrabold text-[13px]">{overallPct}%</span>
                    </div>
                  </div>
                  <div className="text-white">
                    <p className="font-extrabold text-base leading-tight">{ctx.subDomainName} Course</p>
                    <p className="text-[12px] opacity-80 mt-0.5">{completedCount} / {totalLessons} lessons complete</p>
                    <p className="text-[11px] opacity-70 mt-1">{courseData.modules.length} modules · {ctx.skills.slice(0, 2).join(", ")}</p>
                  </div>
                </div>
              </div>

              {/* Module accordion */}
              <div className="space-y-3">
                {courseData.modules.map((mod, modIdx) => {
                  const lessons = mod.lessons ?? [];
                  const modCompleted = lessons.filter(l => completedLessons.has(l.id)).length;
                  const modPct = lessons.length > 0 ? Math.round((modCompleted / lessons.length) * 100) : 0;
                  const isExpanded = expandedModule === mod.id;
                  const isLocked = modIdx > 0 && courseData.modules[modIdx - 1].lessons?.every(l => !completedLessons.has(l.id));

                  return (
                    <motion.div key={mod.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: modIdx * 0.07 }}>
                      {/* Module header */}
                      <button
                        onClick={() => { setExpandedModule(isExpanded ? null : mod.id); setExpandedLesson(null); }}
                        className="w-full bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden text-left"
                      >
                        <div className="p-4">
                          <div className="flex items-center gap-3">
                            {/* Module icon circle */}
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                              style={{ background: modCompleted === lessons.length && lessons.length > 0 ? color : bg }}>
                              {modCompleted === lessons.length && lessons.length > 0
                                ? <CheckCircle2 className="w-5 h-5 text-white" />
                                : <span>{mod.emoji}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color }}>
                                    Module {modIdx + 1}
                                  </p>
                                  <p className="font-extrabold text-[#1e1b4b] text-[14px] leading-tight">{mod.title}</p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {isLocked && <Lock className="w-3.5 h-3.5 text-[#9ca3af]" />}
                                  <ChevronDown className={cn("w-4 h-4 text-[#6b7280] transition-transform duration-200", isExpanded && "rotate-180")} />
                                </div>
                              </div>
                              {/* Progress bar */}
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${modPct}%`, background: color }} />
                                </div>
                                <span className="text-[10px] font-bold text-[#6b7280] whitespace-nowrap">
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
                              className="overflow-hidden border-t border-[#f3f4f6]"
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="px-4 py-1">
                                {lessons.map((lesson, lessonIdx) => {
                                  const cfg = LESSON_TYPE[lesson.type] ?? LESSON_TYPE.video;
                                  const LIcon = cfg.Icon;
                                  const done = completedLessons.has(lesson.id);
                                  const lessonOpen = expandedLesson === lesson.id;

                                  return (
                                    <div key={lesson.id}>
                                      {/* Lesson row */}
                                      <button
                                        onClick={() => setExpandedLesson(lessonOpen ? null : lesson.id)}
                                        className="w-full flex items-center gap-3 py-3 text-left border-b border-[#f9fafb] last:border-0"
                                      >
                                        {/* Type icon */}
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                          style={{ background: done ? "#ecfdf5" : cfg.bg }}>
                                          {done
                                            ? <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                                            : <LIcon className="w-4 h-4" style={{ color: cfg.color }} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className={cn("text-[13px] font-bold leading-tight",
                                            done ? "text-[#9ca3af] line-through" : "text-[#1e1b4b]")}>
                                            {lessonIdx + 1}. {lesson.title}
                                          </p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                              style={{ background: cfg.bg, color: cfg.color }}>
                                              {cfg.label}
                                            </span>
                                            <span className="text-[10px] text-[#6b7280] font-bold flex items-center gap-1">
                                              <Clock className="w-2.5 h-2.5" />{lesson.duration}
                                            </span>
                                          </div>
                                        </div>
                                        <ChevronRight className={cn("w-4 h-4 text-[#9ca3af] transition-transform flex-shrink-0", lessonOpen && "rotate-90")} />
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
                                            <div className="ml-11 mb-3 rounded-2xl overflow-hidden" style={{ background: bg }}>
                                              {/* Description */}
                                              <div className="p-4 pb-3">
                                                <p className="text-xs text-[#1e1b4b] font-bold leading-relaxed mb-3">
                                                  {lesson.description}
                                                </p>

                                                {/* Key points */}
                                                {lesson.keyPoints?.length > 0 && (
                                                  <div className="space-y-1.5 mb-4">
                                                    <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color }}>
                                                      What you'll learn
                                                    </p>
                                                    {lesson.keyPoints.map((pt, i) => (
                                                      <div key={i} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                                                        <p className="text-[12px] text-[#374151] font-bold leading-snug">{pt}</p>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}

                                                {/* Actions */}
                                                <div className="flex gap-2">
                                                  {/* Watch on YouTube */}
                                                  {(lesson.type === "video" || lesson.searchQuery) && (
                                                    <a
                                                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(lesson.searchQuery || lesson.title)}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="flex-1"
                                                    >
                                                      <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-[12px] text-white"
                                                        style={{ background: "#ef4444" }}>
                                                        <PlayCircle className="w-4 h-4" />
                                                        Watch on YouTube
                                                        <ExternalLink className="w-3 h-3 opacity-70" />
                                                      </button>
                                                    </a>
                                                  )}
                                                  {/* Mark complete */}
                                                  <button
                                                    onClick={() => toggleLesson(lesson.id)}
                                                    className={cn(
                                                      "flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-[12px] border-2 transition-all",
                                                      done
                                                        ? "bg-[#10b981] text-white border-[#10b981]"
                                                        : "bg-white border-current"
                                                    )}
                                                    style={!done ? { color, borderColor: color } : {}}
                                                  >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    {done ? "Done!" : "Mark Done"}
                                                  </button>
                                                </div>
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
                className="mt-4 rounded-2xl p-4" style={{ background: bg }}>
                <p className="text-sm font-extrabold mb-1" style={{ color }}>
                  {overallPct === 100 ? "🎉 Course complete! Now test yourself." : "📚 Learning tip"}
                </p>
                <p className="text-xs text-[#6b7280] mb-3">
                  {overallPct === 100
                    ? "You've finished all lessons. Reinforce your knowledge with flashcards and the quiz."
                    : "After each lesson, review flashcards and take the quiz to lock in what you learned."}
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => setActiveTab("flashcards")} className="flex-1 h-10 rounded-xl text-white font-bold text-[13px]" style={{ background: color }}>
                    <CreditCard className="w-4 h-4 mr-1.5" /> Flashcards
                  </Button>
                  <Button onClick={() => setActiveTab("quiz")} variant="outline" className="flex-1 h-10 rounded-xl font-bold text-[13px] border-2" style={{ borderColor: color, color }}>
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
            <motion.div key="flashcards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Stats bar */}
              <div className="flex gap-2 mb-4">
                {[
                  { label: "Reviewed", value: sessionStats.reviewed, color: "#1e1b4b" },
                  { label: "Accuracy", value: `${accuracy}%`, color: accuracy >= 70 ? "#10b981" : accuracy >= 40 ? "#f59e0b" : "#ef4444" },
                  { label: "Streak", value: `🔥 ${streak}`, color: "#f97316" },
                ].map(s => (
                  <div key={s.label} className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm">
                    <p className="text-[11px] text-[#6b7280] font-bold">{s.label}</p>
                    <p className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[11px] font-bold text-[#6b7280]">
                  {cardsLeft > 0 ? `${queueIndex + 1} / ${queue.length} cards` : "Session complete!"}
                </p>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3" style={{ color }} />
                  <p className="text-[11px] font-bold" style={{ color }}>{cardsLeft} remaining</p>
                </div>
              </div>
              {queue.length > 0 && (
                <div className="h-1.5 bg-[#e5e7eb] rounded-full mb-4 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(queueIndex / queue.length) * 100}%`, background: color }} />
                </div>
              )}

              {cardsLeft === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl p-8 text-center" style={{ background: bg }}>
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-xl font-extrabold text-[#1e1b4b] mb-1">
                    {sessionStats.reviewed > 0 ? "Session complete!" : "All caught up!"}
                  </h2>
                  <p className="text-sm text-[#6b7280] mb-4">
                    {sessionStats.reviewed > 0
                      ? `You reviewed ${sessionStats.reviewed} cards with ${accuracy}% accuracy.`
                      : "No cards due right now. Come back tomorrow!"}
                  </p>
                  <Button onClick={() => setActiveTab("quiz")} className="w-full h-11 rounded-xl font-bold text-white" style={{ background: color }}>
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
                          <div className="absolute inset-0 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center p-6 text-center"
                            style={{ backfaceVisibility: "hidden" }}>
                            {progress[currentCard.id] && (
                              <div className="absolute top-3 right-3">
                                <div className={cn("w-2.5 h-2.5 rounded-full", {
                                  "bg-[#10b981]": getCardDifficulty(progress[currentCard.id].EF) === "easy",
                                  "bg-[#f59e0b]": getCardDifficulty(progress[currentCard.id].EF) === "moderate",
                                  "bg-[#ef4444]": getCardDifficulty(progress[currentCard.id].EF) === "hard",
                                })} />
                              </div>
                            )}
                            {progress[currentCard.id]?.lapses > 4 && (
                              <div className="absolute top-3 left-3 flex items-center gap-1 text-[#f59e0b]">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">Leech card</span>
                              </div>
                            )}
                            <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color }}>
                              {currentCard.topic}
                            </p>
                            <p className="text-base font-extrabold text-[#1e1b4b] leading-snug">{currentCard.front}</p>
                            <p className="text-[11px] text-[#6b7280] mt-4">Tap to reveal answer</p>
                          </div>
                          {/* Back */}
                          <div className="absolute inset-0 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center p-6 text-center"
                            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: bg }}>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color }}>Answer</p>
                            <p className="text-[14px] font-bold text-[#1e1b4b] leading-relaxed">{currentCard.back}</p>
                          </div>
                        </motion.div>
                      </div>

                      <AnimatePresence>
                        {isFlipped && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="grid grid-cols-4 gap-2">
                            {[
                              { grade: 1 as const, label: "Again", emoji: "😰", bg: "#fef2f2", color: "#ef4444" },
                              { grade: 3 as const, label: "Hard",  emoji: "🤔", bg: "#fff7ed", color: "#f97316" },
                              { grade: 4 as const, label: "Good",  emoji: "👍", bg: "#ecfdf5", color: "#10b981" },
                              { grade: 5 as const, label: "Easy",  emoji: "😎", bg: "#eff6ff", color: "#3b82f6" },
                            ].map(g => (
                              <button key={g.grade} onClick={() => gradeCard(g.grade)}
                                className="flex flex-col items-center py-2.5 rounded-xl font-bold transition-all active:scale-95"
                                style={{ background: g.bg, color: g.color }}>
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
            <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {quizComplete ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="rounded-2xl p-6 text-center mb-4" style={{ background: bg }}>
                    <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color }} />
                    <h2 className="text-2xl font-extrabold text-[#1e1b4b] mb-1">{quizScore} / {courseData.quizQuestions.length}</h2>
                    <p className="text-sm text-[#6b7280] mb-4">
                      {quizScore === courseData.quizQuestions.length ? "Perfect! You nailed it 🎉"
                        : quizScore >= Math.ceil(courseData.quizQuestions.length * 0.6) ? "Good job! Review the ones you missed."
                        : "Keep studying — try the flashcards first."}
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={resetQuiz} variant="outline" className="flex-1 h-10 rounded-xl font-bold border-2" style={{ borderColor: color, color }}>
                        <RotateCcw className="w-4 h-4 mr-1.5" /> Retry
                      </Button>
                      <Button onClick={() => setActiveTab("flashcards")} className="flex-1 h-10 rounded-xl font-bold text-white" style={{ background: color }}>
                        Study Cards
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs font-extrabold text-[#6b7280] uppercase tracking-wider mb-2 px-1">Breakdown</p>
                  {courseData.quizQuestions.map(q => (
                    <div key={q.id} className="bg-white rounded-xl p-3 flex items-center gap-3 mb-2 shadow-sm">
                      {quizAnswers[q.id] ? <CheckCircle2 className="w-5 h-5 text-[#10b981] flex-shrink-0" /> : <XCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0" />}
                      <p className="text-sm text-[#1e1b4b] font-bold flex-1 leading-snug">{q.question}</p>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                        style={{ background: q.difficulty === "easy" ? "#ecfdf5" : q.difficulty === "medium" ? "#fff7ed" : "#fef2f2", color: q.difficulty === "easy" ? "#10b981" : q.difficulty === "medium" ? "#f97316" : "#ef4444" }}>
                        {q.difficulty}
                      </span>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div key={quizIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-[11px] font-bold text-[#6b7280]">Question {quizIndex + 1} of {courseData.quizQuestions.length}</p>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                        style={{ background: currentQ.difficulty === "easy" ? "#ecfdf5" : currentQ.difficulty === "medium" ? "#fff7ed" : "#fef2f2", color: currentQ.difficulty === "easy" ? "#10b981" : currentQ.difficulty === "medium" ? "#f97316" : "#ef4444" }}>
                        {currentQ.difficulty}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#e5e7eb] rounded-full mb-4 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(quizIndex / courseData.quizQuestions.length) * 100}%`, background: color }} />
                    </div>
                    <Card className="border-0 shadow-[0_4px_16px_rgba(0,0,0,0.07)] rounded-2xl mb-4">
                      <CardContent className="p-5">
                        <p className="text-base font-extrabold text-[#1e1b4b] leading-snug">{currentQ.question}</p>
                      </CardContent>
                    </Card>
                    <div className="space-y-2 mb-4">
                      {currentQ.options.map(opt => {
                        const letter = opt.charAt(0);
                        const chosen = selectedAnswer === letter;
                        const isCorrect = letter === currentQ.answer;
                        let optBg = "bg-white", optColor = "text-[#1e1b4b]", optBorder = "border-transparent";
                        if (showExplanation) {
                          if (isCorrect) { optBg = "bg-[#ecfdf5]"; optColor = "text-[#10b981]"; optBorder = "border-[#10b981]"; }
                          else if (chosen) { optBg = "bg-[#fef2f2]"; optColor = "text-[#ef4444]"; optBorder = "border-[#ef4444]"; }
                        } else if (chosen) optBorder = "border-current";
                        return (
                          <button key={opt} onClick={() => selectAnswer(opt)} disabled={!!selectedAnswer}
                            className={cn("w-full text-left p-3.5 rounded-xl border-2 font-bold text-sm shadow-sm transition-all", optBg, optColor, optBorder)}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    <AnimatePresence>
                      {showExplanation && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4 mb-4" style={{ background: bg }}>
                          <div className="flex items-center gap-2 mb-1">
                            {selectedAnswer === currentQ.answer ? <CheckCircle2 className="w-4 h-4 text-[#10b981]" /> : <XCircle className="w-4 h-4 text-[#ef4444]" />}
                            <p className="text-[12px] font-extrabold" style={{ color }}>
                              {selectedAnswer === currentQ.answer ? "Correct!" : `Correct answer: ${currentQ.answer}`}
                            </p>
                          </div>
                          <p className="text-xs text-[#6b7280] leading-relaxed">{currentQ.explanation}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {showExplanation && (
                      <Button onClick={nextQuestion} className="w-full h-11 rounded-xl font-bold text-white text-[14px]" style={{ background: color }}>
                        {quizIndex + 1 < courseData.quizQuestions.length ? "Next Question →" : "See Results 🏆"}
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
