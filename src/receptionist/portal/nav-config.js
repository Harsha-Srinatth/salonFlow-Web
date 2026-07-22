import { Calendar, LayoutDashboard, UserCircle, UserPlus } from "lucide-react";

export const receptionNavItems = [
  { label: "Command Center", href: "/reception-dashboard", icon: LayoutDashboard },
  { label: "Walk-in booking", href: "/reception-dashboard/walk-in", icon: UserPlus },
  { label: "Today's schedule", href: "/reception-dashboard/appointments", icon: Calendar },
  { label: "Profile", href: "/reception-dashboard/profile", icon: UserCircle },
];