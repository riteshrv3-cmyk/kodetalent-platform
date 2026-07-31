import { Target, Briefcase, FileText, User } from "lucide-react";

/**
 * Shared between BottomNav (mobile) and SideNav (lg+ desktop) so the two
 * shells can never drift out of sync on routes/labels.
 *
 * Order: Resume first (it is the core product), Jobs, Practice, Profile.
 * /home is still registered in App.tsx as a valid route but is not in the nav.
 */
export const NAV_ITEMS = [
  { href: "/resume", icon: FileText, label: "Resume" },
  { href: "/opportunities", icon: Briefcase, label: "Jobs" },
  { href: "/practice", icon: Target, label: "Prep" },
  { href: "/profile", icon: User, label: "Profile" },
];
