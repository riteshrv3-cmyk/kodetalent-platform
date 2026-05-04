import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Send, RefreshCw, CheckCircle, Zap, Mic, MicOff, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const UPDATE_MARKER = "___PROFILE_UPDATE___";
const KIT_AVATAR = `${BASE}/kit-cat.jpg`;
const MAX_HISTORY = 30;

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  streaming?: boolean;
  profileUpdated?: boolean;
  reaction?: string;
  suggestions?: string[];
  ts: number;
}

type KitMood = "normal" | "thinking" | "happy" | "error";

// ── Speech Recognition types ───────────────────────────────────────────────────

interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

interface ISpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string };
}

interface ISpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: { length: number; [index: number]: ISpeechRecognitionResult };
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

// ── Contextual suggestion chips ────────────────────────────────────────────────

const GLOBAL_CHIPS = [
  { emoji: "🔥", label: "Rate my profile" },
  { emoji: "✍️", label: "Write my bio" },
  { emoji: "🚀", label: "Add a project" },
  { emoji: "🗺️", label: "Placement roadmap" },
  { emoji: "💼", label: "FAANG prep tips" },
  { emoji: "📍", label: "Set my preferred cities" },
  { emoji: "🏆", label: "How to get into a unicorn?" },
  { emoji: "📈", label: "Boost my profile score" },
  { emoji: "🎯", label: "What to focus on this month?" },
  { emoji: "🤝", label: "I got a new certification" },
];

