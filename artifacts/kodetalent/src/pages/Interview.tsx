import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, RefreshCw, Share2 } from "lucide-react";
import { useGetNextInterviewQuestion, useEvaluateInterview, useGetInterviewSession } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

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
        fetchNextQuestion("Start interview");
      }
    } else if (session?.completed) {
      setIsFinished(true);
    }
  }, [session]);

  const fetchNextQuestion = async (answer: string) => {
    setIsTyping(true);
    try {
      const res = await getNextQuestion.mutateAsync({ id: sessionId, data: { answer } });
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
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: "bot", text: "Error. Please try again." }]);
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
    return <div className="p-4 flex justify-center items-center h-screen bg-white font-bold text-primary">Loading...</div>;
  }

  if (isFinished && session) {
    return (
      <div className="p-4 pb-24 max-w-md mx-auto space-y-6 min-h-screen bg-[#f5f3ff]">
        <Button variant="ghost" onClick={() => setLocation("/prep")} className="mb-2 -ml-2 text-[#6b7280] font-bold">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        
        <div className="text-center space-y-2 mb-8 mt-4">
          <h1 className="text-3xl font-extrabold text-[#1e1b4b]">Results</h1>
          <p className="text-[#6b7280] font-bold">Technical Interview</p>
          <div className="mt-8 text-[80px] font-black text-primary leading-none drop-shadow-sm">
            {session.overallScore || 85}
          </div>
          <p className="text-sm font-extrabold text-primary uppercase tracking-widest mt-2">Overall Score</p>
        </div>

        <div className="space-y-3">
          <Card className="border-0 border-l-4 border-l-[#10b981] shadow-[0_4px_24px_rgba(124,58,237,0.05)] rounded-2xl bg-white">
            <CardContent className="p-5">
              <h3 className="text-[15px] font-bold text-[#10b981] mb-1">Strong Point</h3>
              <p className="text-sm font-medium text-[#6b7280]">Good clarity and communication.</p>
            </CardContent>
          </Card>
          <Card className="border-0 border-l-4 border-l-[#f97316] shadow-[0_4px_24px_rgba(124,58,237,0.05)] rounded-2xl bg-white">
            <CardContent className="p-5">
              <h3 className="text-[15px] font-bold text-[#f97316] mb-1">Improvement</h3>
              <p className="text-sm font-medium text-[#6b7280]">Structure your answers better.</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 pt-6">
          <Button variant="outline" className="flex-1 rounded-full h-12 font-bold border-primary text-primary" onClick={() => setLocation("/prep")}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
          <Button className="flex-1 rounded-full h-12 font-bold bg-primary text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)]">
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>
      </div>
    );
  }

  const progressPercent = (questionCount / maxQuestions) * 100;

  return (
    <div className="flex flex-col h-[100dvh] bg-white max-w-md mx-auto relative overflow-hidden">
      <div className="bg-white p-4 sticky top-0 z-10 shadow-[0_4px_24px_rgba(124,58,237,0.05)]">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" className="-ml-2 text-[#1e1b4b]" onClick={() => setLocation("/prep")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-extrabold text-lg text-[#1e1b4b]">Mock Interview</h1>
          <div className="w-10" />
        </div>
        <div className="h-2 w-full bg-[#ede9fe] rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.5 }} />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-5 py-4 text-[15px] font-medium shadow-[0_4px_24px_rgba(124,58,237,0.08)] ${msg.sender === "user" ? "bg-primary text-white rounded-3xl rounded-tr-none" : "bg-white text-[#1e1b4b] rounded-3xl rounded-tl-none border-l-4 border-[#7c3aed]"}`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-white border-l-4 border-[#7c3aed] rounded-3xl rounded-tl-none px-5 py-5 flex space-x-1.5 shadow-[0_4px_24px_rgba(124,58,237,0.08)]">
                <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pb-safe z-20">
        <form onSubmit={handleSubmit} className="flex space-x-2 max-w-md mx-auto relative">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your answer..."
            disabled={isTyping}
            className="flex-1 rounded-2xl bg-white border-2 border-[#ede9fe] focus-visible:ring-primary focus-visible:border-primary h-[60px] px-5 text-[15px] shadow-sm pr-16 text-[#1e1b4b] font-medium"
          />
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button type="submit" disabled={!inputValue.trim() || isTyping} className="absolute right-2 top-2 h-11 w-11 rounded-xl bg-primary text-white shadow-md">
              <Send className="w-5 h-5 ml-0.5" />
            </Button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
