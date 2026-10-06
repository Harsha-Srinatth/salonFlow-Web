/**
 * THE status → tone + icon + label mapping (contract item a). Every portal renders statuses through
 * <StatusChip>, which reads this table. Values are the real ones the API sends (bookings, queue,
 * payments, memberships, referrals, feedback). Unknown values fall back to a neutral chip.
 */
import {
  Ban,
  BadgeCheck,
  CalendarCheck,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Footprints,
  Gift,
  Hourglass,
  MessageSquareWarning,
  Scissors,
  ShieldAlert,
  ThumbsUp,
  TimerOff,
  Undo2,
  UserX,
} from "lucide-react";

/** Tone → classes. Inks are AA on the tinted background in both themes (see DESIGN.md). */
export const TONE_CLASSES = {
  primary: "bg-primary/12 text-ink-primary ring-primary/25",
  success: "bg-success/12 text-ink-success ring-success/25",
  warning: "bg-warning/14 text-ink-warning ring-warning/30",
  destructive: "bg-destructive/12 text-ink-destructive ring-destructive/25",
  info: "bg-info/12 text-ink-info ring-info/25",
  plum: "bg-plum/12 text-ink-plum ring-plum/25",
  neutral: "bg-muted text-ink-neutral ring-border",
  gold: "bg-gold/16 text-ink-warning ring-gold/35",
};

/** Solid dot colour per tone (for timelines, legends, calendar dots). */
export const TONE_DOT = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  plum: "bg-plum",
  neutral: "bg-muted-foreground",
  gold: "bg-gold",
};

export const STATUS_META = {
  // Bookings + live queue (the core six)
  PENDING: { label: "Pending", tone: "warning", icon: Clock },
  CONFIRMED: { label: "Confirmed", tone: "primary", icon: CalendarCheck },
  STARTED: { label: "In service", tone: "info", icon: Scissors, live: true },
  COMPLETED: { label: "Completed", tone: "success", icon: CircleCheck },
  CANCELLED: { label: "Cancelled", tone: "destructive", icon: CircleX },
  "NO-SHOW": { label: "No-show", customerLabel: "Missed", tone: "plum", icon: UserX },
  // Payments
  PAID: { label: "Paid", tone: "success", icon: BadgeCheck },
  FAILED: { label: "Failed", tone: "destructive", icon: CircleAlert },
  REFUNDED: { label: "Refunded", tone: "info", icon: Undo2 },
  EXPIRED: { label: "Expired", tone: "neutral", icon: TimerOff },
  // Memberships / staff / offers
  ACTIVE: { label: "Active", tone: "success", icon: CircleCheck },
  INACTIVE: { label: "Inactive", tone: "neutral", icon: CircleDashed },
  // Referrals
  FIRST_ACTION_DONE: { label: "Visited", tone: "primary", icon: Footprints },
  COOLING: { label: "Verifying", tone: "info", icon: Hourglass },
  APPROVED: { label: "Approved", tone: "primary", icon: ThumbsUp },
  REWARDED: { label: "Rewarded", tone: "gold", icon: Gift },
  REJECTED: { label: "Rejected", tone: "destructive", icon: Ban },
  "NEEDS REVIEW": { label: "Needs review", tone: "warning", icon: ShieldAlert },
  // Feedback
  OPEN: { label: "Open", tone: "warning", icon: MessageSquareWarning },
  RESOLVED: { label: "Resolved", tone: "success", icon: CircleCheck },
};

const ALIASES = { NO_SHOW: "NO-SHOW", NOSHOW: "NO-SHOW", "CLIENT DID NOT VISIT": "NO-SHOW", CANCELED: "CANCELLED", IN_PROGRESS: "STARTED", NEEDS_REVIEW: "NEEDS REVIEW" };

export const normalizeStatus = (status) => {
  const key = `${status ?? ""}`.trim().toUpperCase();
  return ALIASES[key] ?? key;
};

/**
 * @param {string} status
 * @param {{ audience?: "customer"|"staff" }} [opts]
 * @returns {{ key: string, label: string, tone: string, icon: any, live?: boolean }}
 */
export function getStatusMeta(status, { audience = "staff" } = {}) {
  const key = normalizeStatus(status);
  const meta = STATUS_META[key];
  if (!meta) {
    const label = key ? key.charAt(0) + key.slice(1).toLowerCase().replace(/[_-]/g, " ") : "Unknown";
    return { key, label, tone: "neutral", icon: CircleDashed };
  }
  return { key, ...meta, label: audience === "customer" && meta.customerLabel ? meta.customerLabel : meta.label };
}

/** The booking lifecycle in order, for timelines and filters. */
export const BOOKING_FLOW = ["PENDING", "CONFIRMED", "STARTED", "COMPLETED"];
export const BOOKING_TERMINAL_OFF_FLOW = ["CANCELLED", "NO-SHOW"];

/** Ink (text/icon) colour per tone, AA on card in both themes. */
export const TONE_INK = {
  primary: "text-ink-primary",
  success: "text-ink-success",
  warning: "text-ink-warning",
  destructive: "text-ink-destructive",
  info: "text-ink-info",
  plum: "text-ink-plum",
  neutral: "text-ink-neutral",
  gold: "text-ink-warning",
};
