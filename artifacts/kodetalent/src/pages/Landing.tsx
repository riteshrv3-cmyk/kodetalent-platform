import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  Zap,
  Mic2,
  FileText,
  Users,
  ShieldCheck,
  Trophy,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Star,
  GraduationCap,
  BriefcaseBusiness,
  Code2,
  TrendingUp,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATS = [
  { value: "1,200+", label: "Students enrolled" },
  { value: "15+", label: "Colleges" },
  { value: "200+", label: "Active jobs" },
  { value: "48h", label: "Avg. shortlist time" },
];

const FEATURES = [
  {
    icon: Mic2,
    color: "#4f46e5",
    bg: "#eef2ff",
    title: "AI Mock Interviews",
    desc: "Practice unlimited AI-driven interviews tailored to your target role. Get instant per-answer feedback and an overall score with improvement tips.",
    href: "/practice",
  },
  {
    icon: FileText,
    color: "#f97316",
    bg: "#fff7ed",
    title: "AI Resume Builder",
    desc: "Generate a one-page, ATS-optimised resume from your KodeTalent profile in seconds. Download as PDF, ready to send to any recruiter.",
    href: "/resume",
  },
  {
    icon: Users,
    color: "#0ea5e9",
    bg: "#f0f9ff",
    title: "Recruiter Marketplace",
    desc: "Your verified profile is searchable by 500+ hiring managers. Get direct interview invites from top product and service companies.",
    href: "/chat",
  },
  {
    icon: ShieldCheck,
    color: "#10b981",
    bg: "#f0fdf4",
    title: "Placement Drive Verifier",
    desc: "Verify college placement drives instantly. Students submit drive details; TPOs confirm legitimacy so no one falls for scams.",
    href: "/opportunities",
  },
  {
    icon: BookOpen,
    color: "#7c3aed",
    bg: "#f5f3ff",
    title: "AI Skill Roadmaps",
    desc: "Get a personalised learning roadmap for 48 sub-domains — from React and ML to DevOps and Blockchain — with curated video lessons.",
    href: "/opportunities",
  },
  {
    icon: Trophy,
    color: "#f59e0b",
    bg: "#fffbeb",
    title: "Leaderboard & Ranking",
    desc: "Compete on your college leaderboard and the India-wide ranking. Top scorers get priority visibility in the recruiter marketplace.",
    href: "/leaderboard",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Create your profile",
    desc: "Answer a 2-minute WhatsApp-style chatbot and your full profile is built automatically.",
  },
  {
    step: "2",
    title: "Get AI-coached",
    desc: "Practice mock interviews, complete skill courses, and let AI improve your weak areas.",
  },
  {
    step: "3",
    title: "Land your first job",
    desc: "Recruiters find you, shortlist you, and send interview invites — right inside the app.",
  },
];

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    college: "NIT Trichy · CSE 3rd Year",
    text: "KodeTalent's AI interview gave me the confidence I needed. I landed a SDE intern at a Bengaluru startup within two weeks of joining!",
    stars: 5,
  },
  {
    name: "Arjun Mehta",
    college: "VIT Vellore · IT 4th Year",
    text: "The resume builder saved me hours. My profile was found by a recruiter and I got an interview call the very next day.",
    stars: 5,
  },
  {
    name: "Sneha Reddy",
    college: "BITS Pilani · ECE 3rd Year",
    text: "I went from 0 to a 78% AI score in two months. The roadmaps and flashcards are actually useful — not just generic YouTube links.",
    stars: 5,
  },
];

