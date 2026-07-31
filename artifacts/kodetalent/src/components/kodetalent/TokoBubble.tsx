import { useLocation } from "wouter";
import { Toko } from "./Toko";

const HIDDEN_ON = ["/chat", "/onboarding"];
const HIDDEN_PREFIXES = ["/practice/interview/"];

/** Floating action button that opens Toko chat. Hidden on /chat itself and fullscreen routes. */
export function TokoBubble() {
  const [location, setLocation] = useLocation();
  if (HIDDEN_ON.includes(location) || HIDDEN_PREFIXES.some((p) => location.startsWith(p))) return null;

  return (
    <button
      type="button"
      onClick={() => setLocation("/chat")}
      aria-label="Chat with Toko"
      className="fixed right-4 z-30 w-14 h-14 rounded-full bg-brand flex items-center justify-center shadow-[0_10px_28px_rgba(74,85,199,0.35)] active:scale-95 transition-transform"
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      <Toko size={30} />
    </button>
  );
}
