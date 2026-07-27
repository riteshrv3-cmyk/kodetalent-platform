import { useLocation } from "wouter";
import { Cat } from "lucide-react";

export default function RoleSelect() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-paper flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl border-2 border-line flex items-center justify-center mb-6">
        <Cat className="w-8 h-8 text-ink" strokeWidth={2} />
      </div>
      <h1 className="text-[28px] font-extrabold text-ink leading-[1.1] mb-2">KodeTalent</h1>
      <p className="text-[14px] text-ink-muted mb-10 max-w-xs">
        Your AI career companion — mock interviews, job fit, and a daily plan built from real progress.
      </p>

      <button
        onClick={() => setLocation("/onboarding")}
        className="w-full max-w-xs bg-ink text-paper text-[15px] font-bold rounded-2xl py-4"
        data-testid="onboarding-start"
      >
        Start
      </button>
      <button
        onClick={() => setLocation("/sign-in")}
        className="mt-4 text-[13px] font-semibold text-ink-muted underline"
      >
        Already have an account? Sign in
      </button>
    </div>
  );
}