export default function Landing() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const studentId = localStorage.getItem("studentId");
    if (studentId) {
      setLocation("/home");
    }
  }, [setLocation]);

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#f8fafc", color: "#0f172a" }}
    >
      {/* ── Nav ── */}
      <header
        className="sticky top-0 z-50 border-b border-[#e2e8f0]"
        style={{ background: "rgba(248,250,252,0.92)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <a
            href={`${BASE}/`}
            className="flex items-center gap-2.5 no-underline"
            aria-label="KodeTalent home"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
            >
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-[17px] font-black text-[#0f172a]">
              Kode<span style={{ color: "#4f46e5" }}>Talent</span>
            </span>
          </a>

          <nav className="hidden sm:flex items-center gap-6 text-[13px] font-semibold text-[#475569]">
            <a href={`${BASE}/opportunities`} className="hover:text-[#4f46e5] transition-colors no-underline">Careers</a>
            <a href={`${BASE}/practice`} className="hover:text-[#4f46e5] transition-colors no-underline">Practice</a>
            <a href={`${BASE}/leaderboard`} className="hover:text-[#4f46e5] transition-colors no-underline">Leaderboard</a>
          </nav>

          <button
            onClick={() => setLocation("/onboarding")}
            className="flex items-center gap-1.5 text-[13px] font-bold text-white rounded-full px-4 py-2 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
          >
            Get started free
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-16 pb-20 px-5">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-40"
            style={{ background: "#c7d2fe", left: "-10%", top: "-20%" }} />
          <div className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-30"
            style={{ background: "#fbcfe8", right: "-5%", top: "10%" }} />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(100,116,139,0.07) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          {/* Trust pill */}
          <div className="inline-flex items-center gap-2 bg-white border border-[#e2e8f0] shadow-sm rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-[12px] font-bold text-[#475569]">
              Trusted by students from IIT, NIT, BITS &amp; 15+ colleges
            </span>
          </div>

          <h1 className="text-[44px] sm:text-[56px] font-black leading-[1.05] tracking-tight mb-5 text-[#0f172a]">
            India's AI Career Companion<br />
            <span style={{ background: "linear-gradient(90deg, #f97316, #ea580c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              for Engineering Students
            </span>
          </h1>

          <p className="text-[17px] sm:text-[19px] text-[#475569] font-medium leading-relaxed max-w-2xl mx-auto mb-8">
            From 1st year to placement day — KodeTalent gives you AI mock interviews, personalised skill roadmaps,
            an AI-built resume, and direct connections to 500+ recruiters, all in one free app.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => setLocation("/onboarding")}
              className="flex items-center gap-2 text-[15px] font-bold text-white rounded-2xl px-7 py-3.5 shadow-lg hover:opacity-90 transition-opacity w-full sm:w-auto justify-center"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 8px 24px rgba(249,115,22,0.35)" }}
            >
              <GraduationCap className="w-5 h-5" />
              Join as Student — Free
            </button>
            <button
              onClick={() => setLocation("/recruiter")}
              className="flex items-center gap-2 text-[15px] font-bold text-[#0f172a] bg-white rounded-2xl px-7 py-3.5 border border-[#e2e8f0] shadow-sm hover:border-[#4f46e5] transition-colors w-full sm:w-auto justify-center"
            >
              <BriefcaseBusiness className="w-5 h-5 text-[#4f46e5]" />
              Hire top talent
            </button>
          </div>

          {/* Stats strip */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="bg-white border border-[#e2e8f0] rounded-2xl py-4 px-3 flex flex-col items-center shadow-sm"
              >
                <span className="text-[22px] font-black text-[#0f172a] leading-none">{s.value}</span>
                <span className="text-[11px] font-semibold text-[#94a3b8] mt-1 text-center">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 px-5 bg-white" aria-labelledby="features-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 id="features-heading" className="text-[32px] sm:text-[38px] font-black text-[#0f172a] mb-3">
              Everything you need to get placed
            </h2>
            <p className="text-[16px] text-[#64748b] font-medium max-w-xl mx-auto">
              Six powerful tools that work together to take you from campus to career.
            </p>
          </div>

          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 list-none p-0 m-0">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title}>
                  <a
                    href={`${BASE}${f.href}`}
                    className="block h-full bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-6 hover:border-[#4f46e5] hover:shadow-md transition-all no-underline group"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: f.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: f.color }} />
                    </div>
                    <h3 className="text-[16px] font-bold text-[#0f172a] mb-2 group-hover:text-[#4f46e5] transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-[13px] text-[#64748b] leading-relaxed font-medium">{f.desc}</p>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 px-5" aria-labelledby="how-heading">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 id="how-heading" className="text-[32px] sm:text-[38px] font-black text-[#0f172a] mb-3">
              Placement-ready in 3 steps
            </h2>
            <p className="text-[16px] text-[#64748b] font-medium">
              Setup takes under 2 minutes. Results start the same day.
            </p>
          </div>

          <ol className="space-y-6 list-none p-0 m-0">
            {HOW_IT_WORKS.map((step, i) => (
              <li
                key={step.step}
                className="flex gap-5 items-start bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[18px] font-black shrink-0"
                  style={{ background: i === 0 ? "#4f46e5" : i === 1 ? "#f97316" : "#10b981" }}
                >
                  {step.step}
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-[#0f172a] mb-1">{step.title}</h3>
                  <p className="text-[14px] text-[#64748b] font-medium leading-relaxed">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 text-center">
            <button
              onClick={() => setLocation("/onboarding")}
              className="inline-flex items-center gap-2 text-[15px] font-bold text-white rounded-2xl px-8 py-3.5 hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 8px 24px rgba(249,115,22,0.3)" }}
            >
              Start your journey
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-16 px-5 bg-white" aria-labelledby="testimonials-heading">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 id="testimonials-heading" className="text-[32px] sm:text-[38px] font-black text-[#0f172a] mb-3">
              Students who got placed
            </h2>
            <p className="text-[16px] text-[#64748b] font-medium">
              Real stories from engineering students across India.
            </p>
          </div>

          <ul className="grid sm:grid-cols-3 gap-5 list-none p-0 m-0">
            {TESTIMONIALS.map((t) => (
              <li
                key={t.name}
                className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-6 flex flex-col gap-4"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#f59e0b] text-[#f59e0b]" />
                  ))}
                </div>
                <p className="text-[14px] text-[#334155] leading-relaxed font-medium flex-1">"{t.text}"</p>
                <div>
                  <p className="text-[14px] font-bold text-[#0f172a]">{t.name}</p>
                  <p className="text-[12px] text-[#94a3b8] font-semibold">{t.college}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="py-16 px-5" aria-labelledby="audience-heading">
        <div className="max-w-4xl mx-auto">
          <h2 id="audience-heading" className="text-[32px] sm:text-[38px] font-black text-[#0f172a] mb-10 text-center">
            Built for every stage of your journey
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                icon: Code2,
                color: "#4f46e5",
                bg: "#eef2ff",
                title: "1st & 2nd Year Students",
                points: [
                  "Build your profile and earn points",
                  "Start a skill roadmap in any domain",
                  "Beat classmates on the leaderboard",
                ],
              },
              {
                icon: TrendingUp,
                color: "#f97316",
                bg: "#fff7ed",
                title: "3rd & 4th Year Placement Seekers",
                points: [
                  "AI mock interviews for top companies",
                  "ATS-ready resume in 30 seconds",
                  "Get found by 500+ recruiters",
                ],
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: card.bg }}
                  >
                    <Icon className="w-6 h-6" style={{ color: card.color }} />
                  </div>
                  <h3 className="text-[17px] font-bold text-[#0f172a] mb-4">{card.title}</h3>
                  <ul className="space-y-2.5 list-none p-0 m-0">
                    {card.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: card.color }} />
                        <span className="text-[13px] text-[#475569] font-semibold">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16 px-5">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-10 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)" }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, #f97316, transparent)", transform: "translate(30%,-30%)" }}
          />
          <div className="relative">
            <div
              className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-5"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
            >
              <Zap className="w-7 h-7 text-white fill-white" />
            </div>
            <h2 className="text-[28px] sm:text-[34px] font-black text-white mb-3">
              Your first recruiter invite<br />could be 48 hours away
            </h2>
            <p className="text-[15px] text-white/60 font-medium mb-7 max-w-lg mx-auto">
              Join 1,200+ engineering students who are already getting shortlisted by top companies.
              It's free, forever.
            </p>
            <button
              onClick={() => setLocation("/onboarding")}
              className="inline-flex items-center gap-2 text-[15px] font-bold text-white rounded-2xl px-8 py-3.5 hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 8px 24px rgba(249,115,22,0.4)" }}
            >
              <GraduationCap className="w-5 h-5" />
              Create my profile — it's free
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#e2e8f0] py-10 px-5" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
              >
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-[17px] font-black text-[#0f172a]">
                Kode<span style={{ color: "#4f46e5" }}>Talent</span>
              </span>
            </div>

            <nav aria-label="Footer navigation">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 list-none p-0 m-0">
                {[
                  { label: "AI Chat", href: "/chat" },
                  { label: "Practice", href: "/practice" },
                  { label: "Opportunities", href: "/opportunities" },
                  { label: "Resume Builder", href: "/resume" },
                  { label: "Leaderboard", href: "/leaderboard" },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={`${BASE}${link.href}`}
                      className="text-[13px] font-semibold text-[#64748b] hover:text-[#4f46e5] transition-colors no-underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="pt-6 border-t border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-[12px] text-[#94a3b8] font-medium">
              © {new Date().getFullYear()} KodeTalent. Free for all engineering students in India. 🇮🇳
            </p>
            <p className="text-[12px] text-[#94a3b8] font-medium">
              AI mock interviews · Skill roadmaps · Resume builder · Recruiter marketplace
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
