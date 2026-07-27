import { Cat } from "lucide-react";
import { useLocation } from "wouter";

const HIDDEN_ON = ["/chat", "/onboarding"];
const HIDDEN_PREFIXES = ["/practice/interview/"];

/** Floating action button that opens Kit chat. Hidden on /chat itself and fullscreen routes. */
export function KitBubble() {
  const [location, setLocation] = useLocation();
  if (HIDDEN_ON.includes(location) || HIDDEN_PREFIXES.some((p) => location.startsWith(p))) return null;

  return (
    <button
      type="button"
      onClick={() => setLocation("/chat")}
      aria-label="Chat with Kit"
      className="fixed right-4 z-30 w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      <Cat className="w-6 h-6" strokeWidth={2} />
    </button>
  );
}
