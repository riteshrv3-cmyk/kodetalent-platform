import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, RefreshCw, Share2, Clock, ChevronDown, ChevronUp, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useGetNextInterviewQuestion, useEvaluateInterview, useGetInterviewSession } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Message = { id: string; sender: "bot" | "user"; text: string };

type EvalData = {
  overallScore: number;
  communicationScore: number;
  technicalScore: number;
  confidenceScore: number;
  overallRating: string;
  weakPoint: string;
  strongPoint: string;
  questionFeedback: Array<{ question: string; studentAnswer: string; betterAnswer: string; score: number }>;
};

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function stripMarkdown(text: string) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1");
}

function ScoreRing({ score, max, label, color }: { score: number; max: number; label: string; color: string }) {
  const pct = Math.round((score / max) * 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#ede9fe" strokeWidth="6" />
          <motion.circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (pct / 100) * circ }} transition={{ duration: 1, delay: 0.3 }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-black text-[#1e1b4b]">{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wide">{label}</span>
    </div>
  );
}

export default function Interview() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const sessionId = parseInt(id || "0", 10);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [evalData, setEvalData] = useState<EvalData | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);
  const maxQuestions = 5;

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimesRef = useRef<number[]>([]);

  // Voice mode
  const [voiceMode, setVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceModeRef = useRef(false);
  const isTypingRef = useRef(false);
  const timerSecondsRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading: sessionLoading } = useGetInterviewSession(sessionId, {
    query: { enabled: !!sessionId }
  });
  const getNextQuestion = useGetNextInterviewQuestion();
  const evaluateInterview = useEvaluateInterview();

  // Sync refs
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { isTypingRef.current = isTyping; }, [isTyping]);
  useEffect(() => { timerSecondsRef.current = timerSeconds; }, [timerSeconds]);

  // Load voice mode from localStorage
  useEffect(() => {
    const vm = localStorage.getItem("voiceMode") === "true";
    setVoiceMode(vm);
    voiceModeRef.current = vm;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Timer: start when bot finishes a message
  useEffect(() => {
    if (!isTyping && messages.length > 0 && !isFinished) {
      const last = messages[messages.length - 1];
      if (last?.sender === "bot") {
        setTimerSeconds(0);
        setTimerRunning(true);
      }
    }
  }, [isTyping, messages, isFinished]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  // TTS: speak new bot messages in voice mode
  useEffect(() => {
    if (!voiceMode || isTyping || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last?.sender === "bot") speakText(last.text);
  }, [messages, isTyping, voiceMode]);

  const speakText = useCallback((text: string) => {
    if (!voiceModeRef.current || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = stripMarkdown(text);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.88;
    utterance.pitch = 1.05;
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const pick = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"))
        || voices.find(v => v.lang === "en-IN")
        || voices.find(v => v.lang.startsWith("en-GB"))
        || voices.find(v => v.lang.startsWith("en-"));
      if (pick) utterance.voice = pick;
    };
    setVoice();
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  // Session load
  useEffect(() => {
    if (session && messages.length === 0 && !session.completed) {
      if (session.currentQuestion) {
        setMessages([{ id: Date.now().toString(), sender: "bot", text: session.currentQuestion }]);
        setQuestionCount(session.questionNumber);
      } else {
        fetchNextQuestion("Start interview");
      }
    } else if (session?.completed) {
      if (session.evaluation) setEvalData(session.evaluation as EvalData);
      setIsFinished(true);
    }
  }, [session]);

  // Core submit logic (shared by text & voice)
  const submitAnswer = useCallback((text: string) => {
    if (!text.trim() || isTypingRef.current) return;
    questionTimesRef.current.push(timerSecondsRef.current);
    setTimerRunning(false);
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: "user", text }]);
    setInputValue("");
    fetchNextQuestion(text);
  }, []);

  const fetchNextQuestion = async (answer: string) => {
    stopSpeaking();
    setIsTyping(true);
    setTimerRunning(false);
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
    stopSpeaking();
    setIsTyping(true);
    setTimerRunning(false);
    try {
      const result = await evaluateInterview.mutateAsync({ id: sessionId });
      setEvalData(result as EvalData);
      setIsFinished(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;
    submitAnswer(inputValue);
  };

  // Voice recording
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
      return;
    }

    stopSpeaking();

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice recognition is not supported in this browser. Try Chrome on Android or desktop.");
      return;
    }

    const recognition = new SR();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let latestFinal = "";

    recognition.onstart = () => {
      setIsRecording(true);
      setInputValue("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      latestFinal = final || latestFinal;
      setInputValue(latestFinal || interim);

      if (latestFinal) {
        if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = setTimeout(() => {
          if (latestFinal.trim()) submitAnswer(latestFinal.trim());
        }, 1400);
      }
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (!latestFinal && !autoSubmitTimerRef.current) {
        // no speech detected
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleVoiceMode = () => {
    const next = !voiceMode;
    setVoiceMode(next);
    voiceModeRef.current = next;
    localStorage.setItem("voiceMode", next ? "true" : "false");
    if (!next) stopSpeaking();
  };

  const timerColor = timerSeconds < 120 ? "#10b981" : timerSeconds < 240 ? "#f97316" : "#ef4444";

  // ─── Results screen ───────────────────────────────────────────────────────────
  if (sessionLoading) {
    return <div className="p-4 flex justify-center items-center h-screen bg-white font-bold text-primary">Loading...</div>;
  }

  if (isFinished) {
    const times = questionTimesRef.current;
    const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const fastest = times.length ? Math.min(...times) : 0;
    const slowest = times.length ? Math.max(...times) : 0;
    const ratingColor = !evalData?.overallRating ? "#7c3aed"
      : evalData.overallRating.includes("Strong") ? "#10b981"
      : evalData.overallRating.includes("No") ? "#ef4444"
      : evalData.overallRating.includes("Lean") ? "#f97316"
      : "#7c3aed";
    const interviewTypeLabel = session?.interviewType || "Technical";

    return (
      <div className="p-4 pb-24 max-w-md mx-auto space-y-5 min-h-screen bg-[#f5f3ff]">
        <Button variant="ghost" onClick={() => setLocation("/prep")} className="mb-2 -ml-2 text-[#6b7280] font-bold">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold text-[#1e1b4b]">Interview Complete</h1>
          <p className="text-[#6b7280] font-bold">{interviewTypeLabel} · {session?.company}</p>
        </div>

        <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.12)] rounded-3xl bg-white overflow-hidden">
          <div className="h-2 w-full" style={{ background: "linear-gradient(90deg,#7c3aed,#ec4899)" }} />
          <CardContent className="p-6 text-center">
            <div className="text-[80px] font-black leading-none mb-1" style={{ color: ratingColor }}>
              {evalData?.overallScore ?? 85}
            </div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#6b7280] mb-3">Overall Score</p>
            {evalData?.overallRating && (
              <span className="px-4 py-1.5 rounded-full text-sm font-bold text-white" style={{ background: ratingColor }}>
                {evalData.overallRating}
              </span>
            )}
          </CardContent>
        </Card>

        {evalData && (
          <Card className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#6b7280] mb-4">Category Scores</p>
              <div className="flex justify-around">
                <ScoreRing score={evalData.communicationScore} max={10} label="Comms" color="#7c3aed" />
                <ScoreRing score={evalData.technicalScore} max={10} label="Technical" color="#06b6d4" />
                <ScoreRing score={evalData.confidenceScore} max={10} label="Confidence" color="#10b981" />
              </div>
            </CardContent>
          </Card>
        )}

        {evalData && (
          <div className="space-y-3">
            <Card className="border-0 border-l-4 border-l-[#10b981] shadow-sm rounded-2xl bg-white">
              <CardContent className="p-4">
                <p className="text-[11px] font-extrabold text-[#10b981] uppercase tracking-wider mb-1">💪 Strength</p>
                <p className="text-sm font-medium text-[#1e1b4b]">{evalData.strongPoint}</p>
              </CardContent>
            </Card>
            <Card className="border-0 border-l-4 border-l-[#f97316] shadow-sm rounded-2xl bg-white">
              <CardContent className="p-4">
                <p className="text-[11px] font-extrabold text-[#f97316] uppercase tracking-wider mb-1">⚡ Improve</p>
                <p className="text-sm font-medium text-[#1e1b4b]">{evalData.weakPoint}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {times.length > 0 && (
          <Card className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-4">
              <p className="text-[11px] font-extrabold text-[#6b7280] uppercase tracking-wider mb-3">⏱ Response Times</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-lg font-black text-[#1e1b4b]">{formatTime(avg)}</div><div className="text-[10px] font-bold text-[#6b7280]">Average</div></div>
                <div><div className="text-lg font-black text-[#10b981]">{formatTime(fastest)}</div><div className="text-[10px] font-bold text-[#6b7280]">Fastest</div></div>
                <div><div className="text-lg font-black text-[#f97316]">{formatTime(slowest)}</div><div className="text-[10px] font-bold text-[#6b7280]">Slowest</div></div>
              </div>
            </CardContent>
          </Card>
        )}

        {evalData?.questionFeedback && evalData.questionFeedback.length > 0 && (
          <div>
            <p className="text-[11px] font-extrabold text-[#6b7280] uppercase tracking-wider mb-2 px-1">Q&A Review</p>
            <div className="space-y-2">
              {evalData.questionFeedback.map((qf, i) => (
                <Card key={i} className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
                  <button className="w-full p-4 text-left flex justify-between items-center"
                    onClick={() => setExpandedFeedback(expandedFeedback === i ? null : i)}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={cn("w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center flex-shrink-0",
                        qf.score >= 8 ? "bg-[#10b981]" : qf.score >= 5 ? "bg-[#f97316]" : "bg-[#ef4444]")}>
                        {qf.score}
                      </span>
                      <span className="text-sm font-bold text-[#1e1b4b] truncate">Q{i + 1}: {qf.question.slice(0, 50)}{qf.question.length > 50 ? "…" : ""}</span>
                    </div>
                    {expandedFeedback === i ? <ChevronUp className="w-4 h-4 text-[#6b7280] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#6b7280] flex-shrink-0" />}
                  </button>
                  <AnimatePresence>
                    {expandedFeedback === i && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-3 border-t border-[#f3f4f6] pt-3">
                          <div>
                            <p className="text-[10px] font-extrabold text-[#6b7280] uppercase tracking-wider mb-1">Your Answer</p>
                            <p className="text-sm text-[#1e1b4b]">{qf.studentAnswer || "(no answer)"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-extrabold text-primary uppercase tracking-wider mb-1">✨ Better Answer</p>
                            <p className="text-sm text-[#1e1b4b] bg-[#f5f3ff] rounded-xl p-3">{qf.betterAnswer}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1 rounded-full h-12 font-bold border-primary text-primary" onClick={() => setLocation("/prep")}>
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
          <Button className="flex-1 rounded-full h-12 font-bold bg-primary text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)]">
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>
      </div>
    );
  }

  // ─── Active interview screen ──────────────────────────────────────────────────
  const progressPercent = (questionCount / maxQuestions) * 100;
  const [interviewType] = (session?.round || "Technical").includes("|")
    ? (session?.round || "Technical|Standard").split("|")
    : [session?.round || "Technical"];

  return (
    <div className="flex flex-col h-[100dvh] bg-white max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-[0_4px_24px_rgba(124,58,237,0.05)]">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" className="-ml-2 text-[#1e1b4b]" onClick={() => setLocation("/prep")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="text-center">
            <h1 className="font-extrabold text-base text-[#1e1b4b]">{interviewType} Interview</h1>
            <p className="text-[11px] text-[#6b7280] font-medium">{session?.company} · Q{questionCount}/{maxQuestions}</p>
          </div>
          {/* Voice mode toggle */}
          <button
            onClick={toggleVoiceMode}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all",
              voiceMode ? "bg-primary text-white shadow-[0_0_0_3px_rgba(124,58,237,0.2)]" : "bg-[#f5f3ff] text-[#6b7280]"
            )}
            title={voiceMode ? "Voice mode on — tap to disable" : "Enable voice mode"}
          >
            {voiceMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
        <div className="h-1.5 w-full bg-[#ede9fe] rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.5 }} />
        </div>
        <div className="flex justify-center gap-1.5 mt-2">
          {Array.from({ length: maxQuestions }).map((_, i) => (
            <div key={i} className={cn("h-1.5 rounded-full transition-all duration-300",
              i < questionCount ? "bg-primary w-5" : "bg-[#ede9fe] w-3")} />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn("flex", msg.sender === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[88%] px-5 py-4 text-[14px] font-medium shadow-[0_4px_24px_rgba(124,58,237,0.08)] whitespace-pre-wrap",
                msg.sender === "user"
                  ? "bg-primary text-white rounded-3xl rounded-tr-none"
                  : "bg-white text-[#1e1b4b] rounded-3xl rounded-tl-none border-l-4 border-[#7c3aed]"
              )}>
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
          {/* Speaking indicator */}
          {isSpeaking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-[#f5f3ff] border border-[#ede9fe] rounded-2xl px-4 py-2 flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-primary" />
                <div className="flex gap-0.5">
                  {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
                    <motion.div key={i} className="w-1 bg-primary rounded-full"
                      animate={{ height: ["8px", "18px", "8px"] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay }} />
                  ))}
                </div>
                <span className="text-[11px] font-bold text-primary">Speaking...</span>
                <button onClick={stopSpeaking} className="text-[#6b7280] hover:text-primary ml-1">
                  <MicOff className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#ede9fe] p-4 pb-safe z-20 max-w-md mx-auto">
        {/* Timer */}
        {timerRunning && (
          <div className="flex items-center justify-center mb-2 gap-1.5">
            <Clock className="w-3.5 h-3.5" style={{ color: timerColor }} />
            <span className="text-xs font-bold tabular-nums" style={{ color: timerColor }}>{formatTime(timerSeconds)}</span>
          </div>
        )}

        {voiceMode ? (
          /* Voice mode UI */
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <>
                  <motion.div className="absolute w-24 h-24 rounded-full bg-red-100"
                    animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                  <motion.div className="absolute w-20 h-20 rounded-full bg-red-200"
                    animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} />
                </>
              )}
              <motion.button
                onClick={toggleRecording}
                disabled={isTyping}
                whileTap={{ scale: 0.93 }}
                className={cn(
                  "relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all",
                  isRecording
                    ? "bg-red-500 text-white shadow-red-200 shadow-xl"
                    : isTyping
                    ? "bg-[#e5e7eb] text-[#9ca3af]"
                    : "bg-primary text-white shadow-primary/30"
                )}
              >
                {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </motion.button>
            </div>

            <p className="text-xs font-bold text-center" style={{ color: isRecording ? "#ef4444" : "#6b7280" }}>
              {isRecording ? "Listening… tap to stop" : isTyping ? "AI is thinking…" : "Tap mic to speak your answer"}
            </p>

            {inputValue && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="w-full bg-[#f5f3ff] rounded-2xl px-4 py-3 text-sm text-[#1e1b4b] font-medium border border-[#ede9fe]">
                {inputValue}
              </motion.div>
            )}

            <div className="flex gap-2 w-full">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Or type your answer..."
                disabled={isTyping}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer(inputValue); } }}
                className="flex-1 rounded-2xl border-2 border-[#ede9fe] focus-visible:ring-primary h-10 text-sm text-[#1e1b4b] font-medium"
              />
              <Button onClick={() => submitAnswer(inputValue)} disabled={!inputValue.trim() || isTyping}
                className="h-10 w-10 rounded-xl bg-primary text-white flex-shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* Text mode UI */
          <form onSubmit={handleTextSubmit} className="flex space-x-2 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your answer..."
              disabled={isTyping}
              className="flex-1 rounded-2xl bg-white border-2 border-[#ede9fe] focus-visible:ring-primary focus-visible:border-primary h-[60px] px-5 text-[15px] shadow-sm pr-24 text-[#1e1b4b] font-medium"
            />
            <div className="absolute right-2 top-2 flex gap-1">
              <motion.button type="button" whileTap={{ scale: 0.9 }}
                onClick={toggleRecording}
                disabled={isTyping}
                className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center transition-colors",
                  isRecording ? "bg-red-500 text-white" : "bg-[#f5f3ff] text-primary hover:bg-[#ede9fe]"
                )}>
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </motion.button>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button type="submit" disabled={!inputValue.trim() || isTyping}
                  className="h-11 w-11 rounded-xl bg-primary text-white shadow-md">
                  <Send className="w-5 h-5 ml-0.5" />
                </Button>
              </motion.div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
