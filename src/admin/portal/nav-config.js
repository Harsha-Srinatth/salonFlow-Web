import { Activity, BarChart3, Calendar, Crown, Gift, KeyRound, LayoutDashboard, Scissors, UserPlus, Wallet } from "lucide-react";

/**
 * Phase-1 admin navigation:
 * show only flows that are truly implemented end-to-end.
 * Add more entries as each feature reaches production readiness.
 */
export const adminNavItems = [
    { label: "Dashboard", href: "/admin-dashboard", icon: LayoutDashboard },
    { label: "Bookings", href: "/admin-dashboard/appointments", icon: Calendar },
    { label: "Stylist Live Monitor", href: "/admin-dashboard/staff/live-monitor", icon: Activity },
    { label: "Services", href: "/admin-dashboard/services", icon: Scissors },
    { label: "Offer Center", href: "/admin-dashboard/offers", icon: Gift },
    { label: "Membership Plans", href: "/admin-dashboard/membership", icon: Crown },
    { label: "Staff Permissions", href: "/admin-dashboard/staff/permissions", icon: KeyRound },
    { label: "Stylist Payroll", href: "/admin-dashboard/staff/payroll", icon: Wallet },
    { label: "Revenue Reports", href: "/admin-dashboard/reports", icon: BarChart3 },
    { label: "Create Staff", href: "/admin-dashboard/staff/new", icon: UserPlus },
];
