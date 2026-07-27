import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, ArrowRight, Share2, LayoutDashboard, ChevronRight } from "lucide-react";
import { useGetTestSession, useSubmitTest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
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
    return <div className="p-6 space-y-6 max-w-md mx-auto mt-10 min-h-screen bg-paper">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="space-y-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
      </div>
    </div>;
  }

  if (testResult) {
    return (
      <div className="p-4 pb-24 max-w-md mx-auto space-y-6 min-h-screen bg-paper">
        <div className="text-center space-y-2 mt-10 mb-10">
          <h1 className="text-[26px] font-extrabold text-ink leading-[1.06] tracking-tight">Test Complete</h1>
          <p className="text-[12px] text-ink-muted">{session.testType}</p>
          <div className="mt-8 flex justify-center">
            <div className="relative w-48 h-48 rounded-full border-[12px] border-line flex flex-col items-center justify-center bg-paper">
              <span className="text-6xl font-extrabold text-ink">{testResult.score}</span>
              <span className="text-xl font-bold text-ink-muted">/{testResult.total}</span>
              <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" style={{ left: '-12px', top: '-12px', width: 'calc(100% + 24px)', height: 'calc(100% + 24px)' }}>
                <circle cx="50%" cy="50%" r="calc(50% - 6px)" fill="transparent" stroke="#0f0f10" strokeWidth="12" strokeDasharray={`${(testResult.score/testResult.total) * 283} 300`} strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        <div className="border border-line rounded-2xl">
          <div className="p-5 space-y-5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Breakdown</h3>
            {testResult.sectionBreakdown?.map((section: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-[14px] mb-2">
                  <span className="text-ink-muted">{section.topic}</span>
                  <span className="font-bold text-ink">{section.correct}/{section.total}</span>
                </div>
                <div className="h-2.5 w-full bg-line rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(section.correct / section.total) * 100}%` }} className="h-full bg-ink" transition={{ duration: 1 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
            <Button className="w-full h-14 rounded-xl font-bold bg-ink text-paper text-[16px] hover:bg-ink" onClick={() => setLocation("/home")}>
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
    <div className="flex flex-col h-[100dvh] bg-paper max-w-md mx-auto relative overflow-hidden">
      <div className="bg-paper p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="border border-line text-ink-muted px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
            Q {currentQuestionIdx + 1} / {session.total}
          </div>
          <div className="text-ink flex items-center text-[14px] font-bold">
            <Clock className="w-4 h-4 mr-2" />
            {mins}:{secs < 10 ? '0' : ''}{secs}
          </div>
        </div>
        <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
          <motion.div className="h-full bg-ink" initial={{ width: 0 }} animate={{ width: `${((currentQuestionIdx) / session.total) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <div className="mb-6">
          <div className="border border-line rounded-2xl bg-paper mb-6">
            <div className="p-6">
              <span className="inline-block px-3 py-1 border border-line text-ink-muted text-[10px] font-bold rounded-md mb-4 uppercase tracking-wider">
                {question.topic}
              </span>
              <h2 className="text-xl font-extrabold text-ink leading-relaxed">{question.question}</h2>
            </div>
          </div>

          <div className="space-y-3">
            {question.options.map((option: string, idx: number) => {
              const isSelected = selectedAnswer === idx;
              return (
                <motion.div key={idx} whileTap={{ scale: 0.98 }}>
                  <button
                    onClick={() => handleOptionSelect(idx)}
                    className={`w-full text-left p-5 rounded-2xl border transition-colors ${
                      isSelected
                        ? "border-ink bg-line text-ink"
                        : "border-line bg-paper text-ink"
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 transition-colors ${
                        isSelected ? "border-ink bg-ink" : "border-line"
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 bg-paper rounded-full" />}
                      </div>
                      <span className="text-[15px] font-bold leading-snug">{option}</span>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 bg-paper pb-safe pt-2">
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            className={`w-full font-bold h-14 text-[16px] rounded-xl bg-ink text-paper hover:bg-ink ${selectedAnswer === undefined ? 'opacity-50' : ''}`}
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
