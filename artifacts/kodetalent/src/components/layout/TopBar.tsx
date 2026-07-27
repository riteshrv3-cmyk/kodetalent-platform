import { Link, useLocation } from "wouter";
import { Mail, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

interface TopBarProps {
  pendingCount: number;
  initials: string;
  onProfileClick: () => void;
}

export function TopBar({ pendingCount, initials, onProfileClick }: TopBarProps) {
  const [location, setLocation] = useLocation();
  const isInbox = location === "/inbox";
  const showBack = location !== "/home" && location !== "/onboarding";

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/home");
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-paper/90 backdrop-blur-md border-b border-line" style={{ transform: "translateZ(0)", backfaceVisibility: "hidden", willChange: "transform" }}>
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={goBack}
              className="w-8 h-8 rounded-xl flex items-center justify-center active:bg-line/60 transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5 text-ink" />
            </motion.button>
          )}
          <span className="font-extrabold text-ink text-lg tracking-tight">KodeTalent</span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/inbox">
            <motion.button
              whileTap={{ scale: 0.92 }}
              className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isInbox ? "bg-brand-soft" : "active:bg-brand-soft/60"
              }`}
            >
              <Mail className={`w-5 h-5 ${isInbox ? "text-brand" : "text-ink"}`} />
              {pendingCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-highlight text-white text-[9px] font-black rounded-full flex items-center justify-center"
                >
                  {pendingCount > 9 ? "9+" : pendingCount}
                </motion.span>
              )}
            </motion.button>
          </Link>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onProfileClick}
            className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center text-brand font-bold text-[12px]"
          >
            {initials}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
