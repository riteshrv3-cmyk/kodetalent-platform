import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, ArrowRight, Share2, LayoutDashboard } from "lucide-react";
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
  const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const { data: session, isLoading } = useGetTestSession(sessionId, {
    query: { enabled: !!sessionId }
  });

  const submitTest = useSubmitTest();

  useEffect(() => {
    if (session?.completed && session.score !== null && !testResult) {
      // If already completed, ideally we fetch the result. 
      // For mockup, we just redirect back to prep
      setLocation("/prep");
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

  if (isLoading) {
    return <div className="p-4 space-y-4 max-w-md mx-auto mt-10">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>;
  }

  if (!session) return null;

  if (testResult) {
    return (
      <div className="p-4 pb-24 max-w-md mx-auto space-y-6 min-h-screen bg-background">
        <div className="text-center space-y-2 mt-8 mb-8">
          <h1 className="text-2xl font-bold">Test Results</h1>
          <p className="text-muted-foreground">{session.testType} • {session.difficulty}</p>
          
          <div className="mt-8 mb-4">
            <div className="text-6xl font-black text-foreground">
              {testResult.score}<span className="text-3xl text-muted-foreground">/{testResult.total}</span>
            </div>
            <p className="text-sm font-bold mt-2 text-secondary">{testResult.percentage}% Score</p>
          </div>
        </div>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold border-b border-border pb-2">Section Breakdown</h3>
            {testResult.sectionBreakdown?.map((section: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-muted-foreground">{section.topic}</span>
                  <span className="font-bold">{section.correct}/{section.total}</span>
                </div>
                <Progress value={(section.correct / section.total) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {testResult.weakTopics?.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-destructive">Needs Improvement</h3>
                <p className="text-sm text-muted-foreground mt-1">Focus on: {testResult.weakTopics.join(", ")}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4 pt-4">
          <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => setLocation("/dashboard")}>
            <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <Button variant="outline" className="flex-1 bg-card">
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>
      </div>
    );
  }

  const question = session.questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx) / session.total) * 100;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isLastQuestion = currentQuestionIdx === session.total - 1;
  const selectedAnswer = answers[currentQuestionIdx];

  return (
    <div className="flex flex-col h-[100dvh] bg-background max-w-md mx-auto relative">
      <div className="p-4 border-b border-border bg-card sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Question {currentQuestionIdx + 1} of {session.total}
          </div>
          <div className={`flex items-center text-sm font-bold px-3 py-1 rounded-full ${timeLeft < 300 ? 'bg-destructive/20 text-destructive' : 'bg-primary/10 text-primary'}`}>
            <Clock className="w-4 h-4 mr-1.5" />
            {mins}:{secs < 10 ? '0' : ''}{secs}
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <div className="mb-6">
          <span className="inline-block px-2 py-1 bg-accent/10 text-accent text-[10px] font-bold rounded mb-3 border border-accent/20">
            {question.topic}
          </span>
          <h2 className="text-xl font-bold leading-snug">{question.question}</h2>
        </div>

        <div className="space-y-3 mt-auto mb-8">
          {question.options.map((option: string, idx: number) => {
            const isSelected = selectedAnswer === idx;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <button
                  onClick={() => handleOptionSelect(idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? "border-primary bg-primary/10 text-foreground font-medium" 
                      : "border-border bg-card/50 text-muted-foreground hover:border-primary/50 hover:bg-card"
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 shrink-0 ${
                      isSelected ? "border-primary" : "border-muted-foreground"
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                    </div>
                    <span className="leading-snug text-sm">{option}</span>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="p-4 bg-background border-t border-border pb-safe">
        <Button 
          className="w-full font-bold h-12 text-lg bg-primary hover:bg-primary/90 text-primary-foreground" 
          onClick={handleNext}
          disabled={selectedAnswer === undefined || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : isLastQuestion ? "Submit Test" : (
            <>Next Question <ArrowRight className="w-5 h-5 ml-2" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
