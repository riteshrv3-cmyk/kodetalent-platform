import { Link, useLocation } from "wouter";
import { Home, BookOpen, Zap, Sparkles, User, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function BottomNav() {
  const [location] = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) return;
    function load() {
      fetch(`${BASE}/api/students/${id}/invites`)
        .then(r => r.json())
        .then((data: { status: string; studentSeen: boolean }[]) => {
          setPendingCount(data.filter(i => i.status === "pending" && !i.studentSeen).length);
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reset badge when on inbox page
  useEffect(() => {
    if (location === "/inbox") setPendingCount(0);
  }, [location]);

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/roadmap", icon: BookOpen, label: "Roadmap" },
    { href: "/prep", icon: Zap, label: "Practice" },
    { href: "/opportunities", icon: Sparkles, label: "Explore" },
    { href: "/inbox", icon: Mail, label: "Inbox", badge: pendingCount },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#ede9fe] pb-safe shadow-[0_-4px_24px_rgba(124,58,237,0.05)]">
      <div className="flex justify-around items-center h-[64px] max-w-md mx-auto px-1 relative">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors relative",
                isActive ? "text-primary" : "text-[#9ca3af] hover:text-primary/70"
              )}
            >
              <div className="relative">
                <Icon className="h-[18px] w-[18px] transition-all" />
                {item.badge && item.badge > 0 && !isActive && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#7c3aed] rounded-full text-white text-[9px] font-black flex items-center justify-center"
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </motion.span>
                )}
              </div>
              <span className={cn("text-[9px] font-bold transition-colors", isActive ? "text-primary" : "text-[#9ca3af]")}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
