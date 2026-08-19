import { createContext, useContext, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { useStudentId } from "@/hooks/useStudentId";

// Explore-mode signposting, centralized. The design review found SAMPLE chips
// repeated 3x per screen — chip spam dilutes the signal. The rule now lives in
// one place: a surface declares demo mode ONCE (DemoSurface renders the banner
// and marks the subtree), and any <SampleChip/> rendered inside that subtree
// auto-suppresses. Chips only render standalone (outside a DemoSurface) where
// a lone card needs marking.

const DemoSurfaceContext = createContext(false);

/**
 * Wrap a page's demo-mode content. Renders the DemoBanner once (when in demo
 * mode) and suppresses all descendant SampleChips. In real mode it renders
 * children untouched.
 */
export function DemoSurface({
  children,
  banner = true,
  className = "",
}: {
  children: ReactNode;
  banner?: boolean;
  className?: string;
}) {
  const { isDemo } = useStudentId();
  if (!isDemo) return <>{children}</>;
  return (
    <DemoSurfaceContext.Provider value={true}>
      {banner && <DemoBanner className={className} />}
      {children}
    </DemoSurfaceContext.Provider>
  );
}

export function DemoBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl bg-brand-soft px-3.5 py-2.5 text-brand ${className}`}
      role="note"
    >
      <Eye className="w-4 h-4 flex-shrink-0" />
      {/* Explicit text-brand: a base element style would otherwise beat the
          inherited container color and render this ink-muted (audit-caught). */}
      <p className="type-caption font-semibold leading-tight text-brand">
        You're viewing a sample student — tap any action to start your own.
      </p>
    </div>
  );
}

/**
 * Small "Sample" pill. Auto-suppressed inside a <DemoSurface> (the banner
 * already declares the mode there — one signal per surface).
 */
export function SampleChip({ className = "" }: { className?: string }) {
  const insideSurface = useContext(DemoSurfaceContext);
  if (insideSurface) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 type-micro font-bold uppercase tracking-wider text-brand ${className}`}
    >
      Sample
    </span>
  );
}
