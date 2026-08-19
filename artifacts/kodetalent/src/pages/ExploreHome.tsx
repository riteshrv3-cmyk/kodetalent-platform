import { ClaimOnSignIn } from "@/components/ClaimOnSignIn";

// STUB — replaced by the full feature-cards home (Step 2a). Keep <ClaimOnSignIn/>
// mounted here: "/" is where a signed-in Clerk user lands and claims their row.
export default function ExploreHome() {
  return (
    <div className="px-6 pt-6">
      <ClaimOnSignIn />
      <h1 className="text-display text-2xl font-bold text-ink">KodeTalent</h1>
    </div>
  );
}
