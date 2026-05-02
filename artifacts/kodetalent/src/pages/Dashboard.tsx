import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Play, Flame, Star, ChevronRight, Trophy } from "lucide-react";
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
      <div className="p-4 space-y-5 bg-[#f5f3ff] min-h-screen">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-4">
          <Skeleton className="h-24 flex-1 rounded-2xl" />
          <Skeleton className="h-24 flex-1 rounded-2xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  const { student, todayQuest, collegeRank } = data;

  return (
    <div className="p-4 space-y-5 pb-28 min-h-screen bg-[#f5f3ff]">
      <header className="pt-2">
        <h1 className="text-2xl font-bold text-[#1e1b4b]">Hey {student.name.split(" ")[0]} 👋</h1>
        <p className="text-sm font-medium text-[#6b7280] mt-0.5">{student.college}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <motion.div whileHover={{ y: -2 }}>
          <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl text-white" style={{ background: "linear-gradient(135deg, #f97316, #ec4899)" }}>
            <CardContent className="p-5 relative overflow-hidden">
              <Flame className="w-10 h-10 absolute -right-1 -bottom-1 text-white/20" />
              <p className="text-xs font-bold text-white/80 mb-1">Day Streak</p>
              <p className="text-3xl font-extrabold">🔥 {student.streakCount}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }}>
          <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl text-white" style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}>
            <CardContent className="p-5 relative overflow-hidden">
              <Star className="w-10 h-10 absolute -right-1 -bottom-1 text-white/20" />
              <p className="text-xs font-bold text-white/80 mb-1">Points</p>
              <p className="text-3xl font-extrabold">⭐ {student.xp}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {todayQuest && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ y: -2 }}>
          <Card className="border-0 border-l-4 border-l-primary shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-base font-bold text-[#1e1b4b]">Today's Goal</h2>
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-[#06b6d4] bg-[#06b6d4]/10 px-2 py-1 rounded-full">~{todayQuest.minutes}m</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">+{todayQuest.xpReward} pts</span>
                </div>
              </div>
              <p className="text-sm font-medium text-[#6b7280] mb-4">{todayQuest.title}</p>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button className="w-full bg-primary hover:bg-[#6d28d9] text-white font-bold h-11 rounded-full" asChild>
                  <Link href="/roadmap">
                    Start <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} whileHover={{ y: -2 }}>
        <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.15)] rounded-2xl text-white" style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-base flex items-center">
                <Trophy className="w-4 h-4 mr-2" /> Your Score
              </h3>
              <span className="text-3xl font-extrabold">{Math.round(student.overallScore)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white/90">Top {collegeRank.percentile}% in your college</span>
              <Link href="/leaderboard" className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors flex items-center">
                See rank <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
