import { Activity, BarChart3, Calendar, Crown, Gift, KeyRound, LayoutDashboard, MessageSquareHeart, Scissors, Settings, Sparkles, UserPlus, Users, Wallet } from "lucide-react";

/**
 * Phase-1 admin navigation:
 * show only flows that are truly implemented end-to-end.
 * Add more entries as each feature reaches production readiness.
 *
 * Grouped for the sidebar UI; `adminNavItems` (flat) is kept for anything
 * that still wants a plain list (e.g. active-route matching).
 */
export const adminNavGroups = [
    {
        label: "Overview",
        items: [
            { label: "Dashboard", href: "/admin-dashboard", icon: LayoutDashboard, description: "Command center" },
            { label: "Bookings", href: "/admin-dashboard/appointments", icon: Calendar, description: "All appointments" },
            { label: "Stylist Live Monitor", href: "/admin-dashboard/staff/live-monitor", icon: Activity, description: "Real-time floor" },
        ],
    },
    {
        label: "Catalog & Growth",
        items: [
            { label: "Services", href: "/admin-dashboard/services", icon: Scissors, description: "Menu & pricing" },
            { label: "Offer Center", href: "/admin-dashboard/offers", icon: Gift, description: "Discounts & combos" },
            { label: "Membership Plans", href: "/admin-dashboard/membership", icon: Crown, description: "Plan tiers" },
            { label: "Loyalty & Referrals", href: "/admin-dashboard/loyalty", icon: Sparkles, description: "Rewards & wallet" },
        ],
    },
    {
        label: "Workforce",
        items: [
            { label: "Team", href: "/admin-dashboard/staff", icon: Users, description: "Staff & receptionists" },
            { label: "Create Staff", href: "/admin-dashboard/staff/new", icon: UserPlus, description: "Onboard a teammate" },
            { label: "Staff Permissions", href: "/admin-dashboard/staff/permissions", icon: KeyRound, description: "Service access" },
            { label: "Stylist Payroll", href: "/admin-dashboard/staff/payroll", icon: Wallet, description: "Deductions" },
        ],
    },
    {
        label: "Insights",
        items: [
            { label: "Revenue Reports", href: "/admin-dashboard/reports", icon: BarChart3, description: "Income & trends" },
            { label: "Feedback & Reviews", href: "/admin-dashboard/feedback", icon: MessageSquareHeart, description: "Ratings & complaints" },
            { label: "Customers", href: "/admin-dashboard/customers", icon: Users, description: "Client roster" },
            { label: "Settings", href: "/admin-dashboard/settings", icon: Settings, description: "Profile & salons" },
        ],
    },
];

export const adminNavItems = adminNavGroups.flatMap((group) => group.items);
