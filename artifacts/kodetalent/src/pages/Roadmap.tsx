import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Lock, Clock, Zap, BookOpen, ChevronDown } from "lucide-react";
import { useGetStudentQuests, getGetStudentQuestsQueryKey, useCompleteQuest } from "@workspace/api-client-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";

export default function Roadmap() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<any>(null);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) {
      setLocation("/");
    } else {
      setStudentId(parseInt(id, 10));
    }
  }, [setLocation]);

  const { data: questStatuses, isLoading } = useGetStudentQuests(studentId as number, {
    query: { 
      enabled: !!studentId,
      queryKey: getGetStudentQuestsQueryKey(studentId as number)
    }
  });

  const completeQuest = useCompleteQuest();

  if (isLoading || !questStatuses) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-40 mb-6" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  // Group quests by year
  const questsByYear: Record<number, typeof questStatuses> = {};
  questStatuses.forEach((qs) => {
    if (!questsByYear[qs.quest.year]) {
      questsByYear[qs.quest.year] = [];
    }
    questsByYear[qs.quest.year].push(qs);
  });

  const years = Object.keys(questsByYear).map(Number).sort((a, b) => a - b);
  let defaultYear = years[0];
  for (const year of years) {
    if (questsByYear[year].some(qs => qs.status !== "completed")) {
      defaultYear = year;
      break;
    }
  }

  const handleQuestClick = (qs: any) => {
    setSelectedQuest(qs);
  };

  const handleStartQuest = async () => {
    if (!selectedQuest || !studentId) return;
    
    try {
      await completeQuest.mutateAsync({
        id: studentId,
        questId: selectedQuest.quest.id,
      });

      // Fire confetti and XP animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#0ea5e9', '#10b981', '#ec4899']
      });

      // Create floating +XP element
      const el = document.createElement("div");
      el.innerText = `+${selectedQuest.quest.xpReward} XP`;
      el.className = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-black text-[#4f46e5] z-50 pointer-events-none drop-shadow-lg";
      document.body.appendChild(el);
      
      const animation = el.animate([
        { transform: "translate(-50%, -50%) scale(0.5)", opacity: 0 },
        { transform: "translate(-50%, -100%) scale(1.2)", opacity: 1, offset: 0.2 },
        { transform: "translate(-50%, -200%) scale(1)", opacity: 0 }
      ], { duration: 1500, easing: "ease-out" });
      
      animation.onfinish = () => el.remove();

      queryClient.invalidateQueries({ queryKey: getGetStudentQuestsQueryKey(studentId) });
      setSelectedQuest(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 pb-28 max-w-md mx-auto min-h-screen bg-[#f8fafc]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center text-[#0f172a]">
          <BookOpen className="mr-2" /> Career Roadmap
        </h1>
        <p className="text-[#64748b] font-medium text-sm mt-1">
          Complete quests to level up and get placement ready.
        </p>
      </div>

      <Accordion type="single" defaultValue={`year-${defaultYear}`} collapsible className="w-full space-y-4">
        {years.map((year) => {
          const yearQuests = questsByYear[year];
          const completedCount = yearQuests.filter(q => q.status === "completed").length;
          const progress = Math.round((completedCount / yearQuests.length) * 100);
          const isCurrentYear = year === defaultYear;
          
          return (
            <AccordionItem key={year} value={`year-${year}`} className={`border-0 bg-white rounded-2xl shadow-[0_4px_24px_rgba(124,58,237,0.05)] overflow-hidden ${isCurrentYear ? 'border-l-4 border-l-primary' : ''}`}>
              <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>div>svg]:rotate-180">
                <div className="flex flex-col items-start w-full relative">
                  <div className="flex justify-between w-full mb-3 items-center pr-2">
                    <span className="font-bold text-lg text-[#0f172a]">Year {year}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                        {progress}%
                      </span>
                      <ChevronDown className="h-5 w-5 shrink-0 text-[#64748b] transition-transform duration-200" />
                    </div>
                  </div>
                  <div className="w-full bg-[#e0e7ff] rounded-full h-2 overflow-hidden">
                    <motion.div 
                      className="bg-primary h-full transition-all duration-500" 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0 pb-5 px-5">
                <div className="space-y-1 mt-2 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-[2px] before:bg-[#e0e7ff]">
                  {yearQuests.map((qs, index) => {
                    const isCompleted = qs.status === "completed";
                    const isInProgress = qs.status === "in_progress";
                    const isLocked = !isCompleted && !isInProgress && index > 0 && yearQuests[index-1].status !== "completed";
                    
                    return (
                      <motion.div 
                        key={qs.quest.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`relative flex items-center justify-between py-4 group ${!isLocked ? "cursor-pointer" : ""}`}
                        onClick={() => !isLocked && handleQuestClick(qs)}
                      >
                        <div className="flex items-center space-x-4 w-full">
                          <div className={`shrink-0 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white border-[3px] ${
                            isCompleted ? "border-[#10b981]" : 
                            isInProgress ? "border-primary" : 
                            "border-[#e0e7ff]"
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-6 h-6 text-[#10b981]" /> :
                             isLocked ? <Lock className="w-4 h-4 text-[#64748b]" /> :
                             <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }}>
                               <Circle className="w-5 h-5 text-primary border-t-2 border-primary rounded-full border-r-transparent" />
                             </motion.div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-[15px] truncate ${isCompleted ? "text-[#64748b] line-through font-medium" : isLocked ? "text-[#64748b] font-medium" : "text-[#0f172a] font-bold"}`}>
                              {qs.quest.title}
                            </h4>
                          </div>
                          {!isCompleted && !isLocked && (
                            <div className="shrink-0 text-[13px] font-extrabold flex items-center text-primary bg-primary/10 px-2 py-1 rounded-md">
                              +{qs.quest.xpReward} XP
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <AnimatePresence>
        {selectedQuest && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-sm z-50"
              onClick={() => setSelectedQuest(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 shadow-[0_-10px_40px_rgba(124,58,237,0.15)] max-w-md mx-auto"
            >
              <div className="w-12 h-1.5 bg-[#e0e7ff] rounded-full mx-auto mb-6" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold flex items-center">
                    <Zap className="w-3 h-3 mr-1" />
                    +{selectedQuest.quest.xpReward} XP
                  </div>
                  <div className="bg-[#e0e7ff] text-[#64748b] px-3 py-1 rounded-full text-xs font-bold flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    ~{selectedQuest.quest.minutes}m
                  </div>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-[#0f172a] leading-tight mb-2">{selectedQuest.quest.title}</h2>
              <p className="text-[#64748b] font-medium text-[15px] mb-6 leading-relaxed">
                {selectedQuest.quest.description}
              </p>
              
              <div className="space-y-4 mb-8">
                {selectedQuest.quest.whyItMatters && (
                  <div className="bg-[#f8fafc] rounded-2xl p-4 border border-[#e0e7ff]">
                    <h4 className="text-sm font-bold mb-1 text-primary flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2" /> Why it matters
                    </h4>
                    <p className="text-[14px] font-medium text-[#64748b] leading-relaxed">{selectedQuest.quest.whyItMatters}</p>
                  </div>
                )}
                {selectedQuest.quest.howToDoIt && (
                  <div className="bg-[#f8fafc] rounded-2xl p-4 border border-[#e0e7ff]">
                    <h4 className="text-sm font-bold mb-1 text-[#0ea5e9] flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9] mr-2" /> How to do it
                    </h4>
                    <p className="text-[14px] font-medium text-[#64748b] leading-relaxed">{selectedQuest.quest.howToDoIt}</p>
                  </div>
                )}
              </div>
              
              <div className="pb-safe">
                {selectedQuest.status !== "completed" ? (
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button onClick={handleStartQuest} className="w-full bg-primary hover:bg-[#3730a3] text-white font-bold h-14 rounded-full text-lg shadow-[0_8px_16px_rgba(124,58,237,0.2)]">
                      Start Quest
                    </Button>
                  </motion.div>
                ) : (
                  <Button disabled variant="outline" className="w-full border-[#10b981] text-[#10b981] bg-[#10b981]/5 h-14 rounded-full font-bold text-lg">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Completed
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
