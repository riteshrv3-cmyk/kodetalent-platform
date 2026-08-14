import { Target, Briefcase, FileText, User } from "lucide-react";

/**
 * Shared between BottomNav (mobile) and SideNav (lg+ desktop) so the two
 * shells can never drift out of sync on routes/labels.
 *
 * Order reflects the pipeline the product is about: Resume (build an
 * ATS-friendly resume) leads, then Jobs matched to it, then Prep to rehearse.
 * Profile is account/evidence, so it sits last. The Today/momentum hub still
 * exists at /home but is no longer a nav entry — the pipeline leads instead.
 */
export const NAV_ITEMS = [
  { href: "/resume", icon: FileText, label: "Resume" },
  { href: "/opportunities", icon: Briefcase, label: "Jobs" },
  { href: "/practice", icon: Target, label: "Prep" },
  { href: "/profile", icon: User, label: "Profile" },
];
