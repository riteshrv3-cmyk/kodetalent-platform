import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Github,
  Trophy,
  BookOpen,
  Briefcase,
  MessageSquare,
  ChevronRight,
  Star,
  TrendingUp,
  Users,
  Flame,
  Brain,
  Target,
  Award,
  ArrowRight,
} from "lucide-react";

const screens = [
  {
    id: 0,
    bg: "from-[#0f172a] via-[#1e1b4b] to-[#312e81]",
    accentColor: "#f97316",
    title: "Your AI Career\nCoach is Here",
    subtitle:
      "From 1st year to final placement — one app that grows with you every single day.",
    visual: <HeroVisual />,
    tag: "Welcome to KodeTalent ⚡",
  },
  {
    id: 1,
    bg: "from-[#0c1a2e] via-[#0f2847] to-[#1a3a5c]",
    accentColor: "#0ea5e9",
    title: "Build a Profile\nRecruiters Love",
    subtitle:
      "Connect GitHub, add projects & certs. Our AI scores your profile and puts you in front of 500+ companies.",
    visual: <ProfileVisual />,
    tag: "Step 1 · Your Profile",
  },
  {
    id: 2,
    bg: "from-[#0c1f0c] via-[#0f2f1a] to-[#14402a]",
    accentColor: "#10b981",
    title: "Practice Until\nYou're Unstoppable",
    subtitle:
      "AI mock interviews with real-time feedback. Timed MCQ tests just like actual placements. Daily streak keeps you sharp.",
    visual: <PracticeVisual />,
    tag: "Step 2 · Practice",
  },
  {
    id: 3,
    bg: "from-[#1a0f2e] via-[#2d1b69] to-[#3730a3]",
    accentColor: "#8b5cf6",
    title: "Master Any Skill\nin Days",
    subtitle:
      "48 tech domains. AI-generated courses with video links, flashcards that use spaced repetition, and quizzes that test real knowledge.",
    visual: <LearnVisual />,
    tag: "Step 3 · Learn",
  },
  {
    id: 4,
    bg: "from-[#1a0c0c] via-[#2d1010] to-[#7f1d1d]",
    accentColor: "#f59e0b",
    title: "Get Hired,\nNot Just Placed",
    subtitle:
      "Top recruiters send you interview invites directly. Accept or decline on your terms. Rise to the top of your college leaderboard.",
    visual: <HireVisual />,
    tag: "Step 4 · Get Hired",
  },
];

function HeroVisual() {
  return (
    <div className="relative w-full h-48 flex items-center justify-center">
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <div className="w-24 h-24 rounded-[28px] bg-[#f97316] flex items-center justify-center shadow-[0_0_60px_rgba(249,115,22,0.5)]">
          <Zap className="w-14 h-14 text-white fill-white" />
        </div>
      </motion.div>

      {[
        { icon: Brain, color: "#818cf8", x: -110, y: -30, delay: 0.4, label: "AI Chat" },
        { icon: Target, color: "#34d399", x: 110, y: -30, delay: 0.5, label: "Practice" },
        { icon: Trophy, color: "#fbbf24", x: -90, y: 70, delay: 0.6, label: "Rank #1" },
        { icon: Briefcase, color: "#60a5fa", x: 90, y: 70, delay: 0.7, label: "Jobs" },
      ].map(({ icon: Icon, color, x, y, delay, label }) => (
        <motion.div
          key={label}
          className="absolute flex flex-col items-center gap-1"
          style={{ left: "50%", top: "50%", x, y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay, type: "spring", stiffness: 300 }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: color + "22", border: `1.5px solid ${color}44` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <span className="text-[10px] font-semibold" style={{ color: color + "cc" }}>
            {label}
          </span>
        </motion.div>
      ))}

      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white/30"
          style={{
            left: `${15 + i * 11}%`,
            top: `${10 + (i % 3) * 30}%`,
          }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.5, 1] }}
          transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function ProfileVisual() {
  const items = [
    { icon: Github, label: "GitHub Connected", value: "47 repos", color: "#60a5fa" },
    { icon: Award, label: "AWS Certification", value: "Verified ✓", color: "#34d399" },
    { icon: TrendingUp, label: "Profile Strength", value: "87 / 100", color: "#f97316" },
  ];

  return (
    <div className="w-full space-y-3">
      {items.map(({ icon: Icon, label, value, color }, i) => (
        <motion.div
          key={label}
          className="flex items-center gap-3 rounded-2xl p-3 bg-white/5 border border-white/10"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 200 }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: color + "22" }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/50">{label}</p>
            <p className="text-sm font-bold text-white">{value}</p>
          </div>
          <div
            className="text-xs font-semibold px-2 py-1 rounded-lg"
            style={{ background: color + "22", color }}
          >
            +15 pts
          </div>
        </motion.div>
      ))}

      <motion.div
        className="flex items-center gap-2 mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Users className="w-4 h-4 text-[#0ea5e9]" />
        <span className="text-xs text-white/60">
          <span className="text-[#0ea5e9] font-bold">12 recruiters</span> viewed your profile this week
        </span>
      </motion.div>
    </div>
  );
}

