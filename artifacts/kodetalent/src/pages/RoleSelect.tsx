import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { GraduationCap, BriefcaseBusiness, ArrowRight, Zap, Users, Shield, Star } from "lucide-react";

const FEATURES = [
  { label: "AI Mock Interviews", icon: Zap },
  { label: "Skill Roadmaps", icon: Users },
  { label: "Resume Builder", icon: Zap },
  { label: "Recruiter Connect", icon: Zap },
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
  { size: 480, x: -8, y: -10, color: "#c7d2fe", opacity: 0.7, duration: 9 },
  { size: 380, x: 70, y: 55, color: "#fbcfe8", opacity: 0.6, duration: 11 },
  { size: 320, x: 20, y: 70, color: "#bae6fd", opacity: 0.5, duration: 7 },
];

export default function RoleSelect() {
  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#f8fafc" }}
    >
      {/* Animated soft orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {FLOATING_ORBS.map((orb, i) => (
          <motion.div
            key={i}
            animate={{ x: [0, 28, -18, 0], y: [0, -22, 18, 0] }}
            transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
            className="absolute rounded-full blur-[100px]"
            style={{
              width: orb.size, height: orb.size,
              left: `${orb.x}%`, top: `${orb.y}%`,
              background: orb.color,
              opacity: orb.opacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(100,116,139,0.1) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#f8fafc] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f8fafc] to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-5 py-10 flex flex-col items-center">

        {/* Logo */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          className="mb-6 relative"
        >
          <div
            className="w-20 h-20 rounded-[24px] flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              boxShadow: "0 12px 40px rgba(249,115,22,0.35), 0 4px 16px rgba(249,115,22,0.2), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            <Zap className="w-10 h-10 text-white fill-white" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-[24px]"
            style={{ background: "rgba(249,115,22,0.25)", filter: "blur(10px)" }}
          />
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-2"
        >
          <h1 className="text-[40px] font-black leading-none tracking-tight mb-2 text-[#0f172a]">
            Kode<span style={{ background: "linear-gradient(90deg, #4f46e5, #7c3aed, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Talent</span>
          </h1>
          <p className="text-[#64748b] text-sm font-medium">AI Career Companion for Engineers</p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="grid grid-cols-2 gap-2 w-full mb-7"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.06 }}
              className="flex items-center gap-2 bg-white border border-[#e2e8f0] shadow-sm rounded-2xl py-3 px-3"
            >
              <f.icon className="w-4 h-4 text-[#f97316]" />
              <span className="text-[11px] font-bold text-[#475569]">{f.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Role cards */}
        <div className="w-full space-y-3">

          {/* Student card */}
          <motion.button
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation("/onboarding")}
            className="w-full text-left group relative overflow-hidden rounded-2xl"
            style={{
              background: "white",
              boxShadow: "0 4px 24px rgba(79,70,229,0.12), 0 1px 4px rgba(0,0,0,0.06)",
              border: "1.5px solid rgba(79,70,229,0.15)",
            }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.03), rgba(99,102,241,0.06))" }} />
            <div className="relative p-5">
              <div className="flex items-start gap-4">
                <div className="w-[52px] h-[52px] rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow: "0 6px 20px rgba(79,70,229,0.35)" }}>
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[18px] font-black text-[#0f172a]">Student</span>
                    <span className="text-[9px] font-black bg-[#eef2ff] text-[#4f46e5] px-2 py-0.5 rounded-full">FREE</span>
                  </div>
                  <p className="text-[12px] text-[#64748b] font-medium leading-snug">Build your profile, get AI coaching, land jobs</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#eef2ff] flex items-center justify-center group-hover:bg-[#4f46e5] transition-colors shrink-0 mt-0.5">
                  <ArrowRight className="w-4 h-4 text-[#4f46e5] group-hover:text-white transition-colors" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#f1f5f9] space-y-1.5">
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
              background: "linear-gradient(135deg, #1e1b4b, #312e81)",
              boxShadow: "0 8px 32px rgba(79,70,229,0.25), 0 2px 8px rgba(0,0,0,0.15)",
              border: "1.5px solid rgba(99,102,241,0.3)",
            }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(236,72,153,0.06))" }} />
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, #f97316, transparent)", transform: "translate(30%,-30%)" }} />
            <div className="relative p-5">
              <div className="flex items-start gap-4">
                <div className="w-[52px] h-[52px] rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 6px 20px rgba(249,115,22,0.4)" }}>
                  <BriefcaseBusiness className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[18px] font-black text-white">Recruiter</span>
                    <span className="text-[9px] font-black bg-[#f97316]/20 text-[#fb923c] px-2 py-0.5 rounded-full border border-[#f97316]/30">BETA</span>
                  </div>
                  <p className="text-[12px] text-white/60 font-medium leading-snug">Browse top engineering talent, shortlist & hire</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#f97316] transition-colors shrink-0 mt-0.5">
                  <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
                {RECRUITER_FEATURES.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                    </div>
                    <span className="text-[11px] text-white/55 font-semibold">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.button>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-7 flex flex-col items-center gap-2.5"
        >
          <div className="flex items-center gap-4 text-[10px] font-bold text-[#94a3b8]">
            <div className="flex items-center gap-1.5"><Shield className="w-3 h-3" /><span>No spam ever</span></div>
            <div className="w-px h-3 bg-[#e2e8f0]" />
            <div className="flex items-center gap-1.5"><Star className="w-3 h-3" /><span>Free to join</span></div>
            <div className="w-px h-3 bg-[#e2e8f0]" />
            <div className="flex items-center gap-1.5"><Users className="w-3 h-3" /><span>Student-first, always</span></div>
          </div>
          <p className="text-[10px] text-[#cbd5e1] font-medium">Made for Indian Engineering Students 🇮🇳</p>
        </motion.div>

      </div>
    </div>
  );
}
