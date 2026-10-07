import { CalendarDays, Sun, UserCircle } from "lucide-react";

export const employeeNavItems = [
  { label: "My day", href: "/employee-dashboard", icon: Sun },
  { label: "Bookings", href: "/employee-dashboard/appointments", icon: CalendarDays },
  { label: "Profile", href: "/employee-dashboard/profile", icon: UserCircle },
];