function PracticeVisual() {
  const messages = [
    { from: "ai", text: "Tell me about a challenging project you built.", delay: 0.2 },
    { from: "user", text: "I built a real-time chat app using Socket.io and React...", delay: 0.5 },
    { from: "ai", text: "Good structure! Tip: mention scalability concerns next time.", delay: 0.9, feedback: true },
  ];

  return (
    <div className="w-full space-y-2">
      {messages.map(({ from, text, delay, feedback }) => (
        <motion.div
          key={text}
          className={`flex ${from === "user" ? "justify-end" : "justify-start"}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, type: "spring", stiffness: 200 }}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
              from === "ai"
                ? feedback
                  ? "bg-[#10b981]/20 border border-[#10b981]/30 text-[#34d399]"
                  : "bg-white/8 border border-white/10 text-white/80"
                : "bg-[#10b981] text-white"
            }`}
          >
            {text}
          </div>
        </motion.div>
      ))}

      <motion.div
        className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <div className="flex items-center gap-1.5 bg-[#f97316]/20 rounded-xl px-3 py-1.5 border border-[#f97316]/30">
          <Flame className="w-3.5 h-3.5 text-[#f97316]" />
          <span className="text-[#f97316] text-xs font-bold">7 day streak</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#fbbf24]/20 rounded-xl px-3 py-1.5 border border-[#fbbf24]/30">
          <Star className="w-3.5 h-3.5 text-[#fbbf24] fill-current" />
          <span className="text-[#fbbf24] text-xs font-bold">2,400 Points</span>
        </div>
      </motion.div>
    </div>
  );
}

