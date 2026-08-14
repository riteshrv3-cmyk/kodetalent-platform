import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Target, ChevronRight, MessageSquare, X, Cpu, Users, Shuffle, Building2, Flame, Mic, Camera } from "lucide-react";
import { useCreateInterviewSession } from "@workspace/api-client-react";
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

  const [company, setCompany] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("Technical");
  const [difficulty, setDifficulty] = useState<Difficulty>("Standard");
  // Default new users into voice+camera; respect an explicit "false" from a prior session.
  const [voiceMode, setVoiceMode] = useState(() => localStorage.getItem("voiceMode") !== "false");
  const [cameraMode, setCameraMode] = useState(() => localStorage.getItem("cameraMode") !== "false");

  const createInterview = useCreateInterviewSession();

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

  const closeDrawers = () => {
    setInterviewDrawerOpen(false);
  };

  useEffect(() => {
    if (!interviewDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawers();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [interviewDrawerOpen]);

  return (
    <div className="pb-28 min-h-screen bg-canvas">
      <div className="bg-brand px-4 pt-6 pb-10">
        <div className="max-w-md lg:max-w-2xl mx-auto flex items-start justify-between gap-3">
          <div>
            <h1 className="text-display text-2xl font-extrabold flex items-center text-white">
              <Target className="mr-2" /> Practice
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Get ready for your real placement interviews.
            </p>
          </div>
          <button
            onClick={() => setLocation("/practice/history")}
            className="mt-1 px-3 py-1.5 rounded-full bg-white/15 text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap"
            data-testid="link-interview-history"
          >
            History
          </button>
        </div>
      </div>

      <div className="p-4 -mt-6 max-w-md lg:max-w-2xl mx-auto space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card
            className="border-0 shadow-soft rounded-2xl bg-paper cursor-pointer group"
            onClick={() => setInterviewDrawerOpen(true)}
          >
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-3">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                  AI · Personalised
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-soft flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-ink flex items-center mb-1">
                <MessageSquare className="w-5 h-5 mr-2 text-brand" />
                Mock Interview
              </h3>
              <p className="text-sm text-ink-muted">AI interviewer · Live feedback · Score report</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <AnimatePresence>
        {interviewDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60] flex items-end lg:items-center"
            onClick={closeDrawers}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full bg-paper rounded-t-3xl lg:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)] max-w-md lg:max-w-lg mx-auto flex flex-col max-h-[90dvh] lg:max-h-[85dvh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header stays put; only the form body scrolls, and the CTA
                  lives in a pinned footer below so it can never scroll out
                  of reach or collide with the bottom nav. */}
              <div className="relative flex-shrink-0 pt-4 pb-1">
                <div className="w-12 h-1.5 bg-line rounded-full mx-auto lg:hidden" />
                <button className="absolute top-4 right-6 text-ink-muted rounded-full p-1" onClick={closeDrawers}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-3 pb-4">
                {interviewDrawerOpen && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-display text-2xl font-bold text-ink mb-1">Set Up Interview</h2>
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
                        className="rounded-xl border-2 border-line focus-visible:border-brand focus-visible:ring-0 h-11 text-ink font-medium"
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
                              interviewType === type ? "border-brand bg-brand-soft" : "border-line bg-paper"
                            )}
                          >
                            <Icon className={cn("w-5 h-5 mb-1.5", interviewType === type ? "text-brand" : "text-ink")} />
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
                              difficulty === d ? "bg-brand text-white" : "bg-paper text-ink-muted"
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
                        voiceMode ? "border-brand bg-brand-soft" : "border-line bg-paper"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", voiceMode ? "bg-brand text-white" : "bg-line/60 text-ink-muted")}>
                          <Mic className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-ink">Voice Mode</div>
                          <div className="text-[11px] text-ink-muted">AI reads questions · speak your answers</div>
                        </div>
                      </div>
                      <div className={cn("w-11 h-6 rounded-full transition-colors relative flex-shrink-0", voiceMode ? "bg-brand" : "bg-line")}>
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
                        cameraMode ? "border-brand bg-brand-soft" : "border-line bg-paper"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", cameraMode ? "bg-brand text-white" : "bg-line/60 text-ink-muted")}>
                          <Camera className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-ink">Camera Mode</div>
                          <div className="text-[11px] text-ink-muted">See yourself · feels like the real thing</div>
                        </div>
                      </div>
                      <div className={cn("w-11 h-6 rounded-full transition-colors relative flex-shrink-0", cameraMode ? "bg-brand" : "bg-line")}>
                        <motion.div
                          className="absolute top-0.5 w-5 h-5 bg-paper rounded-full shadow"
                          animate={{ x: cameraMode ? 20 : 2 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 border-t border-line px-6 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                {interviewDrawerOpen && (
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      onClick={handleStartInterview}
                      disabled={createInterview.isPending}
                      className="w-full bg-brand hover:bg-brand/90 text-white font-bold h-14 rounded-full text-lg"
                    >
                      {createInterview.isPending ? "Setting up..." : voiceMode ? "🎤 Start Voice Interview →" : "Start Interview →"}
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