function getSuggestions(text: string): { emoji: string; label: string }[] {
  const t = text.toLowerCase();
  if (t.includes("project")) return [{ emoji: "🚀", label: "Add another project" }, { emoji: "🔗", label: "Add GitHub link" }];
  if (t.includes("bio")) return [{ emoji: "✅", label: "Looks good, save it" }, { emoji: "✏️", label: "Make it shorter" }];
  if (t.includes("resume")) return [{ emoji: "📄", label: "Generate a resume" }, { emoji: "🎨", label: "Try Tech template" }];
  if (t.includes("interview") || t.includes("dsa")) return [{ emoji: "🧠", label: "Start mock interview" }, { emoji: "💡", label: "DSA study plan" }];
  if (t.includes("score") || t.includes("profile")) return [{ emoji: "📈", label: "How to score higher?" }, { emoji: "🔍", label: "What's missing?" }];
  if (t.includes("cert") || t.includes("aws") || t.includes("course")) return [{ emoji: "🏅", label: "Add certification" }, { emoji: "📚", label: "Which cert next?" }];
  if (t.includes("salary") || t.includes("lpa") || t.includes("package")) return [{ emoji: "💰", label: "Set my salary expectation" }, { emoji: "📊", label: "Market rates for my skills" }];
  if (t.includes("location") || t.includes("city") || t.includes("bangalore") || t.includes("mumbai")) return [{ emoji: "📍", label: "Update my locations" }, { emoji: "🌐", label: "Set remote preference" }];
  const shuffled = [...GLOBAL_CHIPS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

const REACTIONS = ["🐾", "❤️", "🔥", "😂", "👏", "💯"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Confetti particles ────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#4f46e5", "#f97316", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

function Confetti() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: 20 + Math.random() * 60,   // % from left
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 7,
    rotate: Math.random() * 720,
    delay: Math.random() * 0.3,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: "-10px", opacity: 1, rotate: 0, scale: 1 }}
          animate={{ y: "110vh", opacity: [1, 1, 0], rotate: p.rotate, scale: [1, 1.2, 0.8] }}
          transition={{ duration: 1.8 + Math.random() * 0.8, delay: p.delay, ease: "easeIn" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

// ── Kit avatar with mood ring ─────────────────────────────────────────────────

const MOOD_RING: Record<KitMood, string> = {
  normal: "border-[#4f46e5]",
  thinking: "border-amber-400",
  happy: "border-emerald-400",
  error: "border-red-400",
};

function KitAvatar({ size = 28, mood = "normal" }: { size?: number; mood?: KitMood }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full overflow-hidden border-2 shadow-sm shrink-0 transition-colors duration-500 ${MOOD_RING[mood]}`}
    >
      <img src={KIT_AVATAR} alt="Kit" className="w-full h-full object-cover" />
    </div>
  );
}

// ── Date separator ────────────────────────────────────────────────────────────

function DateSep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[10px] font-semibold text-slate-400 px-2">{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

// ── AI Bubble ─────────────────────────────────────────────────────────────────

function AIBubble({
  msg, mood, onReact, onSuggestion, streaming,
}: {
  msg: Message;
  mood: KitMood;
  onReact: (id: string, emoji: string) => void;
  onSuggestion: (text: string) => void;
  streaming: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const displayText = msg.text.includes(UPDATE_MARKER)
    ? msg.text.slice(0, msg.text.indexOf(UPDATE_MARKER)).trim()
    : msg.text;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-end gap-2 max-w-[86%]"
    >
      <KitAvatar size={28} mood={msg.streaming ? "thinking" : mood} />

      <div className="flex flex-col gap-1.5 min-w-0">
        {/* Bubble */}
        <div className="relative group">
          <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-slate-100">
            {msg.streaming && !displayText ? (
              <div className="flex items-center gap-2 py-0.5">
                <span className="text-[12px] text-slate-400 italic">Kit is on it</span>
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-amber-400"
                    />
                  ))}
                </div>
                <span className="text-[14px]">🐾</span>
              </div>
            ) : (
              <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                {displayText}
                {msg.streaming && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="inline-block w-0.5 h-3.5 bg-[#4f46e5] ml-0.5 rounded-sm align-middle"
                  />
                )}
              </p>
            )}
          </div>

          {/* Reaction trigger */}
          {!msg.streaming && (
            <button
              onClick={() => setShowPicker((p) => !p)}
              className="absolute -bottom-2 -right-1 w-5 h-5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              {msg.reaction ?? "+"}
            </button>
          )}
        </div>

        {/* Reaction picker */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="flex gap-1 bg-white rounded-2xl px-2 py-1.5 shadow-lg border border-slate-100 self-start"
            >
              {REACTIONS.map((emoji) => (
                <button key={emoji} onClick={() => { onReact(msg.id, emoji); setShowPicker(false); }}
                  className="text-[18px] hover:scale-125 active:scale-95 transition-transform"
                >{emoji}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {msg.reaction && !showPicker && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="self-start text-[16px] cursor-pointer" onClick={() => setShowPicker(true)}
          >{msg.reaction}</motion.span>
        )}

        {msg.profileUpdated && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl self-start"
          >
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-600">Profile updated! purrfect 😎</span>
          </motion.div>
        )}

        {!msg.streaming && msg.suggestions && msg.suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="flex flex-wrap gap-1.5"
          >
            {msg.suggestions.map((s) => (
              <button key={s} onClick={() => !streaming && onSuggestion(s)} disabled={streaming}
                className="text-[11px] font-semibold bg-[#eef2ff] text-[#4f46e5] px-3 py-1 rounded-full border border-[#e0e7ff] active:scale-95 transition-transform disabled:opacity-40 whitespace-nowrap"
              >{s}</button>
            ))}
          </motion.div>
        )}

        <span className="text-[9px] text-slate-400 ml-0.5">{fmtTime(msg.ts)}</span>
      </div>
    </motion.div>
  );
}

// ── User Bubble ───────────────────────────────────────────────────────────────

function UserBubble({ msg }: { msg: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-end gap-2 max-w-[82%] ml-auto flex-row-reverse"
    >
      <div className="w-7 h-7 rounded-full bg-[#4f46e5] flex items-center justify-center text-white text-[10px] font-black shrink-0 mb-1 shadow-sm">
        me
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="bg-gradient-to-br from-[#4f46e5] to-[#6366f1] rounded-2xl rounded-br-md px-4 py-3 shadow-md shadow-[#4f46e5]/20">
          <p className="text-[13px] text-white leading-relaxed">{msg.text}</p>
        </div>
        <span className="text-[9px] text-slate-400 mr-0.5">{fmtTime(msg.ts)}</span>
      </div>
    </motion.div>
  );
}

// ── Resume Chat Banner ────────────────────────────────────────────────────────

function ResumeBanner({ onContinue, onFresh }: { onContinue: () => void; onFresh: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="mx-4 mt-3 bg-white border border-[#e0e7ff] rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3"
    >
      <KitAvatar size={32} mood="happy" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-black text-slate-800">Continue where we left off? 🐾</p>
        <p className="text-[10px] text-slate-500">Kit remembers your last chat</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={onContinue}
          className="text-[11px] font-bold bg-[#4f46e5] text-white px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
        >Yes!</button>
        <button onClick={onFresh}
          className="text-[11px] font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
        >Fresh start</button>
      </div>
    </motion.div>
  );
}

// ── Welcome chips ─────────────────────────────────────────────────────────────

function WelcomeChips({ onSelect, disabled }: { onSelect: (s: string) => void; disabled: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="flex flex-wrap gap-2 pt-1 pb-2"
    >
      {GLOBAL_CHIPS.slice(0, 6).map(({ emoji, label }) => (
        <button key={label} onClick={() => onSelect(label)} disabled={disabled}
          className="flex items-center gap-1.5 text-[11px] font-bold bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-2xl shadow-sm active:scale-95 transition-transform disabled:opacity-40"
        >
          <span className="text-base leading-none">{emoji}</span>{label}
        </button>
      ))}
      <button
        onClick={() => { const p = GLOBAL_CHIPS[Math.floor(Math.random() * GLOBAL_CHIPS.length)]; onSelect(p.label); }}
        disabled={disabled}
        className="flex items-center gap-1.5 text-[11px] font-bold bg-[#fff7ed] text-[#f97316] border border-[#fed7aa] px-3 py-2 rounded-2xl shadow-sm active:scale-95 transition-transform disabled:opacity-40"
      >
        <Zap className="w-3.5 h-3.5" />Surprise me!
      </button>
    </motion.div>
  );
}

// ── Listening wave animation ──────────────────────────────────────────────────

function ListeningWave() {
  return (
    <div className="flex items-center gap-[3px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          animate={{ scaleY: [0.4, 1.4, 0.4] }}
          transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
          className="w-[3px] rounded-full bg-red-400 origin-center"
          style={{ height: 16 }}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AIChat() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("there");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [kitMood, setKitMood] = useState<KitMood>("normal");
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [pendingHistory, setPendingHistory] = useState<Message[] | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const storageKey = studentId ? `kt-chat-${studentId}` : null;

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    const name = localStorage.getItem("studentName") || "there";
    if (!id) { setLocation("/"); return; }
    setStudentId(id);
    const first = name.split(" ")[0];
    setStudentName(first);
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));

    const key = `kt-chat-${id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Message[];
        if (parsed.length > 1) {
          setPendingHistory(parsed);
          setShowResumeBanner(true);
          return; // wait for user to choose
        }
      } catch { /* ignore */ }
    }

    startFreshChat(first);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startFreshChat(name: string) {
    const welcome: Message = {
      id: "welcome",
      role: "ai",
      ts: Date.now(),
      text: `Heyyy ${name}! 😎 I'm Kit — your career companion and the coolest cat you'll ever meet.\n\nI can update your profile, help you craft a killer bio, add projects, track your progress, or give you the real talk on placements. No corporate nonsense, just straight-up advice.\n\nMeow we're talking — what's on your mind? 🐾`,
      suggestions: [],
    };
    setMessages([welcome]);
  }

  // ── Persist messages to localStorage ─────────────────────────────────────

  useEffect(() => {
    if (!storageKey || messages.length === 0) return;
    const toSave = messages.filter((m) => !m.streaming).slice(-MAX_HISTORY);
    localStorage.setItem(storageKey, JSON.stringify(toSave));
  }, [messages, storageKey]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Reactions ─────────────────────────────────────────────────────────────

  const handleReact = useCallback((id: string, emoji: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m));
  }, []);

  // ── Voice input ───────────────────────────────────────────────────────────

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => setListening(true);
    rec.onresult = (e: ISpeechRecognitionEvent) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) { setInput((prev) => (prev + " " + final).trim()); setInterimText(""); }
      else setInterimText(interim);
    };
    rec.onend = () => { setListening(false); setInterimText(""); };
    rec.onerror = () => { setListening(false); setInterimText(""); };

    rec.start();
    recognitionRef.current = rec;
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming || !studentId) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: text.trim(), ts: Date.now() };
    const aiId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiId, role: "ai", text: "", streaming: true, ts: Date.now() };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setStreaming(true);
    setKitMood("thinking");

    try {
      const res = await fetch(`${BASE}/api/students/${studentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!res.ok || !res.body) throw new Error("Network error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let profileUpdated = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6)) as { content?: string; done?: boolean; profileUpdated?: boolean; error?: boolean };
            if (data.content) {
              accumulated += data.content;
              setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, text: accumulated } : m));
            }
            if (data.done) {
              profileUpdated = data.profileUpdated ?? false;
              if (data.error) throw new Error("AI error");
            }
          } catch (e) { if ((e as Error).message === "AI error") throw e; }
        }
      }

      const displayText = accumulated.includes(UPDATE_MARKER)
        ? accumulated.slice(0, accumulated.indexOf(UPDATE_MARKER)).trim()
        : accumulated;
      const suggestions = getSuggestions(displayText).map((s) => `${s.emoji} ${s.label}`);

      setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, streaming: false, profileUpdated, suggestions } : m));
      setKitMood(profileUpdated ? "happy" : "normal");

      if (profileUpdated) {
        setShowConfetti(true);
        setTimeout(() => { setShowConfetti(false); setKitMood("normal"); }, 2500);
        toast({ title: "Profile updated!", description: "Kit's got you covered 😎🐾" });
      }
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === aiId ? { ...m, text: "Ugh, something went wrong 😿 Try again in a sec?", streaming: false, suggestions: [] } : m
      ));
      setKitMood("error");
      setTimeout(() => setKitMood("normal"), 2000);
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const resetChat = () => {
    if (storageKey) localStorage.removeItem(storageKey);
    setShowResumeBanner(false);
    startFreshChat(studentName);
  };

  // ── Build message list with date separators ───────────────────────────────

  type ListItem = { type: "msg"; msg: Message } | { type: "sep"; label: string };
  const listItems: ListItem[] = [];
  let lastDay = "";
  for (const msg of messages) {
    const day = new Date(msg.ts).toDateString();
    if (day !== lastDay) { listItems.push({ type: "sep", label: dayLabel(msg.ts) }); lastDay = day; }
    listItems.push({ type: "msg", msg });
  }

  const showWelcomeChips = messages.length === 1 && messages[0].id === "welcome";

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)]" style={{ background: "radial-gradient(ellipse at top, #eef2ff 0%, #f8fafc 60%)" }}>

      {/* Confetti */}
      <AnimatePresence>{showConfetti && <Confetti key="confetti" />}</AnimatePresence>

      {/* ── Header ── */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-100 px-4 py-2.5 flex items-center gap-3 shadow-sm">
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-full overflow-hidden border-2 shadow-md transition-colors duration-500 ${MOOD_RING[kitMood]}`}>
            <img src={KIT_AVATAR} alt="Kit" className="w-full h-full object-cover" />
          </div>
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-black text-[#0f172a] text-sm">Kit</p>
            <span className="text-[11px]">😎</span>
            <span className="text-[9px] font-bold text-[#4f46e5] bg-[#eef2ff] px-1.5 py-0.5 rounded-full">AI</span>
          </div>
          <p className="text-[10px] text-emerald-500 font-semibold">
            {kitMood === "thinking" ? "🐾 Kit is thinking..." : "purrfessional career coach • online"}
          </p>
        </div>

        <button onClick={resetChat}
          className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center active:scale-90 transition-transform"
          title="New chat"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* ── Resume chat banner ── */}
      <AnimatePresence>
        {showResumeBanner && (
          <ResumeBanner
            onContinue={() => {
              if (pendingHistory) setMessages(pendingHistory);
              setShowResumeBanner(false);
              setPendingHistory(null);
            }}
            onFresh={() => {
              setShowResumeBanner(false);
              setPendingHistory(null);
              startFreshChat(studentName);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {listItems.map((item, idx) =>
            item.type === "sep" ? (
              <DateSep key={`sep-${idx}`} label={item.label} />
            ) : item.msg.role === "ai" ? (
              <AIBubble
                key={item.msg.id}
                msg={item.msg}
                mood={kitMood}
                onReact={handleReact}
                onSuggestion={sendMessage}
                streaming={streaming}
              />
            ) : (
              <UserBubble key={item.msg.id} msg={item.msg} />
            )
          )}
        </AnimatePresence>

        {showWelcomeChips && !streaming && (
          <WelcomeChips onSelect={sendMessage} disabled={streaming} />
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="bg-white border-t border-slate-100 px-4 pt-3 pb-4">
        {/* Interim voice text preview */}
        <AnimatePresence>
          {interimText && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[11px] text-slate-400 italic mb-1.5 px-1"
            >
              "{interimText}"
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          {/* Voice button */}
          {voiceSupported && (
            <button
              onPointerDown={startListening}
              onPointerUp={stopListening}
              onPointerLeave={stopListening}
              disabled={streaming}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40 ${
                listening
                  ? "bg-red-50 border border-red-200"
                  : "bg-slate-50 border border-slate-200"
              }`}
              title="Hold to speak"
            >
              {listening ? (
                <ListeningWave />
              ) : (
                <Mic className="w-4 h-4 text-slate-500" />
              )}
            </button>
          )}

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={listening && interimText ? interimText : input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder={listening ? "Listening... 🎤" : "Ask Kit anything... 🐾"}
              rows={1}
              disabled={streaming}
              className={`w-full resize-none text-[13px] text-[#0f172a] placeholder:text-slate-400 rounded-2xl px-4 py-2.5 outline-none border transition-all max-h-[96px] disabled:opacity-60 ${
                listening
                  ? "bg-red-50 border-red-300 placeholder:text-red-300"
                  : "bg-[#f8fafc] border-slate-200 focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10"
              }`}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center shadow-md shadow-[#4f46e5]/30 disabled:opacity-35 shrink-0 transition-opacity"
          >
            {streaming ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </motion.button>
        </div>

        <p className="text-[9.5px] text-slate-400 text-center mt-2 font-medium flex items-center justify-center gap-1">
          {voiceSupported && <><Volume2 className="w-3 h-3" /> Hold mic to speak •</>}
          Kit can update your profile • add projects • career advice
        </p>
      </div>
    </div>
  );
}
