import { Calendar, LayoutDashboard, UserCircle } from "lucide-react";

export const employeeNavItems = [
  { label: "My shift", href: "/employee-dashboard", icon: LayoutDashboard },
  { label: "Appointments", href: "/employee-dashboard/appointments", icon: Calendar },
  { label: "Profile", href: "/employee-dashboard/profile", icon: UserCircle },
];
