import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, CheckCircle, User, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const UPDATE_MARKER = "___PROFILE_UPDATE___";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  streaming?: boolean;
  profileUpdated?: boolean;
}

const QUICK_ACTIONS = [
  "What's my current profile score?",
  "Help me write a better bio",
  "I want to add a new project",
  "What should I focus on for placements?",
  "Set my preferred locations to Bangalore and Hyderabad",
  "I got certified in AWS recently",
];

function AIBubble({ msg }: { msg: Message }) {
  const displayText = msg.text.includes(UPDATE_MARKER)
    ? msg.text.slice(0, msg.text.indexOf(UPDATE_MARKER)).trim()
    : msg.text;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-2 max-w-[88%]"
    >
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] flex items-center justify-center shrink-0 mb-1 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-[#ede9fe]/50">
          <p className="text-[13px] text-[#1e1b4b] leading-relaxed whitespace-pre-wrap">
            {displayText || (msg.streaming ? "" : "...")}
          </p>
          {msg.streaming && (
            <div className="flex gap-1 mt-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]"
                />
              ))}
            </div>
          )}
        </div>
        {msg.profileUpdated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d1fae5] rounded-xl self-start"
          >
            <CheckCircle className="w-3 h-3 text-[#10b981]" />
            <span className="text-[10px] font-black text-[#10b981]">Profile updated!</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function UserBubble({ msg }: { msg: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-2 max-w-[88%] ml-auto flex-row-reverse"
    >
      <div className="w-7 h-7 rounded-full bg-[#ede9fe] flex items-center justify-center shrink-0 mb-1">
        <User className="w-3.5 h-3.5 text-[#7c3aed]" />
      </div>
      <div className="bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] rounded-2xl rounded-br-md px-4 py-3 shadow-sm shadow-[#7c3aed]/20">
        <p className="text-[13px] text-white leading-relaxed">{msg.text}</p>
      </div>
    </motion.div>
  );
}

export default function AIChat() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("there");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    const name = localStorage.getItem("studentName") || "there";
    if (!id) { setLocation("/"); return; }
    setStudentId(id);
    setStudentName(name.split(" ")[0]);

    setMessages([{
      id: "welcome",
      role: "ai",
      text: `Hi ${name.split(" ")[0]}! 👋 I'm your KodeTalent AI Career Companion.\n\nI can help you update your profile, craft a better bio, add projects or certifications, track your progress, or give you placement prep advice.\n\nWhat would you like to do today?`,
    }]);
  }, [setLocation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming || !studentId) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: text.trim() };
    const aiId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiId, role: "ai", text: "", streaming: true };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    setStreaming(true);

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
            const data = JSON.parse(line.slice(6)) as {
              content?: string;
              done?: boolean;
              profileUpdated?: boolean;
              error?: boolean;
            };

            if (data.content) {
              accumulated += data.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiId ? { ...m, text: accumulated } : m
                )
              );
            }

            if (data.done) {
              profileUpdated = data.profileUpdated ?? false;
              if (data.error) throw new Error("AI error");
            }
          } catch (e) {
            if ((e as Error).message === "AI error") throw e;
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, streaming: false, profileUpdated } : m
        )
      );

      if (profileUpdated) {
        toast({
          title: "Profile updated!",
          description: "Your changes have been saved.",
        });
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? { ...m, text: "Sorry, I couldn't connect. Please try again.", streaming: false }
            : m
        )
      );
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const showQuickActions = messages.length <= 1;

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] bg-[#f5f3ff]">

      {/* Chat header */}
      <div className="bg-white border-b border-[#ede9fe] px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] flex items-center justify-center shadow-sm shadow-[#7c3aed]/25">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-black text-[#1e1b4b] text-sm">KT AI</p>
          <p className="text-[10px] text-[#10b981] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] inline-block animate-pulse" />
            Always on for you
          </p>
        </div>
        <button
          onClick={() => {
            const name = localStorage.getItem("studentName") || "there";
            setMessages([{
              id: "welcome-" + Date.now(),
              role: "ai",
              text: `Hi ${name.split(" ")[0]}! 👋 I'm ready to help. What would you like to do?`,
            }]);
          }}
          className="w-8 h-8 rounded-xl bg-[#f5f3ff] flex items-center justify-center"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#6b7280]" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) =>
            msg.role === "ai"
              ? <AIBubble key={msg.id} msg={msg} />
              : <UserBubble key={msg.id} msg={msg} />
          )}
        </AnimatePresence>

        {/* Quick action chips */}
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-2 pt-2"
          >
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                onClick={() => sendMessage(action)}
                disabled={streaming}
                className="text-[11px] font-bold bg-white text-[#7c3aed] border border-[#ede9fe] px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                {action}
              </button>
            ))}
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-[#ede9fe] px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your career..."
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none bg-[#f5f3ff] text-[13px] text-[#1e1b4b] placeholder:text-[#9ca3af] rounded-2xl px-4 py-2.5 outline-none border border-[#ede9fe] focus:border-[#7c3aed] transition-colors max-h-[100px] disabled:opacity-60"
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] flex items-center justify-center shadow-md shadow-[#7c3aed]/25 disabled:opacity-40 shrink-0"
          >
            {streaming ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </motion.button>
        </div>
        <p className="text-[10px] text-[#9ca3af] text-center mt-2">
          I can update your profile, add projects, set preferences and more
        </p>
      </div>
    </div>
  );
}
