import { Activity, BarChart3, Calendar, Crown, Gift, KeyRound, LayoutDashboard, MessageSquareHeart, Scissors, Settings, Sparkles, UserPlus, UserRound, Users, Wallet } from "lucide-react";

/**
 * Admin navigation. Only flows that are implemented end-to-end are listed.
 * `label` is the short name used in the sidebar, tab bar and "More" sheet; `description` is the
 * hint shown in the command palette. Groups only drive the palette headings (PortalShell's nav is flat).
 */
export const adminNavGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin-dashboard", icon: LayoutDashboard, description: "Today at a glance" },
      { label: "Bookings", href: "/admin-dashboard/appointments", icon: Calendar, description: "All appointments" },
      { label: "Live floor", href: "/admin-dashboard/staff/live-monitor", icon: Activity, description: "Services in progress" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Services", href: "/admin-dashboard/services", icon: Scissors, description: "Menu, prices, photos" },
      { label: "Offers", href: "/admin-dashboard/offers", icon: Gift, description: "Discounts and combos" },
      { label: "Memberships", href: "/admin-dashboard/membership", icon: Crown, description: "Razorpay plans" },
      { label: "Loyalty", href: "/admin-dashboard/loyalty", icon: Sparkles, description: "Rewards and referrals" },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "Team", href: "/admin-dashboard/staff", icon: Users, description: "Staff and receptionists" },
      { label: "Add staff", href: "/admin-dashboard/staff/new", icon: UserPlus, description: "Onboard a teammate" },
      { label: "Permissions", href: "/admin-dashboard/staff/permissions", icon: KeyRound, description: "Who can do which service" },
      { label: "Payroll", href: "/admin-dashboard/staff/payroll", icon: Wallet, description: "Deductions" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Revenue", href: "/admin-dashboard/reports", icon: BarChart3, description: "Income, refunds, invoices" },
      { label: "Feedback", href: "/admin-dashboard/feedback", icon: MessageSquareHeart, description: "Ratings and complaints" },
      { label: "Customers", href: "/admin-dashboard/customers", icon: UserRound, description: "Client roster" },
      { label: "Settings", href: "/admin-dashboard/settings", icon: Settings, description: "Business profile, salons, AI" },
    ],
  },
];

export const adminNavItems = adminNavGroups.flatMap((group) => group.items);

/** The four destinations in the phone tab bar; everything else lives in "More". */
export const adminTabHrefs = ["/admin-dashboard", "/admin-dashboard/appointments", "/admin-dashboard/services", "/admin-dashboard/reports"];
