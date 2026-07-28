import { Home, Target, Briefcase, FileText, User } from "lucide-react";

/**
 * Shared between BottomNav (mobile) and SideNav (lg+ desktop) so the two
 * shells can never drift out of sync on routes/labels.
 */
export const NAV_ITEMS = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/practice", icon: Target, label: "Prep" },
  { href: "/opportunities", icon: Briefcase, label: "Jobs" },
  { href: "/resume", icon: FileText, label: "Resume" },
  { href: "/profile", icon: User, label: "Profile" },
];
