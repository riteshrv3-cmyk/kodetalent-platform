import { Link, useLocation } from "wouter";
import { Home, Sparkles, Zap, BriefcaseBusiness } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/chat", icon: Sparkles, label: "AI" },
    { href: "/practice", icon: Zap, label: "Practice" },
    { href: "/recruiter", icon: BriefcaseBusiness, label: "Recruiter" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e0e7ff] pb-safe shadow-[0_-4px_24px_rgba(124,58,237,0.07)]" style={{ transform: "translateZ(0)", backfaceVisibility: "hidden", willChange: "transform" }}>
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const isActive =
            location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center w-full h-full gap-1 relative"
            >
              <motion.div
                whileTap={{ scale: 0.88 }}
                className={cn(
                  "flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all",
                  isActive
                    ? "bg-[#e0e7ff]"
                    : "hover:bg-[#f8fafc]"
                )}
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-colors",
                    isActive ? "text-[#4f46e5]" : "text-[#94a3b8]"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-bold transition-colors",
                    isActive ? "text-[#4f46e5]" : "text-[#94a3b8]"
                  )}
                >
                  {item.label}
                </span>
              </motion.div>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#4f46e5]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
