import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { User as UserIcon, Share2, Award, Zap, Trophy, TrendingUp, X } from "lucide-react";
import { useGetStudentDashboard, getGetStudentDashboardQueryKey, useGetStudentWrapped } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

  if (isLoading || !dashboardData) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const { student, topSkills } = dashboardData;
  const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="p-4 pb-24 max-w-md mx-auto space-y-6">
      <div className="flex flex-col items-center justify-center pt-6 pb-2 text-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-primary/20 border-4 border-background">
            {initials}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1">
            <div className="bg-secondary text-secondary-foreground text-xs font-bold px-2 py-0.5 rounded-full border border-border">
              Lvl {student.level}
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold mt-4">{student.name}</h1>
        <p className="text-muted-foreground text-sm flex items-center justify-center mt-1">
          <UserIcon className="w-3 h-3 mr-1" /> {student.field} • Year {student.year}
        </p>
        <p className="text-muted-foreground text-sm mt-1">{student.college}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{Math.round(student.overallScore)}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">KT Score</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 text-center">
            <Zap className="w-6 h-6 mx-auto text-accent mb-2" />
            <p className="text-2xl font-bold">{student.xp}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total XP</p>
          </CardContent>
        </Card>
      </div>

      <Button 
        className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold h-14 rounded-xl shadow-lg shadow-primary/20 border border-primary/50 relative overflow-hidden group"
        onClick={() => setShowWrapped(true)}
      >
        <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        <TrendingUp className="w-5 h-5 mr-2" />
        VIEW MONTHLY CAREER WRAPPED
      </Button>

      <Card className="border-border/50">
        <CardContent className="p-5">
          <h3 className="font-bold mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-primary" /> Verified Skills
          </h3>
          <div className="space-y-4">
            {topSkills.map((skill, index) => {
              let colorClass = "bg-destructive";
              if (skill.score >= 70) colorClass = "bg-secondary";
              else if (skill.score >= 40) colorClass = "bg-accent";

              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{skill.name}</span>
                    <span className="font-bold text-muted-foreground">{Math.round(skill.score)}/100</span>
                  </div>
                  <Progress value={skill.score} className="h-2 bg-muted" indicatorClassName={colorClass} />
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
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-gradient-to-br from-indigo-900 via-[#1e1b4b] to-purple-900 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.3)] border border-primary/30 relative"
            >
              <button 
                onClick={() => setShowWrapped(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white z-10 bg-black/20 rounded-full p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8 text-center text-white relative z-0">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none -z-10">
                  {/* Decorative background elements */}
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-pink-500 rounded-full blur-3xl" />
                </div>

                <h2 className="text-sm font-bold tracking-widest text-primary-foreground/70 uppercase mb-6">
                  {wrappedData.month} Wrapped
                </h2>
                
                <h1 className="text-3xl font-black mb-2">{wrappedData.name}</h1>
                <p className="text-primary-foreground/60 text-sm mb-8">{wrappedData.college}</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                    <p className="text-xs text-white/60 font-medium uppercase tracking-wider mb-1">Top %</p>
                    <p className="text-3xl font-black text-secondary">{wrappedData.indiaPercentile}</p>
                    <p className="text-[10px] text-white/40 mt-1">in India</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                    <p className="text-xs text-white/60 font-medium uppercase tracking-wider mb-1">Streak</p>
                    <p className="text-3xl font-black text-accent">{wrappedData.streakDays}</p>
                    <p className="text-[10px] text-white/40 mt-1">days on fire</p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10 mb-8 text-left">
                  <p className="text-sm font-medium text-white/80 mb-2 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-primary" /> Score Growth
                  </p>
                  <div className="flex items-center justify-between font-black text-2xl">
                    <span className="text-white/50">{wrappedData.scoreStart}</span>
                    <div className="flex-1 border-t border-dashed border-white/20 mx-4 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1e1b4b] px-2 text-primary text-sm">+{(wrappedData.scoreEnd - wrappedData.scoreStart).toFixed(1)}</div>
                    </div>
                    <span className="text-white">{wrappedData.scoreEnd}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center text-xs font-bold text-white/40">
                    <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white mr-2">KT</div>
                    KodeTalent.com
                  </div>
                  <div className="text-xs font-bold text-accent px-2 py-1 bg-accent/20 rounded-full border border-accent/30">
                    +{wrappedData.xpGained} XP
                  </div>
                </div>

                <Button className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold h-12 rounded-xl text-lg shadow-lg shadow-[#25D366]/20">
                  <Share2 className="w-5 h-5 mr-2" /> Share on WhatsApp
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
