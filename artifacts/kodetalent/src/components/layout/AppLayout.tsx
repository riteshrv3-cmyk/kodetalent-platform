import { ReactNode, useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { ProfileSidebar } from "./ProfileSidebar";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [initials, setInitials] = useState("?");

  useEffect(() => {
    const name = localStorage.getItem("studentName") || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const ini = parts.map((p) => p[0]).join("").substring(0, 2).toUpperCase();
    setInitials(ini || "?");
  }, []);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) return;

    const fetchCount = async () => {
      try {
        const res = await fetch(`${BASE}/api/students/${id}/invites`);
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

  return (
    <div className="min-h-[100dvh] bg-[#f5f3ff]">
      <TopBar
        pendingCount={pendingCount}
        initials={initials}
        onProfileClick={() => setSidebarOpen(true)}
      />

      <main className="max-w-md mx-auto w-full pt-14 pb-16 min-h-[100dvh] overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />

      <AnimatePresence>
        {sidebarOpen && (
          <ProfileSidebar onClose={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
