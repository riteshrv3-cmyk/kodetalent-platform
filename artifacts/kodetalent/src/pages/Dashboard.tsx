import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Play, Flame, Zap, Award, ChevronRight, Trophy } from "lucide-react";
import { useGetStudentDashboard, getGetStudentDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState<number | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) {
      setLocation("/");
    } else {
      setStudentId(parseInt(id, 10));
    }
  }, [setLocation]);

  const { data, isLoading } = useGetStudentDashboard(studentId as number, {
    query: { 
      enabled: !!studentId,
      queryKey: getGetStudentDashboardQueryKey(studentId as number)
    }
  });

  if (isLoading || !data) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-24 flex-1 rounded-2xl" />
          <Skeleton className="h-24 flex-1 rounded-2xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const { student, todayQuest, topSkills, collegeRank, xpToNextLevel } = data;

  return (
    <div className="p-4 space-y-6 pb-28 min-h-screen bg-[#f5f3ff]">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1e1b4b]">Hey {student.name.split(' ')[0]} 👋</h1>
          <p className="text-sm font-medium text-[#6b7280]">{student.college}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <motion.div whileHover={{ y: -2 }} className="w-full">
          <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl text-white" style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}>
            <CardContent className="p-5 flex flex-col justify-center h-full relative overflow-hidden">
              <Flame className="w-12 h-12 absolute -right-2 -bottom-2 text-white/20" />
              <p className="text-sm font-bold text-white/90 mb-1 z-10">Streak</p>
              <p className="text-3xl font-extrabold z-10">🔥 {student.streakCount} <span className="text-sm font-bold text-white/80">Days</span></p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div whileHover={{ y: -2 }} className="w-full">
          <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl text-white" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
            <CardContent className="p-5 flex flex-col justify-center h-full relative overflow-hidden">
              <Zap className="w-12 h-12 absolute -right-2 -bottom-2 text-white/20" />
              <p className="text-sm font-bold text-white/90 mb-1 z-10">Total XP</p>
              <p className="text-3xl font-extrabold z-10">⚡ {student.xp}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="text-sm text-center font-bold text-[#6b7280] -mt-2">
        {xpToNextLevel} XP to Level {student.level + 1}
      </div>

      {todayQuest && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -2 }}
        >
          <Card className="border-0 border-l-4 border-l-primary shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-lg font-bold text-[#1e1b4b]">Today's Quest</h2>
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-[#06b6d4] bg-[#06b6d4]/10 px-2 py-1 rounded-full">
                    ~{todayQuest.minutes}m
                  </span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                    +{todayQuest.xpReward} XP
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-[#6b7280] mb-5">
                {todayQuest.title}
              </p>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button className="w-full bg-primary hover:bg-[#6d28d9] text-white font-bold h-12 rounded-full text-[15px]" asChild>
                  <Link href="/roadmap">
                    Start Quest <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h3 className="text-base font-bold text-[#1e1b4b] flex items-center mb-1">
          <Award className="w-5 h-5 mr-2 text-primary" /> Top Skills
        </h3>
        {topSkills.map((skill, index) => {
          let progressColor = "bg-[#ef4444]";
          if (skill.score >= 70) progressColor = "bg-[#10b981]";
          else if (skill.score >= 40) progressColor = "bg-[#f97316]";

          return (
            <Card key={index} className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.05)] rounded-2xl bg-white">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-[15px] text-[#1e1b4b]">{skill.name}</span>
                  <span className="font-extrabold text-sm text-[#7c3aed]">{Math.round(skill.score)}%</span>
                </div>
                <div className="h-2 w-full bg-[#ede9fe] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.score}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`h-full ${progressColor}`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ y: -2 }}
      >
        <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.15)] rounded-2xl text-white" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg flex items-center">
                <Trophy className="w-5 h-5 mr-2" /> KodeTalent Score
              </h3>
              <span className="text-3xl font-extrabold">{Math.round(student.overallScore)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white/90">Top {collegeRank.percentile}% in College</span>
              <Link href="/leaderboard" className="text-sm font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors flex items-center">
                View Rank <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
