import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Play, Flame, Zap, Award, ChevronRight, Trophy } from "lucide-react";
import { useGetStudentDashboard, getGetStudentDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
          <Skeleton className="h-16 flex-1 rounded-xl" />
          <Skeleton className="h-16 flex-1 rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const { student, todayQuest, questProgress, topSkills, collegeRank, xpToNextLevel } = data;

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Hey {student.name.split(' ')[0]} 👋</h1>
          <p className="text-sm text-muted-foreground">{student.college}</p>
        </div>
        <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold flex items-center">
          Lvl {student.level}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card/50 border-accent/20">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="p-2 bg-accent/20 text-accent rounded-lg">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Streak</p>
              <p className="text-xl font-bold">{student.streakCount} <span className="text-sm font-normal text-muted-foreground">days</span></p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-primary/20">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total XP</p>
              <p className="text-xl font-bold">{student.xp}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-center text-muted-foreground -mt-4">
        {xpToNextLevel} XP needed for Level {student.level + 1}
      </div>

      {todayQuest && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-primary shadow-[0_0_15px_rgba(99,102,241,0.2)] overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">Today's Quest</CardTitle>
                <div className="flex items-center text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                  <Zap className="w-3 h-3 mr-1" />
                  +{todayQuest.xpReward} XP
                </div>
              </div>
              <CardDescription className="text-primary-foreground/80 font-medium">
                {todayQuest.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-muted-foreground">
                  ~{todayQuest.minutes} mins
                </div>
                <Button size="sm" asChild>
                  <Link href="/roadmap">
                    Start Quest <Play className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center text-muted-foreground uppercase tracking-wider">
              <Award className="w-4 h-4 mr-2" /> Top Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topSkills.map((skill, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{skill.name}</span>
                  <span className="font-bold">{Math.round(skill.score)}%</span>
                </div>
                <Progress 
                  value={skill.score} 
                  className="h-2" 
                  indicatorClassName={
                    skill.score > 70 ? "bg-secondary" : skill.score > 40 ? "bg-accent" : "bg-destructive"
                  } 
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Trophy className="w-5 h-5 text-accent mr-2" />
                <span className="font-bold">KodeTalent Score</span>
              </div>
              <span className="text-xl font-black text-primary">{Math.round(student.overallScore)}</span>
            </div>
            <Progress value={student.overallScore} className="h-1.5 mb-2" />
            <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
              <span>Top {collegeRank.percentile}% in {student.college}</span>
              <Link href="/leaderboard" className="flex items-center text-primary font-medium">
                Leaderboard <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
