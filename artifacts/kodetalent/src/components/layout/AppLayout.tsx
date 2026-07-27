import { ReactNode, useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { ProfileSidebar } from "./ProfileSidebar";
import { KitBubble } from "@/components/kodetalent/KitBubble";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api/authFetch";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const ini = parts.map((p) => p[0]).join("").substring(0, 2).toUpperCase();
  return ini || "?";
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [initials, setInitials] = useState("?");

  const isFullscreenRoute = location.startsWith("/practice/interview/") || location === "/onboarding";

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) return;

    apiFetch(`/api/students/${id}/full-profile`)
      .then((r) => (r.ok ? r.json() : null))
      .then((profile: { name?: string } | null) => {
        if (profile?.name) setInitials(initialsFromName(profile.name));
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) return;

    const fetchCount = async () => {
      try {
        const res = await apiFetch(`/api/students/${id}/invites`);
        if (!res.ok) return;
        const data = await res.json() as Array<{ status: string; studentSeen: boolean }>;
        const count = Array.isArray(data)
          ? data.filter((inv) => inv.status === "pending" && !inv.studentSeen).length
          : 0;
        setPendingCount(count);
      } catch {
        // silently ignore
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (isFullscreenRoute) {
    return <div className="min-h-[100dvh] bg-canvas" style={{ overflowX: "clip" }}>{children}</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-canvas" style={{ isolation: "isolate", overflowX: "clip" }}>
      <TopBar
        pendingCount={pendingCount}
        initials={initials}
        onProfileClick={() => setSidebarOpen(true)}
      />

      <main className="max-w-md mx-auto w-full pt-14 pb-[calc(4rem+env(safe-area-inset-bottom))] min-h-[100dvh]">
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

      <KitBubble />
      <BottomNav />

      <AnimatePresence>
        {sidebarOpen && (
          <ProfileSidebar onClose={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
