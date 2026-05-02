import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Lock, Play, Clock, Zap, BookOpen } from "lucide-react";
import { useGetStudentQuests, getGetStudentQuestsQueryKey, useCompleteQuest } from "@workspace/api-client-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export default function Roadmap() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full mt-8" />
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
  // Find current year (first year with incomplete quests, or last year)
  let defaultYear = years[0];
  for (const year of years) {
    if (questsByYear[year].some(qs => qs.status !== "completed")) {
      defaultYear = year;
      break;
    }
  }

  const handleQuestClick = (qs: any) => {
    setSelectedQuest(qs);
    setDrawerOpen(true);
  };

  const handleStartQuest = async () => {
    if (!selectedQuest || !studentId) return;
    
    try {
      await completeQuest.mutateAsync({
        data: {
          studentId: studentId,
          questId: selectedQuest.quest.id
        }
      });
      // Update local state or invalidate
      queryClient.invalidateQueries({ queryKey: getGetStudentQuestsQueryKey(studentId) });
      setDrawerOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 pb-24 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <BookOpen className="mr-2" /> Career Roadmap
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete quests to level up and get placement ready.
        </p>
      </div>

      <Accordion type="single" defaultValue={`year-${defaultYear}`} collapsible className="w-full space-y-4">
        {years.map((year) => {
          const yearQuests = questsByYear[year];
          const completedCount = yearQuests.filter(q => q.status === "completed").length;
          const progress = Math.round((completedCount / yearQuests.length) * 100);
          
          return (
            <AccordionItem key={year} value={`year-${year}`} className="border-none bg-card rounded-xl overflow-hidden shadow-sm">
              <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:bg-card/80">
                <div className="flex flex-col items-start w-full">
                  <div className="flex justify-between w-full mb-1">
                    <span className="font-bold text-lg">Year {year}</span>
                    <span className="text-sm font-medium bg-primary/20 text-primary px-2 py-0.5 rounded-md">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0 pb-4 px-4">
                <div className="space-y-4 mt-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {yearQuests.map((qs, index) => {
                    const isCompleted = qs.status === "completed";
                    const isInProgress = qs.status === "in_progress";
                    const isLocked = !isCompleted && !isInProgress && index > 0 && yearQuests[index-1].status !== "completed";
                    
                    return (
                      <motion.div 
                        key={qs.quest.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`relative flex items-center justify-between p-3 rounded-lg border ${
                          isCompleted ? "bg-secondary/10 border-secondary/30" : 
                          isInProgress ? "bg-primary/10 border-primary/30" : 
                          "bg-card/50 border-border/50 opacity-70"
                        } ${!isLocked ? "cursor-pointer" : ""}`}
                        onClick={() => !isLocked && handleQuestClick(qs)}
                      >
                        <div className="flex items-center space-x-3 w-full">
                          <div className={`shrink-0 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-background ring-4 ring-card ${
                            isCompleted ? "text-secondary" : 
                            isInProgress ? "text-primary" : 
                            "text-muted-foreground"
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-5 h-5 fill-current" /> :
                             isLocked ? <Lock className="w-4 h-4" /> :
                             <Circle className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-semibold truncate ${isCompleted ? "text-foreground" : "text-foreground"}`}>
                              {qs.quest.title}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {qs.quest.description}
                            </p>
                          </div>
                          {!isCompleted && !isLocked && (
                            <div className="shrink-0 text-xs font-bold flex items-center text-primary">
                              <Zap className="w-3 h-3 mr-1" />
                              {qs.quest.xpReward}
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

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="bg-card border-border">
          {selectedQuest && (
            <div className="mx-auto w-full max-w-md">
              <DrawerHeader>
                <div className="flex justify-between items-start mb-2">
                  <div className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-bold flex items-center">
                    <Zap className="w-3 h-3 mr-1" />
                    {selectedQuest.quest.xpReward} XP
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 mr-1" />
                    ~{selectedQuest.quest.minutes} mins
                  </div>
                </div>
                <DrawerTitle className="text-xl">{selectedQuest.quest.title}</DrawerTitle>
                <DrawerDescription className="text-base mt-2">
                  {selectedQuest.quest.description}
                </DrawerDescription>
              </DrawerHeader>
              <div className="p-4 space-y-4">
                {selectedQuest.quest.whyItMatters && (
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <h4 className="text-sm font-bold mb-1 text-primary">Why it matters</h4>
                    <p className="text-sm text-muted-foreground">{selectedQuest.quest.whyItMatters}</p>
                  </div>
                )}
                {selectedQuest.quest.howToDoIt && (
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <h4 className="text-sm font-bold mb-1 text-accent">How to do it</h4>
                    <p className="text-sm text-muted-foreground">{selectedQuest.quest.howToDoIt}</p>
                  </div>
                )}
              </div>
              <DrawerFooter>
                {selectedQuest.status !== "completed" ? (
                  <Button onClick={handleStartQuest} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                    Mark as Completed
                  </Button>
                ) : (
                  <Button disabled variant="outline" className="w-full border-secondary text-secondary">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Completed
                  </Button>
                )}
                <DrawerClose asChild>
                  <Button variant="ghost">Close</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
