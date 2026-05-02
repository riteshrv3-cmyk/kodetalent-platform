import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Mic, Share2, RefreshCw } from "lucide-react";
import { useGetNextInterviewQuestion, useEvaluateInterview, useGetInterviewSession } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Message = {
  id: string;
  sender: "bot" | "user";
  text: string;
};

export default function Interview() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const sessionId = parseInt(id || "0", 10);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const maxQuestions = 5;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading: sessionLoading } = useGetInterviewSession(sessionId, {
    query: { enabled: !!sessionId }
  });

  const getNextQuestion = useGetNextInterviewQuestion();
  const evaluateInterview = useEvaluateInterview();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (session && messages.length === 0 && !session.completed) {
      if (session.currentQuestion) {
        setMessages([{ id: Date.now().toString(), sender: "bot", text: session.currentQuestion }]);
        setQuestionCount(session.questionNumber);
      } else {
        // Kick off first question
        fetchNextQuestion("Start interview");
      }
    } else if (session?.completed) {
      setIsFinished(true);
    }
  }, [session]);

  const fetchNextQuestion = async (answer: string) => {
    setIsTyping(true);
    try {
      const res = await getNextQuestion.mutateAsync({
        id: sessionId,
        data: { answer }
      });
      
      setIsTyping(false);
      
      if (res.completed) {
        handleComplete();
      } else if (res.question) {
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text: res.question! }]);
        setQuestionCount(res.questionNumber);
      }
    } catch (e) {
      console.error(e);
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text: "Sorry, I had trouble generating the next question. Please try answering again." }]);
    }
  };

  const handleComplete = async () => {
    setIsTyping(true);
    try {
      await evaluateInterview.mutateAsync({ id: sessionId });
      setIsFinished(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const answer = inputValue;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: "user", text: answer }]);
    setInputValue("");
    
    fetchNextQuestion(answer);
  };

  if (sessionLoading) {
    return <div className="p-4 flex justify-center items-center h-screen">Loading interview...</div>;
  }

  if (isFinished && session) {
    // Show results
    // In a real app we'd fetch the evaluation details if not in session object,
    // assuming it's available or we can re-fetch
    return (
      <div className="p-4 pb-24 max-w-md mx-auto space-y-6 min-h-screen bg-background">
        <Button variant="ghost" onClick={() => setLocation("/prep")} className="mb-2 -ml-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Prep Hub
        </Button>
        
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold">Interview Results</h1>
          <p className="text-muted-foreground">{session.company} • {session.round} Round</p>
          
          <div className="mt-6 inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-primary/20 relative">
            <div className="text-4xl font-black text-primary">{session.overallScore || 85}</div>
            <div className="absolute -bottom-3 bg-background px-2 text-xs font-bold text-muted-foreground uppercase">Score</div>
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle cx="50%" cy="50%" r="46%" fill="transparent" stroke="hsl(var(--primary))" strokeWidth="8%" strokeDasharray={`${(session.overallScore || 85) * 2.89} 300`} strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Communication</span>
                  <span className="font-bold">82%</span>
                </div>
                <Progress value={82} className="h-2" indicatorClassName="bg-blue-500" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Technical Depth</span>
                  <span className="font-bold">88%</span>
                </div>
                <Progress value={88} className="h-2" indicatorClassName="bg-purple-500" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Confidence</span>
                  <span className="font-bold">75%</span>
                </div>
                <Progress value={75} className="h-2" indicatorClassName="bg-amber-500" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-secondary/30 bg-secondary/5">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-secondary mb-1 flex items-center">
                  Strong Point
                </h3>
                <p className="text-sm text-muted-foreground">Clear explanation of technical concepts with good examples.</p>
              </CardContent>
            </Card>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-destructive mb-1 flex items-center">
                  Weak Point
                </h3>
                <p className="text-sm text-muted-foreground">Tended to rush answers without structuring them first.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button variant="outline" className="flex-1 bg-card" onClick={() => setLocation("/prep")}>
            <RefreshCw className="w-4 h-4 mr-2" /> Practice Again
          </Button>
          <Button className="flex-1 bg-primary text-primary-foreground">
            <Share2 className="w-4 h-4 mr-2" /> Share Result
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <div className="bg-card border-b border-border p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="-ml-2 mr-2" onClick={() => setLocation("/prep")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-base leading-tight">AI Recruiter</h1>
            <p className="text-xs text-muted-foreground">{session?.company} • {session?.round}</p>
          </div>
        </div>
        <div className="text-xs font-bold bg-primary/20 text-primary px-2 py-1 rounded">
          Q {questionCount}/{maxQuestions}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "bot" && (
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mr-2 mt-auto font-bold text-xs">
                  AI
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.sender === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-card text-card-foreground border border-border rounded-bl-none shadow-sm"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mr-2 mt-auto font-bold text-xs">
                AI
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-none px-4 py-4 flex space-x-1 shadow-sm h-10 items-center">
                <motion.div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                <motion.div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                <motion.div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-safe">
        <form onSubmit={handleSubmit} className="flex space-x-2 max-w-md mx-auto items-end">
          <Button type="button" variant="outline" size="icon" className="shrink-0 h-[44px] w-[44px] rounded-full border-border bg-card">
            <Mic className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your answer..."
            disabled={isTyping}
            className="flex-1 rounded-3xl bg-card border-border focus-visible:ring-primary h-[44px]"
          />
          <Button type="submit" disabled={!inputValue.trim() || isTyping} className="shrink-0 h-[44px] w-[44px] rounded-full bg-primary text-primary-foreground">
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
