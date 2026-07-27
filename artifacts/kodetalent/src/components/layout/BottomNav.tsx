import { Link, useLocation } from "wouter";
import { Home, Target, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 4-tab shell per the Phase 2 IA plan: every core feature gets one address.
 * Prep = interviews + tests + courses. Jobs = feed + drive-check + resume.
 * Profile = profile + projects + resume builder. Kit's chat becomes a
 * floating bubble (tracked separately) rather than a 5th tab.
 * Styled per design-system-phase3.md — monochrome, no active-tab pill glow.
 */
export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/practice", icon: Target, label: "Prep" },
    { href: "/opportunities", icon: Briefcase, label: "Jobs" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-paper border-t border-line pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center w-full h-full gap-1"
            >
              <Icon className={cn("h-[22px] w-[22px]", isActive ? "text-brand" : "text-ink-muted")} strokeWidth={isActive ? 2.4 : 2} />
              <span className={cn("text-[10px] font-semibold", isActive ? "text-brand" : "text-ink-muted")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
