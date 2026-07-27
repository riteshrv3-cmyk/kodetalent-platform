import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, RefreshCw, Share2, Clock, ChevronDown, ChevronUp, Mic, Volume2, VolumeX, Camera, CameraOff } from "lucide-react";
import { useGetNextInterviewQuestion, useEvaluateInterview, useGetInterviewSession, useSubmitInterviewFeedback } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api/authFetch";

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
          <circle cx="32" cy="32" r={r} fill="none" stroke="#e0e7ff" strokeWidth="6" />
          <motion.circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (pct / 100) * circ }} transition={{ duration: 1, delay: 0.3 }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-black text-[#0f172a]">{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wide">{label}</span>
    </div>
  );
}

const CONFIDENCE_EMOJIS = [
  { emoji: "😰", label: "Very nervous" },
  { emoji: "😟", label: "Nervous" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "🙂", label: "Confident" },
  { emoji: "😎", label: "Very confident" },
];

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
  const [addedToTomorrow, setAddedToTomorrow] = useState(false);
  const maxQuestions = 5;

  // Confidence micro-survey
  const [confidenceSent, setConfidenceSent] = useState(false);
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const [showRealInterviewQ, setShowRealInterviewQ] = useState(false);
  const submitFeedback = useSubmitInterviewFeedback();

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

  // Camera mode (live self-view, no recording)
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const isTypingRef = useRef(false);
  const timerSecondsRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // OpenAI voice: TTS playback + MediaRecorder->Whisper transcription
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, isLoading: sessionLoading } = useGetInterviewSession(sessionId, {
    query: { enabled: !!sessionId } as any
  });
  const getNextQuestion = useGetNextInterviewQuestion();
  const evaluateInterview = useEvaluateInterview();

  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { isTypingRef.current = isTyping; }, [isTyping]);
  useEffect(() => { timerSecondsRef.current = timerSeconds; }, [timerSeconds]);

  useEffect(() => {
    // Default new users into the audio+video experience; respect an explicit "false"
    // for anyone who has previously turned a mode off.
    const vmStored = localStorage.getItem("voiceMode");
    const vm = vmStored === null ? true : vmStored === "true";
    setVoiceMode(vm);
    voiceModeRef.current = vm;
    const cmStored = localStorage.getItem("cameraMode");
    const cm = cmStored === null ? true : cmStored === "true";
    setCameraMode(cm);
  }, []);

  // Camera lifecycle: turn on/off based on cameraMode + interview not finished
  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!cameraMode || isFinished) return;
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera not supported on this device");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        cameraStreamRef.current = stream;
        setCameraError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      } catch (err) {
        const msg = err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission denied"
          : "Couldn't start camera";
        setCameraError(msg);
      }
    }
    function stop() {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    if (cameraMode && !isFinished) start();
    else stop();
    return () => { cancelled = true; stop(); };
  }, [cameraMode, isFinished]);

  const toggleCameraMode = () => {
    const next = !cameraMode;
    setCameraMode(next);
    localStorage.setItem("cameraMode", next ? "true" : "false");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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

  useEffect(() => {
    if (!voiceMode || isTyping || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last?.sender === "bot") speakText(last.text);
  }, [messages, isTyping, voiceMode]);

  // Fallback: robotic browser voice if OpenAI TTS is unavailable.
  const speakTextFallback = useCallback((clean: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
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

  // Primary: natural OpenAI TTS voice for the interviewer.
  const speakText = useCallback(async (text: string) => {
    if (!voiceModeRef.current) return;
    const clean = stripMarkdown(text);
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
    window.speechSynthesis?.cancel();
    try {
      const res = await fetch("/api/interview/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (!res.ok) throw new Error("tts failed");
      const blob = await res.blob();
      if (!voiceModeRef.current) return; // user turned voice off while fetching
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); ttsAudioRef.current = null; };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); ttsAudioRef.current = null; };
      await audio.play();
    } catch {
      speakTextFallback(clean); // graceful fallback to browser voice
    }
  }, [speakTextFallback]);

  const stopSpeaking = () => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  useEffect(() => {
    if (session && messages.length === 0 && !session.completed) {
      if (session.currentQuestion) {
        setMessages([{ id: Date.now().toString(), sender: "bot", text: session.currentQuestion }]);
        setQuestionCount(session.questionNumber);
      } else {
        fetchNextQuestion("Start interview");
      }
    } else if (session?.completed) {
      if ((session as any).evaluation) setEvalData((session as any).evaluation as EvalData);
      setIsFinished(true);
    }
  }, [session]);

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

  const addWeakPointToTomorrow = async () => {
    const studentId = localStorage.getItem("studentId");
    if (!studentId || !evalData) return;
    try {
      const res = await apiFetch(`/api/students/${studentId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: `Work on: ${evalData.weakPoint}`,
          sublabel: "From yesterday's mock interview",
          href: "/practice",
        }),
      });
      if (res.ok) setAddedToTomorrow(true);
    } catch {
      // Non-critical — the student can always start practice manually.
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;
    submitAnswer(inputValue);
  };

  const handleConfidenceRating = (rating: number) => {
    setPendingRating(rating);
    setShowRealInterviewQ(true);
  };

  const handleRealInterview = async (answer: "yes" | "no") => {
    if (!pendingRating) return;
    try {
      await submitFeedback.mutateAsync({
        id: sessionId,
        data: { selfConfidenceRating: pendingRating, realInterviewUpcoming: answer }
      });
    } catch (e) {
      // silently ignore — don't block UX
    }
    setConfidenceSent(true);
  };

  const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const toggleRecording = async () => {
    // Stop an in-progress recording (either engine).
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        return;
      }
      recognitionRef.current?.stop();
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
      return;
    }
    stopSpeaking();

    // Primary: record with MediaRecorder, transcribe via OpenAI Whisper.
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        mr.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          setIsRecording(false);
          const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
          if (blob.size === 0) return;
          setIsTranscribing(true);
          try {
            const base64 = await blobToBase64(blob);
            const res = await fetch("/api/interview/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audio: base64, mimeType: blob.type }),
            });
            const data = await res.json();
            setIsTranscribing(false);
            const text = (data?.text ?? "").trim();
            if (text) { setInputValue(text); submitAnswer(text); }
          } catch {
            setIsTranscribing(false);
          }
        };
        mediaRecorderRef.current = mr;
        setInputValue("");
        mr.start();
        setIsRecording(true);
        return;
      } catch {
        // mic blocked or MediaRecorder failed -> fall through to browser recognition
      }
    }

    // Fallback: browser SpeechRecognition (Chrome/Edge only).
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Microphone/voice input isn't available in this browser. Try Chrome or Edge, and allow mic access.");
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    let latestFinal = "";
    recognition.onstart = () => { setIsRecording(true); setInputValue(""); };
    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
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
    recognition.onerror = (e: any) => { console.error("Speech recognition error:", e.error); setIsRecording(false); };
    recognition.onend = () => setIsRecording(false);
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

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (sessionLoading) {
    return <div className="p-4 flex justify-center items-center h-screen bg-white font-bold text-primary">Loading...</div>;
  }

  // ─── Results screen ──────────────────────────────────────────────────────────
  if (isFinished) {
    const times = questionTimesRef.current;
    const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const fastest = times.length ? Math.min(...times) : 0;
    const slowest = times.length ? Math.max(...times) : 0;
    const ratingColor = !evalData?.overallRating ? "#4f46e5"
      : evalData.overallRating.includes("Strong") ? "#10b981"
      : evalData.overallRating.includes("No") ? "#ef4444"
      : evalData.overallRating.includes("Lean") ? "#f97316"
      : "#4f46e5";
    const [interviewTypeLabel] = (session?.round || "Technical").includes("|")
      ? (session?.round || "Technical|Standard").split("|")
      : [session?.round || "Technical"];

    return (
      <div className="p-4 pb-24 max-w-md mx-auto space-y-4 min-h-screen bg-[#f8fafc]">
        <Button variant="ghost" onClick={() => setLocation("/practice")} className="mb-2 -ml-2 text-[#64748b] font-bold">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold text-[#0f172a]">Interview Complete</h1>
          <p className="text-[#64748b] font-bold">{interviewTypeLabel} · {session?.company}</p>
        </div>

        {/* Main score card */}
        <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.12)] rounded-3xl bg-white overflow-hidden">
          <div className="h-2 w-full" style={{ background: "linear-gradient(90deg,#4f46e5,#ec4899)" }} />
          <CardContent className="p-6 text-center">
            <div className="text-[80px] font-black leading-none mb-1" style={{ color: ratingColor }}>
              {evalData?.overallScore ?? 85}
            </div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#64748b] mb-3">Overall Score</p>
            {evalData?.overallRating && (
              <span className="px-4 py-1.5 rounded-full text-sm font-bold text-white" style={{ background: ratingColor }}>
                {evalData.overallRating}
              </span>
            )}
          </CardContent>
        </Card>

        {/* Confidence micro-survey */}
        <AnimatePresence>
          {!confidenceSent && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 border-l-4 border-l-primary shadow-sm rounded-2xl bg-white">
                <CardContent className="p-4">
                  {!showRealInterviewQ ? (
                    <>
                      <p className="text-sm font-bold text-[#0f172a] mb-1">How confident did you feel?</p>
                      <p className="text-xs text-[#94a3b8] mb-3">This helps us personalise your practice.</p>
                      <div className="flex justify-around">
                        {CONFIDENCE_EMOJIS.map(({ emoji, label }, i) => (
                          <button
                            key={i}
                            onClick={() => handleConfidenceRating(i + 1)}
                            title={label}
                            className="text-2xl w-11 h-11 rounded-full hover:bg-[#f8fafc] transition active:scale-90 flex items-center justify-center"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                      <p className="text-sm font-bold text-[#0f172a] mb-3">Do you have a real interview coming up?</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleRealInterview("yes")}
                          className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-[#3730a3] transition"
                        >
                          Yes, soon!
                        </button>
                        <button
                          onClick={() => handleRealInterview("no")}
                          className="flex-1 py-2.5 rounded-xl bg-[#f8fafc] text-[#64748b] font-bold text-sm hover:bg-[#e0e7ff] transition"
                        >
                          Not yet
                        </button>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
          {confidenceSent && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-0 shadow-sm rounded-2xl bg-white">
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-bold text-[#10b981]">✓ Thanks for the feedback!</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category scores */}
        {evalData && (
          <Card className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#64748b] mb-4">Category Scores</p>
              <div className="flex justify-around">
                <ScoreRing score={evalData.communicationScore} max={10} label="Comms" color="#4f46e5" />
                <ScoreRing score={evalData.technicalScore} max={10} label="Technical" color="#0ea5e9" />
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
                <p className="text-sm font-medium text-[#0f172a]">{evalData.strongPoint}</p>
              </CardContent>
            </Card>
            <Card className="border-0 border-l-4 border-l-[#f97316] shadow-sm rounded-2xl bg-white">
              <CardContent className="p-4">
                <p className="text-[11px] font-extrabold text-[#f97316] uppercase tracking-wider mb-1">⚡ Work on this</p>
                <p className="text-sm font-medium text-[#0f172a] mb-2">{evalData.weakPoint}</p>
                <button
                  onClick={addWeakPointToTomorrow}
                  disabled={addedToTomorrow}
                  className="text-xs font-bold text-[#f97316] disabled:text-[#94a3b8] disabled:cursor-default"
                >
                  {addedToTomorrow ? "Added to tomorrow's checklist ✓" : "Add to tomorrow's checklist"}
                </button>
              </CardContent>
            </Card>
          </div>
        )}

        {times.length > 0 && (
          <Card className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-4">
              <p className="text-[11px] font-extrabold text-[#64748b] uppercase tracking-wider mb-3">
                <Clock className="w-3 h-3 inline mr-1" /> Response Times
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-lg font-black text-[#0f172a]">{formatTime(avg)}</div><div className="text-[10px] font-bold text-[#64748b]">Average</div></div>
                <div><div className="text-lg font-black text-[#10b981]">{formatTime(fastest)}</div><div className="text-[10px] font-bold text-[#64748b]">Fastest</div></div>
                <div><div className="text-lg font-black text-[#f97316]">{formatTime(slowest)}</div><div className="text-[10px] font-bold text-[#64748b]">Slowest</div></div>
              </div>
            </CardContent>
          </Card>
        )}

        {evalData?.questionFeedback && evalData.questionFeedback.length > 0 && (
          <div>
            <p className="text-[11px] font-extrabold text-[#64748b] uppercase tracking-wider mb-2 px-1">Q&A Review</p>
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
                      <span className="text-sm font-bold text-[#0f172a] truncate">Q{i + 1}: {qf.question.slice(0, 50)}{qf.question.length > 50 ? "…" : ""}</span>
                    </div>
                    {expandedFeedback === i ? <ChevronUp className="w-4 h-4 text-[#64748b] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#64748b] flex-shrink-0" />}
                  </button>
                  <AnimatePresence>
                    {expandedFeedback === i && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-3 border-t border-[#f3f4f6] pt-3">
                          <div>
                            <p className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-wider mb-1">Your Answer</p>
                            <p className="text-sm text-[#0f172a]">{qf.studentAnswer || "(no answer)"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-extrabold text-primary uppercase tracking-wider mb-1">✨ Better Answer</p>
                            <p className="text-sm text-[#0f172a] bg-[#f8fafc] rounded-xl p-3">{qf.betterAnswer}</p>
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
          <Button variant="outline" className="flex-1 rounded-full h-12 font-bold border-primary text-primary" onClick={() => setLocation("/practice")}>
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
          <Button variant="ghost" size="icon" className="-ml-2 text-[#0f172a]" onClick={() => setLocation("/practice")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="text-center">
            <h1 className="font-extrabold text-base text-[#0f172a]">{interviewType} Interview</h1>
            <p className="text-[11px] text-[#64748b] font-medium">{session?.company} · Q{questionCount}/{maxQuestions}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleCameraMode}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                cameraMode ? "bg-[#ec4899] text-white shadow-[0_0_0_3px_rgba(236,72,153,0.2)]" : "bg-[#f8fafc] text-[#64748b]"
              )}
              aria-label="Toggle camera"
            >
              {cameraMode ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleVoiceMode}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                voiceMode ? "bg-primary text-white shadow-[0_0_0_3px_rgba(124,58,237,0.2)]" : "bg-[#f8fafc] text-[#64748b]"
              )}
              aria-label="Toggle voice"
            >
              {voiceMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="h-1.5 w-full bg-[#e0e7ff] rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.5 }} />
        </div>
        <div className="flex justify-center gap-1.5 mt-2">
          {Array.from({ length: maxQuestions }).map((_, i) => (
            <div key={i} className={cn("h-1.5 rounded-full transition-all duration-300",
              i < questionCount ? "bg-primary w-5" : "bg-[#e0e7ff] w-3")} />
          ))}
        </div>
      </div>

      {/* Camera PIP self-view (top-right floating) */}
      <AnimatePresence>
        {cameraMode && !isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="fixed top-[88px] right-3 z-20 w-[92px] h-[120px] rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.25)] border-2 border-white bg-[#0f172a] max-w-[calc(44vw-0.75rem)]"
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {!cameraError && (
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                <span className="text-[8px] font-extrabold text-white tracking-wider">LIVE</span>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 bg-[#0f172a]/95">
                <CameraOff className="w-5 h-5 text-[#ef4444] mb-1" />
                <span className="text-[9px] font-bold text-white leading-tight">{cameraError}</span>
              </div>
            )}
            <button
              onClick={toggleCameraMode}
              className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
              aria-label="Close camera"
            >
              <CameraOff className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer */}
      {timerRunning && (
        <div className="flex justify-end px-4 pt-1">
          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: timerSeconds < 120 ? "#10b981" : timerSeconds < 240 ? "#f97316" : "#ef4444" }}>
            <Clock className="w-3 h-3" /> {formatTime(timerSeconds)}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-56">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn("flex", msg.sender === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[88%] px-5 py-4 text-[14px] font-medium shadow-[0_4px_24px_rgba(124,58,237,0.08)] whitespace-pre-wrap",
                msg.sender === "user"
                  ? "bg-primary text-white rounded-3xl rounded-tr-none"
                  : "bg-white text-[#0f172a] rounded-3xl rounded-tl-none border-l-4 border-[#4f46e5]"
              )}>
                {msg.text}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-white border-l-4 border-[#4f46e5] rounded-3xl rounded-tl-none px-5 py-5 flex space-x-1.5 shadow-[0_4px_24px_rgba(124,58,237,0.08)]">
                <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
              </div>
            </motion.div>
          )}
          {isSpeaking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-[#f8fafc] border border-[#e0e7ff] rounded-2xl px-4 py-2 flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-primary" />
                <div className="flex gap-0.5">
                  {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
                    <motion.div key={i} className="w-0.5 rounded-full bg-primary"
                      animate={{ height: ["4px", "14px", "4px"] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay }} />
                  ))}
                </div>
                <span className="text-xs font-bold text-primary">Speaking…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-5 px-4 max-w-md mx-auto">
        {(isRecording || isTranscribing || isSpeaking) && (
          <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}
            className="text-center text-xs font-bold text-primary mb-2">
            {isRecording ? "🎤 Listening… speak now, tap Stop when done"
              : isTranscribing ? "✍️ Transcribing your answer…"
              : "🔊 Interviewer speaking…"}
          </motion.div>
        )}
        <form onSubmit={handleTextSubmit} className="flex gap-2 items-end">
          {voiceMode ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={toggleRecording}
              disabled={isTranscribing || isTyping}
              className={cn(
                "flex-1 h-14 rounded-full font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60",
                isRecording
                  ? "bg-[#ef4444] text-white shadow-[0_0_0_6px_rgba(239,68,68,0.2)]"
                  : "bg-primary text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)]"
              )}
            >
              <Mic className="w-5 h-5" />
              {isRecording ? "Stop" : isTranscribing ? "Transcribing…" : "Tap to speak"}
            </motion.button>
          ) : (
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (inputValue.trim() && !isTyping) submitAnswer(inputValue);
                }
              }}
              placeholder="Type your answer… (Shift+Enter for new line)"
              disabled={isTyping}
              rows={3}
              className="flex-1 min-h-[88px] max-h-[200px] rounded-2xl border-2 border-[#e0e7ff] focus-visible:border-primary focus-visible:ring-0 px-4 py-3 text-[15px] bg-[#fafaf9] text-[#0f172a] resize-none leading-relaxed"
            />
          )}
          {!voiceMode && (
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                type="submit"
                size="icon"
                disabled={isTyping || !inputValue.trim()}
                className="h-14 w-14 rounded-2xl bg-primary text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)] flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  );
}
