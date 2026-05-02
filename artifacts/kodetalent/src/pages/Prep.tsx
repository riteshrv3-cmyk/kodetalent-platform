import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Users, Lock, ChevronRight, MessageSquare, Briefcase, X } from "lucide-react";
import { useCreateInterviewSession, useCreateTestSession } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Prep() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState<number | null>(null);
  
  const [interviewDrawerOpen, setInterviewDrawerOpen] = useState(false);
  const [testDrawerOpen, setTestDrawerOpen] = useState(false);

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
    try {
      const session = await createInterview.mutateAsync({
        data: { studentId, company: "Any", round: "Technical" }
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

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-6 min-h-screen bg-[#f5f3ff]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center text-[#1e1b4b]">
          <Target className="mr-2 text-primary" /> Prep Hub
        </h1>
        <p className="text-[#6b7280] font-medium text-sm mt-1">
          Practice with AI and get ready for the real thing.
        </p>
      </div>

      <div className="space-y-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ y: -2 }}>
          <Card className="border-0 border-t-4 border-t-primary shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl bg-white cursor-pointer group" onClick={() => setInterviewDrawerOpen(true)}>
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-3">
                <div className="bg-[#ede9fe] text-primary text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  AI-powered, personalised
                </div>
                <div className="w-8 h-8 rounded-full bg-[#f5f3ff] text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#1e1b4b] flex items-center mb-1">
                <MessageSquare className="w-5 h-5 mr-2 text-primary" />
                Mock Interview
              </h3>
              <p className="text-[14px] font-medium text-[#6b7280]">Real-time chat with an AI recruiter.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} whileHover={{ y: -2 }}>
          <Card className="border-0 border-t-4 border-t-[#06b6d4] shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl bg-white cursor-pointer group" onClick={() => setTestDrawerOpen(true)}>
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
              <p className="text-[14px] font-medium text-[#6b7280]">Aptitude and DSA tests for placements.</p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm rounded-2xl bg-[#f3f4f6] relative overflow-hidden h-36 opacity-60">
              <div className="absolute top-3 right-3 bg-[#ec4899] text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                PRO
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                <Lock className="w-6 h-6 text-[#6b7280] mb-2" />
                <h3 className="text-[14px] font-bold text-[#1e1b4b] leading-tight mb-1">Mentor Chat</h3>
                <p className="text-[10px] font-medium text-[#6b7280] leading-tight">Chat directly with seniors</p>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-0 shadow-sm rounded-2xl bg-[#f3f4f6] relative overflow-hidden h-36 opacity-60">
              <div className="absolute top-3 right-3 bg-[#ec4899] text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                PRO
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                <Lock className="w-6 h-6 text-[#6b7280] mb-2" />
                <h3 className="text-[14px] font-bold text-[#1e1b4b] leading-tight mb-1">1:1 Meeting</h3>
                <p className="text-[10px] font-medium text-[#6b7280] leading-tight">45-min video call</p>
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} whileTap={{ scale: 0.97 }}>
          <Button className="w-full text-white font-bold h-14 rounded-full text-lg shadow-[0_8px_16px_rgba(236,72,153,0.25)] mt-4 border-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
            <Lock className="w-4 h-4 mr-2 opacity-80" /> Unlock Pro (₹299/mo)
          </Button>
        </motion.div>
      </div>

      <AnimatePresence>
        {(interviewDrawerOpen || testDrawerOpen) && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#1e1b4b]/40 backdrop-blur-sm z-50"
              onClick={() => { setInterviewDrawerOpen(false); setTestDrawerOpen(false); }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 pb-safe shadow-[0_-10px_40px_rgba(124,58,237,0.15)] max-w-md mx-auto"
            >
              <div className="w-12 h-1.5 bg-[#ede9fe] rounded-full mx-auto mb-6" />
              <button className="absolute top-6 right-6 text-[#6b7280] bg-[#f5f3ff] rounded-full p-1" onClick={() => { setInterviewDrawerOpen(false); setTestDrawerOpen(false); }}>
                <X className="w-5 h-5" />
              </button>

              {interviewDrawerOpen && (
                <>
                  <h2 className="text-2xl font-bold text-[#1e1b4b] mb-2">Start Mock Interview</h2>
                  <p className="text-[#6b7280] font-medium text-[15px] mb-6">You are about to start a technical mock interview with our AI recruiter. Make sure you are in a quiet place.</p>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button onClick={handleStartInterview} disabled={createInterview.isPending} className="w-full bg-primary hover:bg-[#6d28d9] text-white font-bold h-14 rounded-full text-lg shadow-[0_8px_16px_rgba(124,58,237,0.2)]">
                      {createInterview.isPending ? "Setting up..." : "Begin Interview"}
                    </Button>
                  </motion.div>
                </>
              )}

              {testDrawerOpen && (
                <>
                  <h2 className="text-2xl font-bold text-[#1e1b4b] mb-2">Start Mock Test</h2>
                  <p className="text-[#6b7280] font-medium text-[15px] mb-6">This is a 20-minute timed MCQ test covering aptitude and logic. You cannot pause once started.</p>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button onClick={handleStartTest} disabled={createTest.isPending} className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-white font-bold h-14 rounded-full text-lg shadow-[0_8px_16px_rgba(6,182,212,0.2)]">
                      {createTest.isPending ? "Generating..." : "Start Test"}
                    </Button>
                  </motion.div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
