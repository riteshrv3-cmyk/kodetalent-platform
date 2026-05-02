import { Link, useLocation } from "wouter";
import { Home, BookOpen, Zap, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/roadmap", icon: BookOpen, label: "Roadmap" },
    { href: "/prep", icon: Zap, label: "Practice" },
    { href: "/opportunities", icon: Sparkles, label: "Opportunities" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#ede9fe] pb-safe shadow-[0_-4px_24px_rgba(124,58,237,0.05)]">
      <div className="flex justify-around items-center h-[64px] max-w-md mx-auto px-2 relative">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative",
                isActive ? "text-primary" : "text-[#9ca3af] hover:text-primary/70"
              )}
            >
              <Icon className="h-5 w-5 transition-all" />
              <span className={cn("text-[10px] font-bold transition-colors", isActive ? "text-primary" : "text-[#9ca3af]")}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
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
