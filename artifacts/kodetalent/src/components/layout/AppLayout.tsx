import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-16">
      <main className="max-w-md mx-auto w-full min-h-screen">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
