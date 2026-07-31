import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./navItems";

/**
 * 4-tab shell per the Phase 2 IA plan: every core feature gets one address.
 * Prep = interviews + tests + courses. Jobs = feed + drive-check + resume.
 * Profile = profile + projects + resume builder. Toko's chat becomes a
 * floating bubble (tracked separately) rather than a 5th tab.
 * lg+ (desktop) uses SideNav instead — this stays mobile/tablet only.
 */
export function BottomNav() {
  const [location] = useLocation();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-paper border-t border-line pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {NAV_ITEMS.map((item) => {
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
