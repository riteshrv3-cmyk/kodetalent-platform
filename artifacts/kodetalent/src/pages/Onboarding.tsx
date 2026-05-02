import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { useCreateStudent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = {
  id: string;
  sender: "bot" | "user";
  text: string;
  options?: string[];
  inputType?: "text" | "email";
};

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [inputValue, setInputValue] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  const createStudent = useCreateStudent();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (step === 0) {
      addBotMessage("Hey! I'm your AI Career Companion from KodeTalent. Ready to level up your engineering career?", ["Let's go!"]);
    } else if (step === 1) {
      addBotMessage("Awesome! Which year of college are you in right now?", ["1st Year", "2nd Year", "3rd Year", "4th Year"]);
    } else if (step === 2) {
      addBotMessage("Got it. What field are you most interested in?", ["Web Dev", "AI/ML", "App Dev", "Cybersecurity", "Data"]);
    } else if (step === 3) {
      addBotMessage("Nice choice! What's the name of your college and city? (e.g., PICT Pune)", [], "text");
    } else if (step === 4) {
      if (formData.year === "3rd Year" || formData.year === "4th Year") {
        addBotMessage("Do you have a GitHub profile? Paste the URL or skip.", [], "text");
      } else {
        setStep(5);
      }
    } else if (step === 5) {
      addBotMessage("Almost done! What's your email?", [], "email");
    } else if (step === 6) {
      addBotMessage("And finally, what's your name?", [], "text");
    } else if (step === 7) {
      finishOnboarding();
    }
  }, [step]);

  const addBotMessage = (text: string, options: string[] = [], inputType?: "text" | "email") => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text, options, inputType }]);
    }, 1200);
  };

  const handleOptionClick = (option: string) => {
    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: option }]);
    
    if (step === 0) setStep(1);
    else if (step === 1) {
      setFormData({ ...formData, year: option });
      setStep(2);
    }
    else if (step === 2) {
      setFormData({ ...formData, field: option });
      setStep(3);
    }
  };

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && step !== 4) return;

    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: inputValue || "Skipped" }]);
    
    if (step === 3) {
      const parts = inputValue.split(" ");
      const city = parts.length > 1 ? parts.pop() : "Unknown";
      setFormData({ ...formData, college: parts.join(" "), city });
      setStep(4);
    } else if (step === 4) {
      setFormData({ ...formData, githubUrl: inputValue || undefined });
      setStep(5);
    } else if (step === 5) {
      setFormData({ ...formData, email: inputValue });
      setStep(6);
    } else if (step === 6) {
      setFormData({ ...formData, name: inputValue });
      setStep(7);
    }
    
    setInputValue("");
  };

  const finishOnboarding = async () => {
    setLoadingProfile(true);
    try {
      const yearMap: Record<string, number> = {
        "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4
      };
      
      const year = yearMap[formData.year] || 1;
      const field = formData.field || "Web Dev";

      const student = await createStudent.mutateAsync({
        data: {
          name: formData.name || "Student",
          email: formData.email || "student@example.com",
          college: formData.college || "College",
          city: formData.city || "City",
          year: year,
          field: field,
          githubUrl: formData.githubUrl,
        }
      });
      
      localStorage.setItem("studentId", student.id.toString());
      
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
      
    } catch (e) {
      console.error(e);
      setLoadingProfile(false);
      addBotMessage("Oops, something went wrong. Let's try again.");
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#f5f3ff] flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <span className="text-5xl">⚡</span>
        </div>
        <h2 className="text-2xl font-bold text-[#1e1b4b]">Tera profile ban raha hai... ⚡</h2>
        <div className="w-full max-w-xs h-3 bg-[#ede9fe] rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "linear" }}
          />
        </div>
      </div>
    );
  }

  const currentBotMessage = messages[messages.length - 1]?.sender === "bot" ? messages[messages.length - 1] : null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f5f3ff] max-w-md mx-auto relative overflow-hidden">
      <div className="bg-white border-b border-[#ede9fe] p-4 shadow-sm flex items-center space-x-3 sticky top-0 z-10">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-lg">
          KT
        </div>
        <div>
          <h1 className="font-bold text-xl text-[#1e1b4b]">KodeTalent AI</h1>
          <p className="text-sm font-semibold text-[#10b981]">Online</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-5 py-3 text-[15px] font-medium shadow-[0_4px_24px_rgba(124,58,237,0.10)] ${
                  msg.sender === "user" 
                    ? "bg-primary text-white rounded-2xl rounded-tr-none" 
                    : "bg-white text-[#1e1b4b] rounded-2xl rounded-tl-none border border-[#ede9fe]"
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
              <div className="bg-white border border-[#ede9fe] rounded-2xl rounded-tl-none px-5 py-4 flex space-x-1 shadow-[0_4px_24px_rgba(124,58,237,0.10)]">
                <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {!isTyping && currentBotMessage && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-[#f5f3ff] to-transparent z-20 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            {currentBotMessage.options?.length ? (
              <div className="flex flex-wrap gap-2 justify-end">
                {currentBotMessage.options.map((opt) => (
                  <motion.div key={opt} whileTap={{ scale: 0.97 }}>
                    <Button 
                      variant="outline" 
                      className="rounded-full bg-white hover:bg-primary border-primary text-primary hover:text-white transition-colors h-12 px-6 font-bold text-[15px] shadow-[0_4px_24px_rgba(124,58,237,0.10)]"
                      onClick={() => handleOptionClick(opt)}
                    >
                      {opt}
                    </Button>
                  </motion.div>
                ))}
              </div>
            ) : currentBotMessage.inputType ? (
              <form onSubmit={handleSubmitText} className="flex space-x-2">
                <Input
                  autoFocus
                  type={currentBotMessage.inputType === "email" ? "email" : "text"}
                  placeholder="Type your answer..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 rounded-full bg-white border-[#ede9fe] focus-visible:ring-primary h-14 px-6 text-[15px] shadow-[0_4px_24px_rgba(124,58,237,0.10)] text-[#1e1b4b]"
                />
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button type="submit" size="icon" className="rounded-full shrink-0 h-14 w-14 bg-primary text-white shadow-[0_4px_24px_rgba(124,58,237,0.20)]">
                    <Send className="w-5 h-5 ml-1" />
                  </Button>
                </motion.div>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
