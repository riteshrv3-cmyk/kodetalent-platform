import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { GraduationCap, BriefcaseBusiness, ArrowRight, Zap, Users } from "lucide-react";

const FEATURES = [
  "AI Mock Interviews",
  "Skill Roadmaps",
  "Resume Builder",
  "Recruiter Connect",
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

export default function RoleSelect() {
  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#f8fafc" }}
    >
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">

        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          className="mb-8"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "#f97316" }}
          >
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-black leading-tight mb-2 text-[#0f172a]">
            KodeTalent
          </h1>
          <p className="text-[#64748b] text-sm font-medium">AI Career Companion for Engineers</p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 mb-10 w-full"
        >
          {FEATURES.map((f) => (
            <span
              key={f}
              className="text-[11px] font-semibold text-[#475569] bg-white border border-[#e2e8f0] rounded-full px-3 py-1"
            >
              {f}
            </span>
          ))}
        </motion.div>

        {/* Role cards */}
        <div className="w-full space-y-3">

          {/* Student card */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation("/onboarding")}
            className="w-full text-left group bg-white border border-[#e2e8f0] rounded-2xl p-5 hover:border-[#4f46e5]/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[#4f46e5]">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base font-bold text-[#0f172a]">Student</span>
                  <span className="text-[10px] font-bold bg-[#f97316] text-white px-2 py-0.5 rounded-full">FREE</span>
                </div>
                <p className="text-xs text-[#64748b] leading-snug">Build your profile, get AI coaching, land jobs</p>
              </div>
              <ArrowRight className="w-5 h-5 text-[#94a3b8] group-hover:text-[#4f46e5] transition-colors shrink-0 mt-1" />
            </div>
            <div className="mt-3 pt-3 border-t border-[#f1f5f9] space-y-1">
              {STUDENT_FEATURES.map(f => (
                <div key={f} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] shrink-0" />
                  <span className="text-[11px] text-[#475569] font-medium">{f}</span>
                </div>
              ))}
            </div>
          </motion.button>

          {/* Recruiter card */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation("/recruiter")}
            className="w-full text-left group bg-white border border-[#e2e8f0] rounded-2xl p-5 hover:border-[#f97316]/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[#f97316]">
                <BriefcaseBusiness className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base font-bold text-[#0f172a]">Recruiter</span>
                  <span className="text-[10px] font-bold bg-[#0f172a] text-white px-2 py-0.5 rounded-full">BETA</span>
                </div>
                <p className="text-xs text-[#64748b] leading-snug">Browse top engineering talent, shortlist & hire</p>
              </div>
              <ArrowRight className="w-5 h-5 text-[#94a3b8] group-hover:text-[#f97316] transition-colors shrink-0 mt-1" />
            </div>
            <div className="mt-3 pt-3 border-t border-[#f1f5f9] space-y-1">
              {RECRUITER_FEATURES.map(f => (
                <div key={f} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f97316] shrink-0" />
                  <span className="text-[11px] text-[#475569] font-medium">{f}</span>
                </div>
              ))}
            </div>
          </motion.button>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 flex items-center gap-1.5 text-[11px] text-[#94a3b8] font-medium"
        >
          <Users className="w-3 h-3" />
          <span>Made for Indian Engineering Students</span>
        </motion.div>
      </div>
    </div>
  );
}
