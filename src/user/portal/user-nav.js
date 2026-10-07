import { CalendarCheck2, CalendarPlus, Crown, Gift, Home, Hourglass, Tag, UserRound } from "lucide-react";

export const USER_HOME = "/user-dashboard";

/** Every customer destination. Order = desktop sidebar order. */
export const USER_NAV = [
  { label: "Home", href: USER_HOME, icon: Home },
  { label: "Book", href: "/user-dashboard/appointments", icon: CalendarPlus },
  { label: "Bookings", href: "/user-dashboard/booking-history", icon: CalendarCheck2 },
  { label: "Queue", href: "/user-dashboard/queue", icon: Hourglass },
  { label: "Offers", href: "/user-dashboard/offers", icon: Tag },
  { label: "Rewards", href: "/user-dashboard/loyalty", icon: Gift },
  { label: "Membership", href: "/user-dashboard/membership", icon: Crown },
  { label: "Profile", href: "/user-dashboard/profile", icon: UserRound },
];

/** Phone tab bar (max 4); the rest live in the shell's "More" sheet. */
export const USER_TABS = [USER_HOME, "/user-dashboard/appointments", "/user-dashboard/booking-history", "/user-dashboard/loyalty"];

export const userPath = (label) => USER_NAV.find((item) => item.label === label)?.href ?? USER_HOME;
