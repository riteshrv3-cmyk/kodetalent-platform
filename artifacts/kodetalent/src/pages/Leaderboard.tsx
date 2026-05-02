import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Trophy, Medal, MapPin } from "lucide-react";
import { useGetCollegeLeaderboard, useGetIndiaLeaderboard } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const [studentCollege, setStudentCollege] = useState<string>("PICT Pune"); // Should come from context/auth
  const [studentId, setStudentId] = useState<number | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) {
      setLocation("/");
    } else {
      setStudentId(parseInt(id, 10));
      // In a real app, we'd fetch the student's college here, but using a default for mockup
    }
  }, [setLocation]);

  const { data: collegeLeaderboard, isLoading: collegeLoading } = useGetCollegeLeaderboard({ college: studentCollege });
  const { data: indiaLeaderboard, isLoading: indiaLoading } = useGetIndiaLeaderboard();

  return (
    <div className="p-4 pb-24 max-w-md mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold flex items-center">
          <Trophy className="mr-2 text-accent" /> Leaderboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Based on real skills — not NIRF ranking.
        </p>
      </div>

      <Tabs defaultValue="college" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-card border border-border">
          <TabsTrigger value="college" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">My College</TabsTrigger>
          <TabsTrigger value="india" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">India</TabsTrigger>
        </TabsList>
        
        <TabsContent value="college" className="space-y-4">
          {collegeLoading || !collegeLeaderboard ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {collegeLeaderboard.map((entry, index) => (
                <motion.div 
                  key={entry.studentId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center p-3 rounded-xl border ${
                    entry.isCurrentUser 
                      ? "bg-primary/10 border-primary shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                      : "bg-card/50 border-border/50"
                  }`}
                >
                  <div className="w-8 font-black text-center text-muted-foreground">
                    {entry.rank === 1 ? <Medal className="w-6 h-6 mx-auto text-yellow-400" /> : 
                     entry.rank === 2 ? <Medal className="w-6 h-6 mx-auto text-gray-400" /> : 
                     entry.rank === 3 ? <Medal className="w-6 h-6 mx-auto text-amber-700" /> : 
                     `#${entry.rank}`}
                  </div>
                  <div className="mx-3 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold border border-border shrink-0">
                    {entry.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold truncate ${entry.isCurrentUser ? "text-primary" : "text-foreground"}`}>
                      {entry.name} {entry.isCurrentUser && "(You)"}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      Level {entry.level} • {entry.streakCount}🔥
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-foreground">{Math.round(entry.overallScore)}</div>
                    <div className="text-[10px] text-muted-foreground">Score</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="india" className="space-y-4">
          {indiaLoading || !indiaLeaderboard ? (
             <div className="space-y-3">
             {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
           </div>
          ) : (
            <div className="space-y-3">
              {indiaLeaderboard.map((entry, index) => (
                <motion.div 
                  key={entry.college}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center p-3 rounded-xl border bg-card/50 border-border/50"
                >
                  <div className="w-8 font-black text-center text-muted-foreground">
                    {entry.rank === 1 ? <Medal className="w-6 h-6 mx-auto text-yellow-400" /> : 
                     entry.rank === 2 ? <Medal className="w-6 h-6 mx-auto text-gray-400" /> : 
                     entry.rank === 3 ? <Medal className="w-6 h-6 mx-auto text-amber-700" /> : 
                     `#${entry.rank}`}
                  </div>
                  <div className="flex-1 min-w-0 ml-3">
                    <h4 className="text-sm font-bold truncate text-foreground">
                      {entry.college}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate flex items-center mt-0.5">
                      <MapPin className="w-3 h-3 mr-1" /> {entry.city} • {entry.studentCount} students
                    </p>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <div className="text-sm font-black text-foreground">{Math.round(entry.avgScore)}</div>
                    <div className="text-[10px] text-muted-foreground">Avg Score</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
