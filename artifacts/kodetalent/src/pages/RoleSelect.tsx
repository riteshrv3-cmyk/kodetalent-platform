import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { GraduationCap, BriefcaseBusiness, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RoleSelect() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#4f46e5] via-[#7c3aed] to-[#ec4899] flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-[28px] bg-white/15 backdrop-blur-md flex items-center justify-center text-4xl mb-8 shadow-2xl mx-auto"
        >
          ⚡
        </motion.div>
        <h1 className="text-4xl font-black text-center mb-3 leading-tight">KodeTalent</h1>
        <p className="text-white/80 text-center mb-8">Pehle batado — you are a student or recruiter?</p>

        <div className="space-y-4">
          <button
            onClick={() => setLocation("/home")}
            className="w-full rounded-3xl bg-white text-[#0f172a] p-5 text-left shadow-2xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#eef2ff] flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-[#4f46e5]" />
              </div>
              <div className="flex-1">
                <div className="font-black text-lg">Student</div>
                <div className="text-sm text-[#64748b]">Apna profile, roadmap aur opportunities ke liye</div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#94a3b8]" />
            </div>
          </button>

          <Button
            onClick={() => setLocation("/recruiter")}
            className="w-full h-20 rounded-3xl bg-white/15 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm shadow-2xl justify-start px-5"
          >
            <div className="flex items-center gap-4 w-full">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
                <BriefcaseBusiness className="w-7 h-7" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-black text-lg">Recruiter</div>
                <div className="text-sm text-white/80">Talent pool browse, shortlist aur invites ke liye</div>
              </div>
              <ArrowRight className="w-5 h-5 text-white/70" />
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}