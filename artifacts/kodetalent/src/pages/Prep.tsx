import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Target, ChevronRight, MessageSquare, Briefcase, X, Cpu, Users, Shuffle, Building2, Flame, Mic, Camera } from "lucide-react";
import { useCreateInterviewSession, useCreateTestSession } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InterviewType = "Technical" | "Behavioral" | "Mixed";
type Difficulty = "Standard" | "Challenging";

const INTERVIEW_TYPES: { type: InterviewType; icon: React.ElementType; label: string; desc: string }[] = [
  { type: "Technical", icon: Cpu, label: "Technical", desc: "DSA, system design, CS fundamentals" },
  { type: "Behavioral", icon: Users, label: "Behavioral", desc: "STAR-method, leadership, teamwork" },
  { type: "Mixed", icon: Shuffle, label: "Mixed", desc: "Both technical + HR questions" },
];

export default function Prep() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState<number | null>(null);

  const [interviewDrawerOpen, setInterviewDrawerOpen] = useState(false);
  const [testDrawerOpen, setTestDrawerOpen] = useState(false);

  const [company, setCompany] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("Technical");
  const [difficulty, setDifficulty] = useState<Difficulty>("Standard");
  // Default new users into voice+camera; respect an explicit "false" from a prior session.
  const [voiceMode, setVoiceMode] = useState(() => localStorage.getItem("voiceMode") !== "false");
  const [cameraMode, setCameraMode] = useState(() => localStorage.getItem("cameraMode") !== "false");

  const createInterview = useCreateInterviewSession();
  const createTest = useCreateTestSession();

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) {
      setLocation("/");
    } else {
      setStudentId(parseInt(id, 10));
    }
  }, [setLocation]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("start") === "1") {
      setInterviewDrawerOpen(true);
    }
  }, []);

  const handleStartInterview = async () => {
    if (!studentId) return;
    const targetCompany = company.trim() || "Any Tech Company";
    const round = `${interviewType}|${difficulty}`;
    localStorage.setItem("voiceMode", voiceMode ? "true" : "false");
    localStorage.setItem("cameraMode", cameraMode ? "true" : "false");
    try {
      const session = await createInterview.mutateAsync({
        data: { studentId, company: targetCompany, round }
      });
      setLocation(`/practice/interview/${session.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartTest = async () => {
    if (!studentId) return;
    try {
      const session = await createTest.mutateAsync({
        data: { studentId, testType: "Aptitude", difficulty: "Medium" }
      });
      setLocation(`/practice/test/${session.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const closeDrawers = () => {
    setInterviewDrawerOpen(false);
    setTestDrawerOpen(false);
  };

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-4 min-h-screen bg-paper">
      <div className="pt-2 mb-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center text-ink">
            <Target className="mr-2" /> Practice
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Get ready for your real placement interviews.
          </p>
        </div>
        <button
          onClick={() => setLocation("/practice/history")}
          className="mt-1 px-3 py-1.5 rounded-full border border-line text-[11px] font-bold text-ink uppercase tracking-wider whitespace-nowrap"
          data-testid="link-interview-history"
        >
          History
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card
          className="border border-line shadow-none rounded-2xl bg-paper cursor-pointer group"
          onClick={() => setInterviewDrawerOpen(true)}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-3">
              <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                AI · Personalised
              </div>
              <div className="w-8 h-8 rounded-full border border-line flex items-center justify-center group-hover:bg-ink group-hover:text-paper transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-ink flex items-center mb-1">
              <MessageSquare className="w-5 h-5 mr-2" />
              Mock Interview
            </h3>
            <p className="text-sm text-ink-muted">AI interviewer · Live feedback · Score report</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card
          className="border border-line shadow-none rounded-2xl bg-paper cursor-pointer group"
          onClick={() => setTestDrawerOpen(true)}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-3">
              <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                20-min timed MCQ
              </div>
              <div className="w-8 h-8 rounded-full border border-line flex items-center justify-center group-hover:bg-ink group-hover:text-paper transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-ink flex items-center mb-1">
              <Briefcase className="w-5 h-5 mr-2" />
              Mock Test
            </h3>
            <p className="text-sm text-ink-muted">Aptitude and reasoning — just like campus drives.</p>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {(interviewDrawerOpen || testDrawerOpen) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60]"
              onClick={closeDrawers}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-paper rounded-t-3xl z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.12)] max-w-md mx-auto flex flex-col max-h-[90dvh]"
            >
              {/* Header stays put; only the form body scrolls, and the CTA
                  lives in a pinned footer below so it can never scroll out
                  of reach or collide with the bottom nav. */}
              <div className="relative flex-shrink-0 pt-4 pb-1">
                <div className="w-12 h-1.5 bg-line rounded-full mx-auto" />
                <button className="absolute top-4 right-6 text-ink-muted rounded-full p-1" onClick={closeDrawers}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-3 pb-4">
                {interviewDrawerOpen && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-2xl font-bold text-ink mb-1">Set Up Interview</h2>
                      <p className="text-ink-muted text-sm">Configure your practice session</p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2 block">
                        <Building2 className="w-3 h-3 inline mr-1" /> Target Company
                      </label>
                      <Input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Google, TCS, Infosys..."
                        className="rounded-xl border-2 border-line focus-visible:border-ink focus-visible:ring-0 h-11 text-ink font-medium"
                      />
                      <p className="text-xs text-ink-muted mt-1 ml-1">Leave blank for a general interview</p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2 block">Interview Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {INTERVIEW_TYPES.map(({ type, icon: Icon, label, desc }) => (
                          <button
                            key={type}
                            onClick={() => setInterviewType(type)}
                            className={cn(
                              "rounded-2xl border-2 p-3 text-left transition-all",
                              interviewType === type ? "border-ink bg-line/40" : "border-line bg-paper"
                            )}
                          >
                            <Icon className="w-5 h-5 mb-1.5 text-ink" />
                            <div className="text-[12px] font-bold text-ink leading-tight">{label}</div>
                            <div className="text-[10px] text-ink-muted mt-0.5 leading-tight">{desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2 block">
                        <Flame className="w-3 h-3 inline mr-1" /> Difficulty
                      </label>
                      <div className="flex rounded-xl border-2 border-line overflow-hidden">
                        {(["Standard", "Challenging"] as Difficulty[]).map((d) => (
                          <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={cn(
                              "flex-1 py-2.5 text-sm font-bold transition-colors",
                              difficulty === d ? "bg-ink text-paper" : "bg-paper text-ink-muted"
                            )}
                          >
                            {d === "Challenging" ? "🔥 " : ""}{d}
                          </button>
                        ))}
                      </div>
                      {difficulty === "Challenging" && (
                        <p className="text-xs text-ink-muted font-bold mt-1 ml-1">Aggressive follow-ups, high pressure mode</p>
                      )}
                    </div>

                    <button
                      onClick={() => setVoiceMode(!voiceMode)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all",
                        voiceMode ? "border-ink bg-line/40" : "border-line bg-paper"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", voiceMode ? "bg-ink text-paper" : "bg-line/60 text-ink-muted")}>
                          <Mic className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-ink">Voice Mode</div>
                          <div className="text-[11px] text-ink-muted">AI reads questions · speak your answers</div>
                        </div>
                      </div>
                      <div className={cn("w-11 h-6 rounded-full transition-colors relative flex-shrink-0", voiceMode ? "bg-ink" : "bg-line")}>
                        <motion.div
                          className="absolute top-0.5 w-5 h-5 bg-paper rounded-full shadow"
                          animate={{ x: voiceMode ? 20 : 2 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                      </div>
                    </button>

                    <button
                      onClick={() => setCameraMode(!cameraMode)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all",
                        cameraMode ? "border-ink bg-line/40" : "border-line bg-paper"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", cameraMode ? "bg-ink text-paper" : "bg-line/60 text-ink-muted")}>
                          <Camera className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-ink">Camera Mode</div>
                          <div className="text-[11px] text-ink-muted">See yourself · feels like the real thing</div>
                        </div>
                      </div>
                      <div className={cn("w-11 h-6 rounded-full transition-colors relative flex-shrink-0", cameraMode ? "bg-ink" : "bg-line")}>
                        <motion.div
                          className="absolute top-0.5 w-5 h-5 bg-paper rounded-full shadow"
                          animate={{ x: cameraMode ? 20 : 2 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                      </div>
                    </button>
                  </div>
                )}

                {testDrawerOpen && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-ink mb-2">Start Mock Test</h2>
                    <p className="text-ink-muted text-[15px]">A 20-minute timed aptitude test — just like your campus placement rounds. You can't pause once it starts.</p>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 border-t border-line px-6 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                {interviewDrawerOpen && (
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      onClick={handleStartInterview}
                      disabled={createInterview.isPending}
                      className="w-full bg-ink hover:bg-ink/90 text-paper font-bold h-14 rounded-full text-lg"
                    >
                      {createInterview.isPending ? "Setting up..." : voiceMode ? "🎤 Start Voice Interview →" : "Start Interview →"}
                    </Button>
                  </motion.div>
                )}
                {testDrawerOpen && (
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      onClick={handleStartTest}
                      disabled={createTest.isPending}
                      className="w-full bg-ink hover:bg-ink/90 text-paper font-bold h-14 rounded-full text-lg"
                    >
                      {createTest.isPending ? "Generating questions..." : "Start Test →"}
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
