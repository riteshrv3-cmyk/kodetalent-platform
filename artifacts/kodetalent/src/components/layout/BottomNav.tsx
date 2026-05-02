import { Link, useLocation } from "wouter";
import { Home, Map, Zap, Briefcase, User, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/roadmap", icon: Map, label: "Map" },
    { href: "/prep", icon: Zap, label: "Zap" },
    { href: "/jobs", icon: Briefcase, label: "Briefcase" },
    { href: "/profile", icon: User, label: "User" },
    { href: "/leaderboard", icon: Trophy, label: "Trophy" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#ede9fe] pb-safe shadow-[0_-4px_24px_rgba(124,58,237,0.05)]">
      <div className="flex justify-around items-center h-[72px] max-w-md mx-auto px-2 relative">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors relative",
                isActive ? "text-primary" : "text-[#6b7280] hover:text-primary/70"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary"
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
