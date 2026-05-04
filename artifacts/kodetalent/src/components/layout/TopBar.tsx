import { Link, useLocation } from "wouter";
import { Mail, UserCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TopBarProps {
  pendingCount: number;
  initials: string;
  onProfileClick: () => void;
}

export function TopBar({ pendingCount, initials, onProfileClick }: TopBarProps) {
  const [location] = useLocation();
  const isInbox = location === "/inbox";

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#e0e7ff]/60 shadow-sm" style={{ transform: "translateZ(0)", backfaceVisibility: "hidden", willChange: "transform" }}>
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center">
            <span className="text-white font-black text-sm">KT</span>
          </div>
          <span className="font-black text-[#0f172a] text-lg tracking-tight">KodeTalent</span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/inbox">
            <motion.button
              whileTap={{ scale: 0.92 }}
              className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isInbox ? "bg-[#e0e7ff]" : "bg-[#f8fafc] hover:bg-[#e0e7ff]"
              }`}
            >
              <Mail className={`w-5 h-5 ${isInbox ? "text-[#4f46e5]" : "text-[#64748b]"}`} />
              {pendingCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-[#4f46e5] text-white text-[9px] font-black rounded-full flex items-center justify-center"
                >
                  {pendingCount > 9 ? "9+" : pendingCount}
                </motion.span>
              )}
            </motion.button>
          </Link>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onProfileClick}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center text-white shadow-sm shadow-[#4f46e5]/30"
          >
            <UserCircle2 className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
