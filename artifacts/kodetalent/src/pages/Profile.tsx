import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { User as UserIcon, Share2, Award, Zap, Trophy, TrendingUp, X } from "lucide-react";
import { useGetStudentDashboard, getGetStudentDashboardQueryKey, useGetStudentWrapped } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

export default function Profile() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [showWrapped, setShowWrapped] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) {
      setLocation("/");
    } else {
      setStudentId(parseInt(id, 10));
    }
  }, [setLocation]);

  const { data: dashboardData, isLoading } = useGetStudentDashboard(studentId as number, {
    query: { 
      enabled: !!studentId,
      queryKey: getGetStudentDashboardQueryKey(studentId as number)
    }
  });

  const { data: wrappedData } = useGetStudentWrapped(studentId as number, {
    query: { 
      enabled: !!studentId && showWrapped,
    }
  });

  useEffect(() => {
    if (showWrapped && wrappedData) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.3 },
        colors: ['#ffffff', '#ec4899', '#7c3aed', '#06b6d4']
      });
    }
  }, [showWrapped, wrappedData]);

  if (isLoading || !dashboardData) {
    return (
      <div className="p-4 space-y-6 bg-[#f5f3ff] min-h-screen">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <Skeleton className="h-28 w-28 rounded-full" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const { student, topSkills } = dashboardData;
  const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-6 min-h-screen bg-[#f5f3ff]">
      <div className="flex flex-col items-center justify-center pt-8 pb-4 text-center relative">
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] flex items-center justify-center text-4xl font-black text-white shadow-[0_8px_30px_rgba(124,58,237,0.3)] border-4 border-[#f5f3ff]">
            {initials}
          </div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white rounded-full p-1 shadow-sm">
            <div className="bg-[#10b981] text-white text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
              Lvl {student.level}
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold mt-6 text-[#1e1b4b]">{student.name}</h1>
        <p className="text-[#6b7280] font-bold text-[15px] mt-1">{student.college}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 bg-white shadow-[0_4px_24px_rgba(124,58,237,0.05)] rounded-2xl">
          <CardContent className="p-4 text-center flex flex-col justify-center items-center h-full">
            <p className="text-xl font-black text-primary mb-1">{Math.round(student.overallScore)}</p>
            <p className="text-[10px] font-extrabold text-[#6b7280] uppercase tracking-wider">Score</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-[0_4px_24px_rgba(124,58,237,0.05)] rounded-2xl">
          <CardContent className="p-4 text-center flex flex-col justify-center items-center h-full">
            <p className="text-xl font-black text-[#06b6d4] mb-1">{student.xp}</p>
            <p className="text-[10px] font-extrabold text-[#6b7280] uppercase tracking-wider">Total XP</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-[0_4px_24px_rgba(124,58,237,0.05)] rounded-2xl">
          <CardContent className="p-4 text-center flex flex-col justify-center items-center h-full">
            <p className="text-xl font-black text-[#f97316] mb-1">{student.streakCount}</p>
            <p className="text-[10px] font-extrabold text-[#6b7280] uppercase tracking-wider">Streak</p>
          </CardContent>
        </Card>
      </div>

      <motion.div whileTap={{ scale: 0.97 }}>
        <Button 
          className="w-full text-white font-bold h-16 rounded-full shadow-[0_8px_24px_rgba(124,58,237,0.25)] border-0 text-[16px] relative overflow-hidden group"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
          onClick={() => setShowWrapped(true)}
        >
          <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          ✨ See My {new Date().toLocaleString('default', { month: 'long' })} Wrapped
        </Button>
      </motion.div>

      <Card className="border-0 bg-white shadow-[0_4px_24px_rgba(124,58,237,0.05)] rounded-2xl">
        <CardContent className="p-5">
          <h3 className="font-extrabold text-lg mb-5 flex items-center text-[#1e1b4b]">
            <Award className="w-5 h-5 mr-2 text-primary" /> Verified Skills
          </h3>
          <div className="space-y-4">
            {topSkills.map((skill, index) => {
              let colorClass = "bg-[#ef4444]";
              if (skill.score >= 70) colorClass = "bg-[#10b981]";
              else if (skill.score >= 40) colorClass = "bg-[#f97316]";

              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-[15px]">
                    <span className="font-bold text-[#1e1b4b]">{skill.name}</span>
                    <span className="font-extrabold text-primary">{Math.round(skill.score)}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#ede9fe] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.score}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full ${colorClass}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Career Wrapped Modal */}
      <AnimatePresence>
        {showWrapped && wrappedData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#1e1b4b]/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              <button 
                onClick={() => setShowWrapped(false)}
                className="absolute top-4 right-4 text-white z-10 bg-white/20 rounded-full p-1.5 backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8 text-center text-white relative z-0">
                <h2 className="text-xs font-black tracking-widest text-white/80 uppercase mb-6 drop-shadow-md">
                  {wrappedData.month} Wrapped
                </h2>
                
                <h1 className="text-4xl font-black mb-2 leading-tight drop-shadow-lg">{wrappedData.name}</h1>
                <p className="text-white/80 font-bold text-sm mb-8 drop-shadow-sm">{wrappedData.college}</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/20">
                    <p className="text-[11px] text-white/80 font-black uppercase tracking-wider mb-1">Top %</p>
                    <p className="text-4xl font-black text-white drop-shadow-md">{wrappedData.indiaPercentile}</p>
                    <p className="text-xs font-bold text-white/60 mt-1">in India</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/20">
                    <p className="text-[11px] text-white/80 font-black uppercase tracking-wider mb-1">Streak</p>
                    <p className="text-4xl font-black text-white drop-shadow-md">{wrappedData.streakDays}</p>
                    <p className="text-xs font-bold text-white/60 mt-1">days</p>
                  </div>
                </div>

                <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/20 mb-8 text-left">
                  <p className="text-sm font-black text-white mb-4 flex items-center">
                    Score Growth
                  </p>
                  <div className="flex items-center justify-between font-black text-3xl">
                    <span className="text-white/60">{wrappedData.scoreStart}</span>
                    <div className="flex-1 flex justify-center px-4">
                      <div className="bg-white text-primary px-3 py-1 rounded-full text-sm font-black shadow-lg">
                        +{Math.round(wrappedData.scoreEnd - wrappedData.scoreStart)}
                      </div>
                    </div>
                    <span className="text-white drop-shadow-md">{wrappedData.scoreEnd}</span>
                  </div>
                </div>

                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold h-14 rounded-full text-[16px] shadow-[0_8px_24px_rgba(37,211,102,0.4)]">
                    <Share2 className="w-5 h-5 mr-2" /> Share on WhatsApp
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
