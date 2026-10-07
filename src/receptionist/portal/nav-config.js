import { CalendarDays, LayoutDashboard, UserCircle, UserPlus } from "lucide-react";

export const RECEPTION_HOME = "/reception-dashboard";
export const RECEPTION_WALK_IN = "/reception-dashboard/walk-in";
export const RECEPTION_SCHEDULE = "/reception-dashboard/appointments";
export const RECEPTION_PROFILE = "/reception-dashboard/profile";
export const RECEPTION_COLLECT = "/reception-dashboard#collect-payment";

export const receptionNavItems = [
  { label: "Today", href: RECEPTION_HOME, icon: LayoutDashboard },
  { label: "Walk-in", href: RECEPTION_WALK_IN, icon: UserPlus },
  { label: "Schedule", href: RECEPTION_SCHEDULE, icon: CalendarDays },
  { label: "Profile", href: RECEPTION_PROFILE, icon: UserCircle },
];
