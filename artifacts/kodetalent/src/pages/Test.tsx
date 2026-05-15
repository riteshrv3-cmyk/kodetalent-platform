import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, ArrowRight, Share2, LayoutDashboard, ChevronRight } from "lucide-react";
import { useGetTestSession, useSubmitTest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function Test() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const sessionId = parseInt(id || "0", 10);
  
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, isLoading } = useGetTestSession(sessionId, {
    query: { enabled: !!sessionId } as any
  });

  const submitTest = useSubmitTest();

  useEffect(() => {
    if (session?.completed && session.score !== null && !testResult) {
      setLocation("/practice");
    }
  }, [session, setLocation, testResult]);

  useEffect(() => {
    if (isLoading || testResult) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishTest(answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoading, testResult, answers]);

  const handleOptionSelect = (optionIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIdx] = optionIdx;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (!session) return;
    if (currentQuestionIdx < session.total - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      handleFinishTest(answers);
    }
  };

  const handleFinishTest = async (finalAnswers: number[]) => {
    setIsSubmitting(true);
    try {
      const result = await submitTest.mutateAsync({
        id: sessionId,
        data: { answers: finalAnswers }
      });
      setTestResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !session) {
    return <div className="p-6 space-y-6 max-w-md mx-auto mt-10 min-h-screen bg-white">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="space-y-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
      </div>
    </div>;
  }

  if (testResult) {
    return (
      <div className="p-4 pb-24 max-w-md mx-auto space-y-6 min-h-screen bg-[#f8fafc]">
        <div className="text-center space-y-2 mt-10 mb-10">
          <h1 className="text-3xl font-extrabold text-[#0f172a]">Test Complete</h1>
          <p className="text-[#64748b] font-bold">{session.testType}</p>
          <div className="mt-8 flex justify-center">
            <div className="relative w-48 h-48 rounded-full border-[12px] border-[#e0e7ff] flex flex-col items-center justify-center bg-white shadow-[0_10px_40px_rgba(124,58,237,0.15)]">
              <span className="text-6xl font-black text-primary">{testResult.score}</span>
              <span className="text-xl font-bold text-[#64748b]">/{testResult.total}</span>
              <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" style={{ left: '-12px', top: '-12px', width: 'calc(100% + 24px)', height: 'calc(100% + 24px)' }}>
                <circle cx="50%" cy="50%" r="calc(50% - 6px)" fill="transparent" stroke="#4f46e5" strokeWidth="12" strokeDasharray={`${(testResult.score/testResult.total) * 283} 300`} strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.05)] rounded-2xl bg-white">
          <CardContent className="p-5 space-y-5">
            <h3 className="font-extrabold text-[#0f172a] text-lg">Breakdown</h3>
            {testResult.sectionBreakdown?.map((section: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-[#64748b]">{section.topic}</span>
                  <span className="font-extrabold text-[#0f172a]">{section.correct}/{section.total}</span>
                </div>
                <div className="h-2.5 w-full bg-[#e0e7ff] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(section.correct / section.total) * 100}%` }} className="h-full bg-primary" transition={{ duration: 1 }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-4 pt-4">
          <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
            <Button className="w-full h-14 rounded-full font-bold bg-primary text-white text-lg shadow-[0_8px_16px_rgba(124,58,237,0.2)]" onClick={() => setLocation("/home")}>
              Done
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  const question = session.questions[currentQuestionIdx];
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isLastQuestion = currentQuestionIdx === session.total - 1;
  const selectedAnswer = answers[currentQuestionIdx];

  return (
    <div className="flex flex-col h-[100dvh] bg-white max-w-md mx-auto relative overflow-hidden">
      <div className="bg-white p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="bg-[#e0e7ff] text-primary px-3 py-1 rounded-full text-xs font-extrabold">
            Q {currentQuestionIdx + 1} / {session.total}
          </div>
          <div className="bg-primary text-white flex items-center text-sm font-extrabold px-4 py-1.5 rounded-full shadow-sm">
            <Clock className="w-4 h-4 mr-2" />
            {mins}:{secs < 10 ? '0' : ''}{secs}
          </div>
        </div>
        <div className="h-1.5 w-full bg-[#e0e7ff] rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${((currentQuestionIdx) / session.total) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <div className="mb-6">
          <Card className="border-0 shadow-[0_8px_30px_rgba(124,58,237,0.08)] rounded-2xl bg-white mb-6">
            <CardContent className="p-6">
              <span className="inline-block px-3 py-1 bg-[#f8fafc] text-primary text-[10px] font-extrabold rounded-md mb-4 uppercase tracking-wider">
                {question.topic}
              </span>
              <h2 className="text-xl font-extrabold text-[#0f172a] leading-relaxed">{question.question}</h2>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {question.options.map((option: string, idx: number) => {
              const isSelected = selectedAnswer === idx;
              return (
                <motion.div key={idx} whileTap={{ scale: 0.98 }}>
                  <button
                    onClick={() => handleOptionSelect(idx)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                      isSelected 
                        ? "border-primary bg-[#f8fafc] shadow-[0_4px_12px_rgba(124,58,237,0.1)]" 
                        : "border-[#e0e7ff] bg-white text-[#64748b] hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 transition-colors ${
                        isSelected ? "border-primary bg-primary" : "border-[#64748b]/40"
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>
                      <span className={`text-[15px] font-bold leading-snug ${isSelected ? "text-[#0f172a]" : ""}`}>{option}</span>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 bg-white pb-safe pt-2">
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button 
            className={`w-full font-bold h-14 text-lg rounded-full shadow-[0_8px_16px_rgba(124,58,237,0.2)] ${selectedAnswer === undefined ? 'opacity-50' : ''}`}
            onClick={handleNext}
            disabled={selectedAnswer === undefined || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : isLastQuestion ? "Submit Test" : (
              <>Next <ChevronRight className="w-5 h-5 ml-1" /></>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
