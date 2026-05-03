import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, MapPin } from "lucide-react";
import { useGetCollegeLeaderboard, useGetIndiaLeaderboard } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const [studentCollege, setStudentCollege] = useState<string>("");
  const [studentId, setStudentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("college");

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) {
      setLocation("/");
      return;
    }
    setStudentId(parseInt(id, 10));
    const college = localStorage.getItem("studentCollege") || "";
    setStudentCollege(college);
  }, [setLocation]);

  const { data: collegeLeaderboard, isLoading: collegeLoading } = useGetCollegeLeaderboard(
    { college: studentCollege },
    { query: { enabled: !!studentCollege } }
  );
  const { data: indiaLeaderboard, isLoading: indiaLoading } = useGetIndiaLeaderboard();

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-6 min-h-screen bg-[#f8fafc]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center text-[#0f172a]">
          <Trophy className="mr-2 text-primary" /> Leaderboard
        </h1>
        <p className="text-[#64748b] font-medium text-sm mt-1">
          Based on real skills — not NIRF ranking.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#e0e7ff] p-1 rounded-full border-0 h-12">
          <TabsTrigger value="college" className="rounded-full font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all text-[#64748b]">My College</TabsTrigger>
          <TabsTrigger value="india" className="rounded-full font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all text-[#64748b]">India</TabsTrigger>
        </TabsList>
        
        <TabsContent value="college" className="space-y-3">
          {collegeLoading || !collegeLeaderboard ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {collegeLeaderboard.map((entry, index) => {
                const isTop3 = entry.rank <= 3;
                let bgStyle = entry.isCurrentUser ? 'bg-[#e0e7ff] border-2 border-primary' : 'bg-white border-0';
                let textStyle = entry.isCurrentUser ? 'text-primary' : 'text-[#0f172a]';
                
                if (entry.rank === 1) bgStyle = 'bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] border-0 text-white';
                else if (entry.rank === 2) bgStyle = 'bg-gradient-to-r from-[#94a3b8] to-[#64748b] border-0 text-white';
                else if (entry.rank === 3) bgStyle = 'bg-gradient-to-r from-[#b45309] to-[#78350f] border-0 text-white';

                const isGradient = isTop3;

                return (
                  <motion.div 
                    key={entry.studentId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center p-4 rounded-2xl shadow-[0_4px_24px_rgba(124,58,237,0.05)] ${bgStyle}`}
                  >
                    <div className="w-10 font-black text-center shrink-0">
                      {isTop3 ? (
                        <span className="text-2xl text-white drop-shadow-md">#{entry.rank}</span>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold mx-auto">{entry.rank}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 ml-4">
                      <h4 className={`text-[16px] font-extrabold truncate ${isGradient ? 'text-white' : textStyle}`}>
                        {entry.name} {entry.isCurrentUser && "(You)"}
                      </h4>
                      <p className={`text-xs font-bold mt-0.5 ${isGradient ? 'text-white/80' : 'text-[#64748b]'}`}>
                        Level {entry.level} • {entry.streakCount}🔥
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xl font-black ${isGradient ? 'text-white' : 'text-primary'}`}>{Math.round(entry.overallScore)}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="india" className="space-y-3">
          {indiaLoading || !indiaLeaderboard ? (
             <div className="space-y-3">
             {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
           </div>
          ) : (
            <div className="space-y-3">
              {indiaLeaderboard.map((entry, index) => {
                const isTop3 = entry.rank <= 3;
                let bgStyle = 'bg-white border-0';
                
                if (entry.rank === 1) bgStyle = 'bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] border-0 text-white';
                else if (entry.rank === 2) bgStyle = 'bg-gradient-to-r from-[#94a3b8] to-[#64748b] border-0 text-white';
                else if (entry.rank === 3) bgStyle = 'bg-gradient-to-r from-[#b45309] to-[#78350f] border-0 text-white';

                const isGradient = isTop3;

                return (
                  <motion.div 
                    key={entry.college}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center p-4 rounded-2xl shadow-[0_4px_24px_rgba(124,58,237,0.05)] ${bgStyle}`}
                  >
                    <div className="w-10 font-black text-center shrink-0">
                      {isTop3 ? (
                        <span className="text-2xl text-white drop-shadow-md">#{entry.rank}</span>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold mx-auto">{entry.rank}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 ml-4">
                      <h4 className={`text-[15px] font-extrabold truncate ${isGradient ? 'text-white' : 'text-[#0f172a]'}`}>
                        {entry.college}
                      </h4>
                      <p className={`text-xs font-bold mt-1 flex items-center ${isGradient ? 'text-white/80' : 'text-[#64748b]'}`}>
                        <MapPin className="w-3 h-3 mr-1" /> {entry.city}
                      </p>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <div className={`text-xl font-black ${isGradient ? 'text-white' : 'text-primary'}`}>{Math.round(entry.avgScore)}</div>
                      <div className={`text-[10px] font-bold ${isGradient ? 'text-white/70' : 'text-[#64748b]'}`}>Avg Score</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
