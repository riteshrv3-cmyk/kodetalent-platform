import { Flame, Target, Briefcase, FileText, User } from "lucide-react";

/**
 * Shared between BottomNav (mobile) and SideNav (lg+ desktop) so the two
 * shells can never drift out of sync on routes/labels.
 *
 * Order: Today leads (design v3 — the daily-momentum hub is the entry
 * point), then Resume (the core product), Jobs, Practice, Profile.
 */
export const NAV_ITEMS = [
  { href: "/home", icon: Flame, label: "Today" },
  { href: "/resume", icon: FileText, label: "Resume" },
  { href: "/opportunities", icon: Briefcase, label: "Jobs" },
  { href: "/practice", icon: Target, label: "Prep" },
  { href: "/profile", icon: User, label: "Profile" },
];
