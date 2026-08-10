import { ReactNode, useState } from "react";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { SideNav } from "./SideNav";
import { ProfileSidebar } from "./ProfileSidebar";
import { OfflineBanner } from "./OfflineBanner";
import { TokoBubble } from "@/components/kodetalent/TokoBubble";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { useStudentProfile } from "@/hooks/useStudentProfile";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const ini = parts.map((p) => p[0]).join("").substring(0, 2).toUpperCase();
  return ini || "?";
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const studentId = localStorage.getItem("studentId");
  // Same react-query key as Home's useStudentProfile() call — concurrent mounts
  // share one in-flight request instead of each firing its own full-profile fetch.
  const { data: profile } = useStudentProfile(studentId);
  const initials = profile?.name ? initialsFromName(profile.name) : "?";

  const isFullscreenRoute = location.startsWith("/practice/interview/") || location === "/onboarding";

  if (isFullscreenRoute) {
    return <div className="min-h-[100dvh] bg-canvas" style={{ overflowX: "clip" }}>{children}</div>;
  }

  return (
    // lg:pl-[240px] on the OUTER container reserves the fixed SideNav's width,
    // so <main>'s own max-w + mx-auto center within the space actually left
    // over — not within the full viewport minus a padding on main itself.
    <div className="min-h-[100dvh] bg-canvas lg:pl-[240px]" style={{ isolation: "isolate", overflowX: "clip" }}>
      <TopBar
        initials={initials}
        streakCount={profile?.streakCount ?? 0}
        onProfileClick={() => setSidebarOpen(true)}
      />
      <SideNav
        initials={initials}
        streakCount={profile?.streakCount ?? 0}
        onProfileClick={() => setSidebarOpen(true)}
      />

      {/* pt clears the TopBar (h-14) plus the status-bar inset the TopBar now
          absorbs, since the page renders with viewport-fit=cover. */}
      <main className="max-w-md mx-auto w-full pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))] min-h-[100dvh] lg:max-w-5xl lg:px-8 lg:pt-8 lg:pb-8">
        <OfflineBanner />
        {/* No willChange/backfaceVisibility on this wrapper: a persistent
            stacking context here traps every in-page fixed overlay
            (Prep/Resume/Opportunities bottom sheets) beneath BottomNav. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <TokoBubble />
      <BottomNav />

      <AnimatePresence>
        {sidebarOpen && (
          <ProfileSidebar onClose={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
