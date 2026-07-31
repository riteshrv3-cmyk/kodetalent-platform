import { useLocation } from "wouter";
import { Toko } from "@/components/kodetalent/Toko";

/**
 * Landing screen.
 *
 * Deliberately sells one thing: there is work here for you today. The app also
 * has a resume builder, mock interviews and courses — none of them belong on
 * this screen. A first-time student is not choosing between feature sets, they
 * are deciding whether to bother, and a list of features reads as a brochure.
 *
 * Any count shown here has to come from a real endpoint. Do not hardcode one.
 */
export default function RoleSelect() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-brand flex flex-col px-6 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="flex-1 flex flex-col justify-center max-w-md lg:max-w-lg mx-auto w-full">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50 mb-6">
          KodeTalent
        </p>

        {/* Toko is the hero, at a size where the beak actually reads. `priority`
            because this is above the fold on the first screen a student sees. */}
        <Toko pose="hero" size={168} priority className="mb-7 -ml-2" />

        <h1 className="text-[32px] font-extrabold text-white leading-[1.06] tracking-tight mb-3">
          There's work open<br />right now.
        </h1>
        <p className="text-[14px] text-white/70 leading-relaxed">
          Toko reads the job boards every morning and pulls out what a student
          with your branch and year can actually apply to today.
        </p>
      </div>

      <div className="max-w-md lg:max-w-lg mx-auto w-full">
        <button
          onClick={() => setLocation("/onboarding")}
          className="w-full bg-white text-brand text-[15px] font-bold rounded-full py-4"
          data-testid="onboarding-start"
        >
          Show me what's open
        </button>
        <p className="text-center text-[12px] text-white/50 mt-4">
          No account needed to look.
        </p>
        <button
          onClick={() => setLocation("/sign-in")}
          className="w-full mt-5 text-[13px] font-semibold text-white/70 underline"
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
}
