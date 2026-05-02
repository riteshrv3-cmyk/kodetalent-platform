import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Target, ChevronRight, MessageSquare, Briefcase, X, Cpu, Users, Shuffle, Building2, Flame, Mic } from "lucide-react";
import { useCreateInterviewSession, useCreateTestSession } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InterviewType = "Technical" | "Behavioral" | "Mixed";
type Difficulty = "Standard" | "Challenging";

const INTERVIEW_TYPES: { type: InterviewType; icon: React.ElementType; label: string; desc: string; color: string }[] = [
  { type: "Technical", icon: Cpu, label: "Technical", desc: "DSA, system design, CS fundamentals", color: "#7c3aed" },
  { type: "Behavioral", icon: Users, label: "Behavioral", desc: "STAR-method, leadership, teamwork", color: "#06b6d4" },
  { type: "Mixed", icon: Shuffle, label: "Mixed", desc: "Both technical + HR questions", color: "#10b981" },
];

export default function Prep() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState<number | null>(null);

  const [interviewDrawerOpen, setInterviewDrawerOpen] = useState(false);
  const [testDrawerOpen, setTestDrawerOpen] = useState(false);

  const [company, setCompany] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("Technical");
  const [difficulty, setDifficulty] = useState<Difficulty>("Standard");
  const [voiceMode, setVoiceMode] = useState(false);

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

  const handleStartInterview = async () => {
    if (!studentId) return;
    const targetCompany = company.trim() || "Any Tech Company";
    const round = `${interviewType}|${difficulty}`;
    localStorage.setItem("voiceMode", voiceMode ? "true" : "false");
    try {
      const session = await createInterview.mutateAsync({
        data: { studentId, company: targetCompany, round }
      });
      setLocation(`/prep/interview/${session.id}`);
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
      setLocation(`/prep/test/${session.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const closeDrawers = () => {
    setInterviewDrawerOpen(false);
    setTestDrawerOpen(false);
  };

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-4 min-h-screen bg-[#f5f3ff]">
      <div className="pt-2 mb-2">
        <h1 className="text-2xl font-bold flex items-center text-[#1e1b4b]">
          <Target className="mr-2 text-primary" /> Practice
        </h1>
        <p className="text-sm font-medium text-[#6b7280] mt-1">
          Get ready for your real placement interviews.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ y: -2 }}>
        <Card
          className="border-0 border-t-4 border-t-primary shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl bg-white cursor-pointer group"
          onClick={() => setInterviewDrawerOpen(true)}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-3">
              <div className="bg-[#ede9fe] text-primary text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                AI · Personalised
              </div>
              <div className="w-8 h-8 rounded-full bg-[#f5f3ff] text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-[#1e1b4b] flex items-center mb-1">
              <MessageSquare className="w-5 h-5 mr-2 text-primary" />
              Mock Interview
            </h3>
            <p className="text-sm font-medium text-[#6b7280]">AI interviewer · Live feedback · Score report</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileHover={{ y: -2 }}>
        <Card
          className="border-0 border-t-4 border-t-[#06b6d4] shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl bg-white cursor-pointer group"
          onClick={() => setTestDrawerOpen(true)}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-3">
              <div className="bg-[#06b6d4]/10 text-[#06b6d4] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                20-min timed MCQ
              </div>
              <div className="w-8 h-8 rounded-full bg-[#f5f3ff] text-[#06b6d4] flex items-center justify-center group-hover:bg-[#06b6d4] group-hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-[#1e1b4b] flex items-center mb-1">
              <Briefcase className="w-5 h-5 mr-2 text-[#06b6d4]" />
              Mock Test
            </h3>
            <p className="text-sm font-medium text-[#6b7280]">Aptitude and reasoning — just like campus drives.</p>
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
              className="fixed inset-0 bg-[#1e1b4b]/40 backdrop-blur-sm z-50"
              onClick={closeDrawers}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 shadow-[0_-10px_40px_rgba(124,58,237,0.15)] max-w-md mx-auto overflow-y-auto max-h-[90vh]"
            >
              <div className="p-6 pb-8">
                <div className="w-12 h-1.5 bg-[#ede9fe] rounded-full mx-auto mb-5" />
                <button className="absolute top-6 right-6 text-[#6b7280] bg-[#f5f3ff] rounded-full p-1" onClick={closeDrawers}>
                  <X className="w-5 h-5" />
                </button>

                {interviewDrawerOpen && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1e1b4b] mb-1">Set Up Interview</h2>
                      <p className="text-[#6b7280] text-sm font-medium">Configure your practice session</p>
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-[#6b7280] uppercase tracking-wider mb-2 block">
                        <Building2 className="w-3 h-3 inline mr-1" /> Target Company
                      </label>
                      <Input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Google, TCS, Infosys..."
                        className="rounded-xl border-2 border-[#ede9fe] focus-visible:ring-primary focus-visible:border-primary h-11 text-[#1e1b4b] font-medium"
                      />
                      <p className="text-xs text-[#6b7280] mt-1 ml-1">Leave blank for a general interview</p>
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-[#6b7280] uppercase tracking-wider mb-2 block">Interview Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {INTERVIEW_TYPES.map(({ type, icon: Icon, label, desc, color }) => (
                          <button
                            key={type}
                            onClick={() => setInterviewType(type)}
                            className={cn(
                              "rounded-2xl border-2 p-3 text-left transition-all",
                              interviewType === type
                                ? "border-primary bg-[#f5f3ff] shadow-[0_0_0_3px_rgba(124,58,237,0.15)]"
                                : "border-[#e5e7eb] bg-white hover:border-[#ede9fe]"
                            )}
                          >
                            <Icon className="w-5 h-5 mb-1.5" style={{ color: interviewType === type ? color : "#9ca3af" }} />
                            <div className="text-[12px] font-bold text-[#1e1b4b] leading-tight">{label}</div>
                            <div className="text-[10px] text-[#6b7280] mt-0.5 leading-tight">{desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-[#6b7280] uppercase tracking-wider mb-2 block">
                        <Flame className="w-3 h-3 inline mr-1" /> Difficulty
                      </label>
                      <div className="flex rounded-xl border-2 border-[#ede9fe] overflow-hidden">
                        {(["Standard", "Challenging"] as Difficulty[]).map((d) => (
                          <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={cn(
                              "flex-1 py-2.5 text-sm font-bold transition-colors",
                              difficulty === d ? "bg-primary text-white" : "bg-white text-[#6b7280] hover:bg-[#f5f3ff]"
                            )}
                          >
                            {d === "Challenging" ? "🔥 " : ""}{d}
                          </button>
                        ))}
                      </div>
                      {difficulty === "Challenging" && (
                        <p className="text-xs text-[#f97316] font-bold mt-1 ml-1">Aggressive follow-ups, high pressure mode</p>
                      )}
                    </div>

                    <button
                      onClick={() => setVoiceMode(!voiceMode)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all",
                        voiceMode
                          ? "border-primary bg-[#f5f3ff] shadow-[0_0_0_3px_rgba(124,58,237,0.12)]"
                          : "border-[#e5e7eb] bg-white hover:border-[#ede9fe]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", voiceMode ? "bg-primary text-white" : "bg-[#f3f4f6] text-[#6b7280]")}>
                          <Mic className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-[#1e1b4b]">Voice Mode</div>
                          <div className="text-[11px] text-[#6b7280]">AI reads questions · speak your answers</div>
                        </div>
                      </div>
                      <div className={cn("w-11 h-6 rounded-full transition-colors relative flex-shrink-0", voiceMode ? "bg-primary" : "bg-[#d1d5db]")}>
                        <motion.div
                          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                          animate={{ x: voiceMode ? 20 : 2 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                      </div>
                    </button>

                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button
                        onClick={handleStartInterview}
                        disabled={createInterview.isPending}
                        className="w-full bg-primary hover:bg-[#6d28d9] text-white font-bold h-14 rounded-full text-lg shadow-[0_8px_16px_rgba(124,58,237,0.2)]"
                      >
                        {createInterview.isPending ? "Setting up..." : voiceMode ? "🎤 Start Voice Interview →" : "Start Interview →"}
                      </Button>
                    </motion.div>
                  </div>
                )}

                {testDrawerOpen && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-[#1e1b4b] mb-2">Start Mock Test</h2>
                    <p className="text-[#6b7280] font-medium text-[15px]">A 20-minute timed aptitude test — just like your campus placement rounds. You can't pause once it starts.</p>
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button
                        onClick={handleStartTest}
                        disabled={createTest.isPending}
                        className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-white font-bold h-14 rounded-full text-lg shadow-[0_8px_16px_rgba(6,182,212,0.2)]"
                      >
                        {createTest.isPending ? "Generating questions..." : "Start Test →"}
                      </Button>
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
