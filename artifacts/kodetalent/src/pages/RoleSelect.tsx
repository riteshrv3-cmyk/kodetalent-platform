import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { GraduationCap, BriefcaseBusiness, ArrowRight, Zap, Users, Building2, Star, Shield, ChevronRight } from "lucide-react";

const STATS = [
  { value: "1,200+", label: "Students" },
  { value: "15+", label: "Colleges" },
  { value: "200+", label: "Jobs" },
  { value: "48h", label: "Shortlist" },
];

const STUDENT_FEATURES = [
  "AI-generated career roadmap",
  "Mock interviews & MCQ tests",
  "Recruiter-visible profile",
];

const RECRUITER_FEATURES = [
  "Verified talent pool",
  "AI-scored candidates",
  "Instant shortlisting",
];

const FLOATING_ORBS = [
  { size: 500, x: -15, y: -15, color: "#4f46e5", opacity: 0.18, duration: 9 },
  { size: 400, x: 60, y: 50, color: "#ec4899", opacity: 0.14, duration: 11 },
  { size: 350, x: 15, y: 65, color: "#0ea5e9", opacity: 0.12, duration: 7 },
];

export default function RoleSelect() {
  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#0a0a14" }}
    >
      {/* ── Animated background ──────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {FLOATING_ORBS.map((orb, i) => (
          <motion.div
            key={i}
            animate={{ x: [0, 30, -20, 0], y: [0, -25, 20, 0] }}
            transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
            className="absolute rounded-full blur-[120px]"
            style={{
              width: orb.size, height: orb.size,
              left: `${orb.x}%`, top: `${orb.y}%`,
              background: orb.color,
              opacity: orb.opacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
        {/* Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Top gradient fade */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0a0a14] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a14] to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-5 py-10 flex flex-col items-center">

        {/* ── Logo ────────────────────────────────────────────── */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          className="mb-7 relative"
        >
          <div
            className="w-20 h-20 rounded-[24px] flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              boxShadow: "0 0 60px rgba(249,115,22,0.5), 0 0 120px rgba(249,115,22,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <Zap className="w-10 h-10 text-white fill-white" />
          </div>
          {/* Glow ring */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-[24px]"
            style={{ background: "rgba(249,115,22,0.3)", filter: "blur(12px)" }}
          />
        </motion.div>

        {/* ── Headline ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-2"
        >
          <h1 className="text-[40px] font-black leading-none tracking-tight mb-2">
            <span className="text-white">Kode</span>
            <span style={{
              background: "linear-gradient(90deg, #818cf8, #a78bfa, #f472b6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Talent</span>
          </h1>
          <p className="text-white/50 text-sm font-medium">AI Career Companion for Engineers</p>
        </motion.div>

        {/* ── Trust badge ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18 }}
          className="flex items-center gap-2 mb-8 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[11px] font-bold text-white/60">Trusted by students from IIT, NIT, BITS & more</span>
        </motion.div>

        {/* ── Stats strip ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="grid grid-cols-4 gap-2 w-full mb-8"
        >
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.06 }}
              className="flex flex-col items-center bg-white/5 border border-white/8 rounded-2xl py-3 px-1"
            >
              <span className="text-[17px] font-black text-white leading-none">{s.value}</span>
              <span className="text-[9px] font-bold text-white/40 mt-1 uppercase tracking-wider">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Role cards ───────────────────────────────────────── */}
        <div className="w-full space-y-3">

          {/* Student card */}
          <motion.button
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation("/home")}
            className="w-full text-left group relative overflow-hidden rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.97), rgba(248,250,255,0.97))",
              boxShadow: "0 20px 60px rgba(79,70,229,0.25), 0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.04), rgba(99,102,241,0.08))" }} />

            <div className="relative p-5">
              <div className="flex items-start gap-4">
                <div
                  className="w-13 h-13 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                    boxShadow: "0 8px 24px rgba(79,70,229,0.4)",
                    width: 52, height: 52,
                  }}
                >
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[18px] font-black text-[#0f172a]">Student</span>
                    <span className="text-[9px] font-black bg-[#eef2ff] text-[#4f46e5] px-2 py-0.5 rounded-full">FREE</span>
                  </div>
                  <p className="text-[12px] text-[#64748b] font-medium leading-snug">Build your profile, get AI coaching, land jobs</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#4f46e5]/10 flex items-center justify-center group-hover:bg-[#4f46e5] transition-colors shrink-0 mt-0.5">
                  <ArrowRight className="w-4 h-4 text-[#4f46e5] group-hover:text-white transition-colors" />
                </div>
              </div>

              {/* Feature list */}
              <div className="mt-4 pt-4 border-t border-[#f0f4ff] space-y-1.5">
                {STUDENT_FEATURES.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#eef2ff] flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]" />
                    </div>
                    <span className="text-[11px] text-[#475569] font-semibold">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.button>

          {/* Recruiter card */}
          <motion.button
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.36, type: "spring", stiffness: 100 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation("/recruiter")}
            className="w-full text-left group relative overflow-hidden rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(236,72,153,0.08))" }} />
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.12), transparent)", transform: "translate(30%, -30%)" }} />

            <div className="relative p-5">
              <div className="flex items-start gap-4">
                <div
                  className="w-13 h-13 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                    boxShadow: "0 8px 24px rgba(249,115,22,0.4)",
                    width: 52, height: 52,
                  }}
                >
                  <BriefcaseBusiness className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[18px] font-black text-white">Recruiter</span>
                    <span className="text-[9px] font-black bg-[#f97316]/20 text-[#fb923c] px-2 py-0.5 rounded-full border border-[#f97316]/30">BETA</span>
                  </div>
                  <p className="text-[12px] text-white/55 font-medium leading-snug">Browse top engineering talent, shortlist & hire</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center group-hover:bg-[#f97316] transition-colors shrink-0 mt-0.5 border border-white/10">
                  <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                </div>
              </div>

              {/* Feature list */}
              <div className="mt-4 pt-4 border-t border-white/8 space-y-1.5">
                {RECRUITER_FEATURES.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-white/8 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                    </div>
                    <span className="text-[11px] text-white/50 font-semibold">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.button>
        </div>

        {/* ── Trust footer ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-4 text-white/25 text-[10px] font-bold">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              <span>No spam ever</span>
            </div>
            <div className="w-px h-3 bg-white/15" />
            <div className="flex items-center gap-1.5">
              <Star className="w-3 h-3" />
              <span>Free to join</span>
            </div>
            <div className="w-px h-3 bg-white/15" />
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              <span>1,200+ active</span>
            </div>
          </div>
          <p className="text-[10px] text-white/15 font-medium">Made for Indian Engineering Students 🇮🇳</p>
        </motion.div>

      </div>
    </div>
  );
}
