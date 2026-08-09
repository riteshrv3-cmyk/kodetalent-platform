import { Link, useLocation } from "wouter";
import { Toko } from "@/components/kodetalent/Toko";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./navItems";

interface SideNavProps {
  initials: string;
  onProfileClick: () => void;
}

/**
 * Desktop-only (lg+) left sidebar. Takes over the navigation role BottomNav +
 * TopBar carry on mobile (both are `lg:hidden`): same routes via the shared
 * NAV_ITEMS, plus Toko which lives in TokoBubble on mobile.
 * The bottom avatar chip opens the same ProfileSidebar drawer as the TopBar
 * avatar button does on mobile — it's account/logout, not the /profile page
 * (that's the "Profile" nav item above it).
 */
export function SideNav({ initials, onProfileClick }: SideNavProps) {
  const [location, setLocation] = useLocation();

  return (
    <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] flex-col bg-paper border-r border-line z-40">
      <div className="px-6 pt-6 pb-4">
        <span className="font-extrabold text-ink text-lg tracking-tight">KodeTalent</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-colors",
                isActive ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-line/60",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setLocation("/chat")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold text-ink-muted hover:bg-line/60 transition-colors"
        >
          <Toko size={20} />
          Chat with Toko
        </button>
      </nav>

      <div className="px-3 pb-6">
        <button
          type="button"
          onClick={onProfileClick}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-line/60 transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-brand-soft flex items-center justify-center text-brand font-bold text-[12px] shrink-0">
            {initials}
          </span>
          <span className="text-[13px] font-semibold text-ink">Account</span>
        </button>
      </div>
    </div>
  );
}
