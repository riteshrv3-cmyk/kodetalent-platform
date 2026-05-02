import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, CreditCard, HelpCircle, CheckCircle2,
  XCircle, RotateCcw, Flame, Star, AlertTriangle, Trophy, ChevronRight,
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

interface CourseModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  emoji: string;
  topics: string[];
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function Course() {
  const [, setLocation] = useLocation();

  const [ctx, setCtx] = useState<CourseContext | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("roadmap");

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
    if (!raw) {
      setLocation("/opportunities");
      return;
    }
    const c: CourseContext = JSON.parse(raw);
    setCtx(c);

    const cacheKey = `course_content_${c.subDomainId}`;
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
          body: JSON.stringify({
            subDomainName: c.subDomainName,
            domainName: c.domainName,
            skills: c.skills,
          }),
        });
        if (!resp.ok) throw new Error("Failed to generate course");
        const data: CourseData = await resp.json();
        localStorage.setItem(cacheKey, JSON.stringify(data));
        setCourseData(data);
      } catch (e) {
        setError("Couldn't generate course. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [setLocation]);

  // ── Build flashcard queue ──────────────────────────────────────────────────
  useEffect(() => {
    if (!courseData || !ctx) return;

    const progressKey = `flashcards_progress_${ctx.subDomainId}`;
    const stored: Record<string, CardSM2> = JSON.parse(
      localStorage.getItem(progressKey) || "{}"
    );
    setProgress(stored);

    const dailyKey = `daily_new_${ctx.subDomainId}_${todayKey()}`;
    const todayCount = parseInt(localStorage.getItem(dailyKey) || "0", 10);
    setNewCardsToday(todayCount);

    const now = new Date();
    const dueCards = courseData.flashcards
      .filter(c => stored[c.id] && new Date(stored[c.id].due) <= now)
      .sort((a, b) => new Date(stored[a.id].due).getTime() - new Date(stored[b.id].due).getTime());

    const newCards = fisherYatesShuffle(
      courseData.flashcards.filter(c => !stored[c.id])
    ).slice(0, Math.max(0, DAILY_NEW_LIMIT - todayCount));

    setQueue([...dueCards, ...newCards]);
    setQueueIndex(0);

    const streakKey = `flashcard_streak`;
    const lastKey = `flashcard_last_study`;
    const last = localStorage.getItem(lastKey);
    const today = todayKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yest = yesterday.toISOString().slice(0, 10);
    const storedStreak = parseInt(localStorage.getItem(streakKey) || "0", 10);

    if (last === today) {
      setStreak(storedStreak);
    } else if (last === yest) {
      setStreak(storedStreak);
    } else {
      setStreak(0);
    }
  }, [courseData, ctx]);

  // ── Grade card ─────────────────────────────────────────────────────────────
  const gradeCard = useCallback((grade: 1 | 3 | 4 | 5) => {
    if (!ctx || queue.length === 0) return;
    const card = queue[queueIndex];
    const existing: CardSM2 = progress[card.id] || { n: 0, EF: 2.5, I: 0, due: new Date().toISOString(), lapses: 0 };
    const updated = sm2Update(existing, grade);
    const isNew = !progress[card.id];

    const newProgress = { ...progress, [card.id]: updated };
    setProgress(newProgress);
    localStorage.setItem(`flashcards_progress_${ctx.subDomainId}`, JSON.stringify(newProgress));

    if (isNew) {
      const dailyKey = `daily_new_${ctx.subDomainId}_${todayKey()}`;
      const newCount = newCardsToday + 1;
      setNewCardsToday(newCount);
      localStorage.setItem(dailyKey, String(newCount));
    }

    const correct = grade >= 3;
    const newStats = {
      reviewed: sessionStats.reviewed + 1,
      correct: sessionStats.correct + (correct ? 1 : 0),
    };
    setSessionStats(newStats);

    // Update streak
    const streakKey = `flashcard_streak`;
    const lastKey = `flashcard_last_study`;
    const today = todayKey();
    const last = localStorage.getItem(lastKey);
    if (last !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yest = yesterday.toISOString().slice(0, 10);
      const currentStreak = parseInt(localStorage.getItem(streakKey) || "0", 10);
      const newStreak = last === yest ? currentStreak + 1 : 1;
      setStreak(newStreak);
      localStorage.setItem(streakKey, String(newStreak));
      localStorage.setItem(lastKey, today);
    }

    setIsFlipped(false);
    setTimeout(() => setQueueIndex(i => i + 1), 200);
  }, [ctx, queue, queueIndex, progress, sessionStats, newCardsToday]);

  // ── Quiz logic ─────────────────────────────────────────────────────────────
  const selectAnswer = (opt: string) => {
    if (selectedAnswer) return;
    const letter = opt.charAt(0);
    setSelectedAnswer(letter);
    setShowExplanation(true);
    const q = courseData!.quizQuestions[quizIndex];
    const correct = letter === q.answer;
    if (correct) setQuizScore(s => s + 1);
    setQuizAnswers(a => ({ ...a, [q.id]: correct }));
  };

  const nextQuestion = () => {
    if (!courseData) return;
    if (quizIndex + 1 >= courseData.quizQuestions.length) {
      setQuizComplete(true);
    } else {
      setQuizIndex(i => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const resetQuiz = () => {
    setQuizIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuizScore(0);
    setQuizComplete(false);
    setQuizAnswers({});
  };

  if (!ctx) return null;

  const color = ctx.domainColor;
  const bg = ctx.domainBg;

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f3ff] flex flex-col items-center justify-center px-6 pb-28">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-4 border-t-transparent mb-6"
          style={{ borderColor: `${color}40`, borderTopColor: color }}
        />
        <h2 className="text-lg font-extrabold text-[#1e1b4b] mb-2">
          Generating your course...
        </h2>
        <p className="text-sm text-[#6b7280] text-center">
          AI is building flashcards, quiz questions and a learning roadmap for {ctx.subDomainName}
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

  const currentCard = queue[queueIndex];
  const cardsLeft = queue.length - queueIndex;
  const accuracy = sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0;
  const currentQ = courseData.quizQuestions[quizIndex];

  const TABS = [
    { id: "roadmap" as Tab, label: "Roadmap", icon: BookOpen },
    { id: "flashcards" as Tab, label: "Flashcards", icon: CreditCard },
    { id: "quiz" as Tab, label: "Quiz", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#f5f3ff] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f5f3ff] px-4 pt-4 pb-0">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setLocation("/opportunities")}
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-[#1e1b4b]" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-[#6b7280] truncate">
              {ctx.domainEmoji} {ctx.domainName}
            </p>
            <h1 className="text-[17px] font-extrabold text-[#1e1b4b] truncate">
              {ctx.subDomainName} Course
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl p-1 shadow-sm mb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-extrabold transition-all",
                  active ? "text-white shadow-sm" : "text-[#6b7280]"
                )}
                style={active ? { background: color } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-3">
        <AnimatePresence mode="wait">

          {/* ── ROADMAP TAB ──────────────────────────────────────────────── */}
          {activeTab === "roadmap" && (
            <motion.div key="roadmap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Intro banner */}
              <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: bg }}>
                <span className="text-4xl">{ctx.domainEmoji}</span>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color }}>
                    Your Learning Path
                  </p>
                  <p className="text-base font-extrabold text-[#1e1b4b]">{ctx.subDomainName}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {ctx.skills.slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modules */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-7 top-8 bottom-8 w-0.5" style={{ background: `${color}25` }} />

                <div className="space-y-3">
                  {courseData.modules.map((mod, i) => {
                    const opacity = 0.6 + (i / courseData.modules.length) * 0.4;
                    return (
                      <motion.div
                        key={mod.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-3"
                      >
                        {/* Step circle */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-extrabold text-sm z-10 flex-shrink-0 shadow-sm"
                          style={{ background: color, opacity }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{mod.emoji}</span>
                              <p className="font-extrabold text-[#1e1b4b] text-[14px] leading-tight">{mod.title}</p>
                            </div>
                            <span className="text-[10px] font-bold text-[#6b7280] bg-[#f5f3ff] px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
                              {mod.duration}
                            </span>
                          </div>
                          <p className="text-xs text-[#6b7280] mb-2">{mod.description}</p>
                          {mod.topics && mod.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {mod.topics.map(t => (
                                <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-5 rounded-2xl p-4"
                style={{ background: bg }}
              >
                <p className="text-sm font-extrabold mb-1" style={{ color }}>
                  Ready to start learning? 🚀
                </p>
                <p className="text-xs text-[#6b7280] mb-3">
                  Study {courseData.flashcards.length} flashcards with spaced repetition and test yourself with the AI quiz.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setActiveTab("flashcards")}
                    className="flex-1 h-10 rounded-xl text-white font-bold text-[13px]"
                    style={{ background: color }}
                  >
                    <CreditCard className="w-4 h-4 mr-1.5" /> Flashcards
                  </Button>
                  <Button
                    onClick={() => setActiveTab("quiz")}
                    variant="outline"
                    className="flex-1 h-10 rounded-xl font-bold text-[13px] border-2"
                    style={{ borderColor: color, color }}
                  >
                    <HelpCircle className="w-4 h-4 mr-1.5" /> Take Quiz
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── FLASHCARDS TAB ───────────────────────────────────────────── */}
          {activeTab === "flashcards" && (
            <motion.div key="flashcards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Stats bar */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-[11px] text-[#6b7280] font-bold">Reviewed</p>
                  <p className="text-lg font-extrabold text-[#1e1b4b]">{sessionStats.reviewed}</p>
                </div>
                <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-[11px] text-[#6b7280] font-bold">Accuracy</p>
                  <p className="text-lg font-extrabold" style={{ color: accuracy >= 70 ? "#10b981" : accuracy >= 40 ? "#f59e0b" : "#ef4444" }}>
                    {accuracy}%
                  </p>
                </div>
                <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-[11px] text-[#6b7280] font-bold">Streak</p>
                  <p className="text-lg font-extrabold text-[#f97316]">
                    🔥 {streak}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center justify-between mb-3 px-1">
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
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(queueIndex / queue.length) * 100}%`, background: color }}
                  />
                </div>
              )}

              {/* Card or empty state */}
              {cardsLeft === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl p-8 text-center"
                  style={{ background: bg }}
                >
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-xl font-extrabold text-[#1e1b4b] mb-1">
                    {sessionStats.reviewed > 0 ? "Session complete!" : "All caught up!"}
                  </h2>
                  <p className="text-sm text-[#6b7280] mb-4">
                    {sessionStats.reviewed > 0
                      ? `You reviewed ${sessionStats.reviewed} cards with ${accuracy}% accuracy.`
                      : "No cards due for review right now. Come back tomorrow!"}
                  </p>
                  <Button
                    onClick={() => setActiveTab("quiz")}
                    className="w-full h-11 rounded-xl font-bold text-white"
                    style={{ background: color }}
                  >
                    Try the Quiz <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              ) : (
                <AnimatePresence mode="wait">
                  {currentCard && (
                    <motion.div
                      key={currentCard.id}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Flip card */}
                      <div
                        className="relative cursor-pointer select-none mb-4"
                        style={{ perspective: "1200px", height: 240 }}
                        onClick={() => setIsFlipped(f => !f)}
                      >
                        <motion.div
                          animate={{ rotateY: isFlipped ? 180 : 0 }}
                          transition={{ duration: 0.45, ease: "easeInOut" }}
                          style={{ transformStyle: "preserve-3d", width: "100%", height: "100%" }}
                        >
                          {/* Front */}
                          <div
                            className="absolute inset-0 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center p-6 text-center"
                            style={{ backfaceVisibility: "hidden" }}
                          >
                            {/* Difficulty dot */}
                            {progress[currentCard.id] && (
                              <div className="absolute top-3 right-3">
                                <div
                                  className={cn("w-2.5 h-2.5 rounded-full", {
                                    "bg-[#10b981]": getCardDifficulty(progress[currentCard.id].EF) === "easy",
                                    "bg-[#f59e0b]": getCardDifficulty(progress[currentCard.id].EF) === "moderate",
                                    "bg-[#ef4444]": getCardDifficulty(progress[currentCard.id].EF) === "hard",
                                  })}
                                />
                              </div>
                            )}
                            {/* Leech warning */}
                            {progress[currentCard.id]?.lapses > 4 && (
                              <div className="absolute top-3 left-3 flex items-center gap-1 text-[#f59e0b]">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">Leech card</span>
                              </div>
                            )}
                            <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color }}>
                              {currentCard.topic}
                            </p>
                            <p className="text-base font-extrabold text-[#1e1b4b] leading-snug">
                              {currentCard.front}
                            </p>
                            <p className="text-[11px] text-[#6b7280] mt-4">Tap to reveal answer</p>
                          </div>

                          {/* Back */}
                          <div
                            className="absolute inset-0 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center p-6 text-center"
                            style={{
                              backfaceVisibility: "hidden",
                              transform: "rotateY(180deg)",
                              background: bg,
                            }}
                          >
                            <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color }}>
                              Answer
                            </p>
                            <p className="text-[14px] font-bold text-[#1e1b4b] leading-relaxed">
                              {currentCard.back}
                            </p>
                          </div>
                        </motion.div>
                      </div>

                      {/* Grade buttons — only shown when flipped */}
                      <AnimatePresence>
                        {isFlipped && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-4 gap-2"
                          >
                            {[
                              { grade: 1 as const, label: "Again", emoji: "😰", bg: "#fef2f2", color: "#ef4444" },
                              { grade: 3 as const, label: "Hard", emoji: "🤔", bg: "#fff7ed", color: "#f97316" },
                              { grade: 4 as const, label: "Good", emoji: "👍", bg: "#ecfdf5", color: "#10b981" },
                              { grade: 5 as const, label: "Easy", emoji: "😎", bg: "#eff6ff", color: "#3b82f6" },
                            ].map(g => (
                              <button
                                key={g.grade}
                                onClick={() => gradeCard(g.grade)}
                                className="flex flex-col items-center py-2.5 rounded-xl font-bold transition-all active:scale-95"
                                style={{ background: g.bg, color: g.color }}
                              >
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

              {/* All cards list */}
              {cardsLeft === 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-extrabold text-[#6b7280] uppercase tracking-wider px-1">All Cards</p>
                  {courseData.flashcards.map(card => {
                    const state = progress[card.id];
                    const diff = state ? getCardDifficulty(state.EF) : null;
                    return (
                      <div key={card.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
                        {diff && (
                          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", {
                            "bg-[#10b981]": diff === "easy",
                            "bg-[#f59e0b]": diff === "moderate",
                            "bg-[#ef4444]": diff === "hard",
                          })} />
                        )}
                        <p className="text-sm text-[#1e1b4b] font-bold flex-1 truncate">{card.front}</p>
                        <span className="text-[10px] font-bold text-[#6b7280]">{card.topic}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── QUIZ TAB ─────────────────────────────────────────────────── */}
          {activeTab === "quiz" && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {quizComplete ? (
                // Results screen
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="rounded-2xl p-6 text-center mb-4" style={{ background: bg }}>
                    <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color }} />
                    <h2 className="text-2xl font-extrabold text-[#1e1b4b] mb-1">
                      {quizScore} / {courseData.quizQuestions.length}
                    </h2>
                    <p className="text-sm text-[#6b7280] mb-1">
                      {quizScore === courseData.quizQuestions.length
                        ? "Perfect score! You nailed it! 🎉"
                        : quizScore >= Math.ceil(courseData.quizQuestions.length * 0.6)
                        ? "Good job! Keep practicing the ones you missed."
                        : "Keep studying — you'll get there! Try the flashcards first."}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={resetQuiz}
                        variant="outline"
                        className="flex-1 h-10 rounded-xl font-bold border-2"
                        style={{ borderColor: color, color }}
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" /> Retry
                      </Button>
                      <Button
                        onClick={() => setActiveTab("flashcards")}
                        className="flex-1 h-10 rounded-xl font-bold text-white"
                        style={{ background: color }}
                      >
                        Study Cards
                      </Button>
                    </div>
                  </div>

                  {/* Per-question breakdown */}
                  <p className="text-xs font-extrabold text-[#6b7280] uppercase tracking-wider mb-2 px-1">Breakdown</p>
                  {courseData.quizQuestions.map((q, i) => (
                    <div key={q.id} className="bg-white rounded-xl p-3 flex items-center gap-3 mb-2 shadow-sm">
                      {quizAnswers[q.id] ? (
                        <CheckCircle2 className="w-5 h-5 text-[#10b981] flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0" />
                      )}
                      <p className="text-sm text-[#1e1b4b] font-bold flex-1 leading-snug">{q.question}</p>
                      <span
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                        style={{
                          background: q.difficulty === "easy" ? "#ecfdf5" : q.difficulty === "medium" ? "#fff7ed" : "#fef2f2",
                          color: q.difficulty === "easy" ? "#10b981" : q.difficulty === "medium" ? "#f97316" : "#ef4444",
                        }}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                  ))}
                </motion.div>
              ) : (
                // Active quiz
                <AnimatePresence mode="wait">
                  <motion.div
                    key={quizIndex}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Progress */}
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-[11px] font-bold text-[#6b7280]">
                        Question {quizIndex + 1} of {courseData.quizQuestions.length}
                      </p>
                      <span
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                        style={{
                          background: currentQ.difficulty === "easy" ? "#ecfdf5" : currentQ.difficulty === "medium" ? "#fff7ed" : "#fef2f2",
                          color: currentQ.difficulty === "easy" ? "#10b981" : currentQ.difficulty === "medium" ? "#f97316" : "#ef4444",
                        }}
                      >
                        {currentQ.difficulty}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#e5e7eb] rounded-full mb-4 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${((quizIndex) / courseData.quizQuestions.length) * 100}%`, background: color }}
                      />
                    </div>

                    {/* Question card */}
                    <Card className="border-0 shadow-[0_4px_16px_rgba(0,0,0,0.07)] rounded-2xl mb-4">
                      <CardContent className="p-5">
                        <p className="text-base font-extrabold text-[#1e1b4b] leading-snug">
                          {currentQ.question}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Options */}
                    <div className="space-y-2 mb-4">
                      {currentQ.options.map(opt => {
                        const letter = opt.charAt(0);
                        const chosen = selectedAnswer === letter;
                        const isCorrect = letter === currentQ.answer;
                        let optBg = "bg-white";
                        let optColor = "text-[#1e1b4b]";
                        let optBorder = "border-transparent";
                        if (showExplanation) {
                          if (isCorrect) { optBg = "bg-[#ecfdf5]"; optColor = "text-[#10b981]"; optBorder = "border-[#10b981]"; }
                          else if (chosen) { optBg = "bg-[#fef2f2]"; optColor = "text-[#ef4444]"; optBorder = "border-[#ef4444]"; }
                        } else if (chosen) {
                          optBorder = "border-current";
                        }
                        return (
                          <button
                            key={opt}
                            onClick={() => selectAnswer(opt)}
                            disabled={!!selectedAnswer}
                            className={cn(
                              "w-full text-left p-3.5 rounded-xl border-2 font-bold text-sm shadow-sm transition-all",
                              optBg, optColor, optBorder
                            )}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <AnimatePresence>
                      {showExplanation && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl p-4 mb-4"
                          style={{ background: bg }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {selectedAnswer === currentQ.answer ? (
                              <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                            ) : (
                              <XCircle className="w-4 h-4 text-[#ef4444]" />
                            )}
                            <p className="text-[12px] font-extrabold" style={{ color }}>
                              {selectedAnswer === currentQ.answer ? "Correct!" : `Correct answer: ${currentQ.answer}`}
                            </p>
                          </div>
                          <p className="text-xs text-[#6b7280] leading-relaxed">{currentQ.explanation}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {showExplanation && (
                      <Button
                        onClick={nextQuestion}
                        className="w-full h-11 rounded-xl font-bold text-white text-[14px]"
                        style={{ background: color }}
                      >
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
