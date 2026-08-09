import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

interface TopBarProps {
  initials: string;
  onProfileClick: () => void;
}

export function TopBar({ initials, onProfileClick }: TopBarProps) {
  const [location, setLocation] = useLocation();
  const showBack = location !== "/home" && location !== "/onboarding";

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/home");
    }
  };

  return (
    // paddingTop clears the status bar / notch: the page now uses
    // viewport-fit=cover, so a fixed top-0 bar starts at the physical top of
    // the screen rather than below the system UI. The bar's own background
    // fills that strip, which is what we want.
    <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-paper/90 backdrop-blur-md border-b border-line" style={{ transform: "translateZ(0)", backfaceVisibility: "hidden", willChange: "transform", paddingTop: "env(safe-area-inset-top)" }}>
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