function LearnVisual() {
  const domains = [
    { emoji: "🤖", name: "AI / ML", lessons: 15, color: "#818cf8" },
    { emoji: "🌐", name: "Web Dev", lessons: 15, color: "#34d399" },
    { emoji: "☁️", name: "Cloud & DevOps", lessons: 15, color: "#60a5fa" },
    { emoji: "📱", name: "Mobile Dev", lessons: 15, color: "#f59e0b" },
  ];

  return (
    <div className="w-full space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        {domains.map(({ emoji, name, lessons, color }, i) => (
          <motion.div
            key={name}
            className="rounded-2xl p-3 bg-white/5 border border-white/10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 300 }}
          >
            <div className="text-2xl mb-1">{emoji}</div>
            <p className="text-xs font-bold text-white leading-tight">{name}</p>
            <p className="text-[10px] mt-0.5" style={{ color: color + "99" }}>
              {lessons} lessons
            </p>
            <div className="mt-2 h-1 rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${25 + i * 15}%` }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <BookOpen className="w-4 h-4 text-[#8b5cf6]" />
        <span className="text-xs text-white/70">
          <span className="text-white font-semibold">48 sub-domains</span> · Flashcards · Quizzes · Video links
        </span>
      </motion.div>
    </div>
  );
}

function HireVisual() {
  const invites = [
    { company: "Google", role: "SWE Intern", logo: "G", color: "#4285f4", time: "2h ago" },
    { company: "Flipkart", role: "Backend Dev", logo: "F", color: "#f9a825", time: "5h ago" },
    { company: "Razorpay", role: "Full Stack", logo: "R", color: "#3395ff", time: "1d ago" },
  ];

  return (
    <div className="w-full space-y-2.5">
      {invites.map(({ company, role, logo, color, time }, i) => (
        <motion.div
          key={company}
          className="flex items-center gap-3 rounded-2xl p-3 bg-white/5 border border-white/10"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 200 }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-sm"
            style={{ background: color }}
          >
            {logo}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{company}</p>
            <p className="text-xs text-white/50">{role} · {time}</p>
          </div>
          <div className="flex gap-1.5">
            <div className="bg-[#10b981]/20 border border-[#10b981]/30 rounded-lg px-2 py-1 text-[10px] font-bold text-[#34d399]">
              Accept
            </div>
          </div>
        </motion.div>
      ))}

      <motion.div
        className="flex items-center justify-between bg-[#f59e0b]/10 rounded-xl px-3 py-2 border border-[#f59e0b]/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#f59e0b]" />
          <span className="text-xs text-white/70">College Rank</span>
        </div>
        <span className="text-sm font-black text-[#f59e0b]">#3 of 847</span>
      </motion.div>
    </div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 320 : -320,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -320 : 320,
    opacity: 0,
  }),
};

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState(1);

  const screen = screens[currentIdx];
  const isLast = currentIdx === screens.length - 1;

  function goNext() {
    if (isLast) {
      finish();
      return;
    }
    setDirection(1);
    setCurrentIdx((prev) => prev + 1);
  }

  function goPrev() {
    if (currentIdx === 0) return;
    setDirection(-1);
    setCurrentIdx((prev) => prev - 1);
  }

  function finish() {
    localStorage.setItem("welcomeSeen", "1");
    setLocation("/home");
  }

  return (
    <div
      className={`min-h-[100dvh] bg-gradient-to-br ${screen.bg} flex flex-col overflow-hidden transition-all duration-700`}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
        <motion.div
          key={`tag-${currentIdx}`}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-full border"
          style={{
            color: screen.accentColor,
            borderColor: screen.accentColor + "44",
            background: screen.accentColor + "18",
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {screen.tag}
        </motion.div>

        <button
          onClick={finish}
          className="text-white/40 text-sm font-medium hover:text-white/70 transition-colors"
        >
          Skip
        </button>
      </div>

      <div className="flex gap-1.5 px-5 mb-4 flex-shrink-0">
        {screens.map((_, i) => (
          <motion.div
            key={i}
            className="h-1 rounded-full flex-1"
            animate={{
              background:
                i < currentIdx
                  ? screen.accentColor
                  : i === currentIdx
                  ? screen.accentColor
                  : "rgba(255,255,255,0.15)",
              scaleX: i === currentIdx ? 1 : i < currentIdx ? 1 : 1,
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col px-5 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIdx}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col h-full"
          >
            <div className="flex-1 flex flex-col justify-center gap-6">
              <div className="w-full">
                {screen.visual}
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-black text-white leading-tight whitespace-pre-line">
                  {screen.title}
                </h1>
                <p className="text-sm text-white/60 leading-relaxed">
                  {screen.subtitle}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-5 pb-8 pt-4 flex items-center gap-4 flex-shrink-0">
        {currentIdx > 0 ? (
          <button
            onClick={goPrev}
            className="w-12 h-12 rounded-2xl border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-all active:scale-95"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
        ) : (
          <div className="w-12" />
        )}

        <motion.button
          onClick={goNext}
          className="flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 text-white transition-all active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${screen.accentColor}, ${screen.accentColor}cc)`,
            boxShadow: `0 0 30px ${screen.accentColor}44`,
          }}
          whileTap={{ scale: 0.97 }}
          key={`btn-${currentIdx}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isLast ? (
            <>
              Let's Go
              <Zap className="w-4 h-4 fill-white" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
