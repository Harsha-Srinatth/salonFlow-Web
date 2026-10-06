/**
 * "Today" and "tomorrow" in the salon's time zone, as YYYY-MM-DD.
 *
 * `new Date().toISOString().slice(0, 10)` is the UTC date: in India it is still *yesterday*
 * until 05:30, so between midnight and 05:30 the booking screens offered yesterday as "Today"
 * (which the server rejects) and today as "Tomorrow". The backend uses SALON_TIMEZONE; this must
 * match it (VITE_SALON_TIMEZONE, default Asia/Kolkata).
 */
const ZONE = import.meta.env.VITE_SALON_TIMEZONE || "Asia/Kolkata";

let formatter;
function salonFormatter() {
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      formatter = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
    }
  }
  return formatter;
}

/** Salon-local calendar date `offsetDays` from now (0 = today). */
export function salonDateIso(offsetDays = 0, now = new Date()) {
  const today = salonFormatter().format(now); // en-CA formats as YYYY-MM-DD
  if (!offsetDays) return today;
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + offsetDays)).toISOString().slice(0, 10);
}

let timeFormatter;
let hourFormatter;
/** "3:15 pm" in salon time, whatever time zone the customer's device is set to. */
export function salonTimeLabel(iso) {
  if (!timeFormatter) {
    try {
      timeFormatter = new Intl.DateTimeFormat(undefined, { timeZone: ZONE, hour: "numeric", minute: "2-digit" });
    } catch {
      timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
    }
  }
  return timeFormatter.format(new Date(iso));
}

/** Hour of day (0-23) in salon time. */
export function salonHour(iso) {
  if (!hourFormatter) {
    try {
      hourFormatter = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, hour: "numeric", hourCycle: "h23" });
    } catch {
      hourFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23" });
    }
  }
  return Number(hourFormatter.format(new Date(iso))) % 24;
}

/* ---- Additive helpers for the design kit (DateStrip, MonthExpander, formatting). ----
   Everything works on salon-local "YYYY-MM-DD" strings and does arithmetic in UTC so the
   device's own time zone can never shift a day. */

/** The salon time zone in use (VITE_SALON_TIMEZONE, default Asia/Kolkata). */
export const SALON_TIMEZONE = ZONE;

const isoToUtc = (iso) => {
  const [y, m, d] = `${iso}`.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
};

/** `iso` plus `days` (may be negative), as YYYY-MM-DD. */
export function addDaysIso(iso, days) {
  const date = isoToUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (b - a). */
export function diffDaysIso(a, b) {
  return Math.round((isoToUtc(b) - isoToUtc(a)) / 86400000);
}

/** 0 = Sunday … 6 = Saturday for a YYYY-MM-DD. */
export function weekdayIndexIso(iso) {
  return isoToUtc(iso).getUTCDay();
}

const partFormatters = new Map();
/** Format a YYYY-MM-DD with Intl options, without any time-zone drift ("Mon", "6 Oct", "October 2026"). */
export function formatIsoDate(iso, options = { day: "numeric", month: "short" }, locale = "en-IN") {
  const key = `${locale}|${JSON.stringify(options)}`;
  if (!partFormatters.has(key)) partFormatters.set(key, new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }));
  return partFormatters.get(key).format(isoToUtc(iso));
}

/** "Today", "Tomorrow", or "Mon, 6 Oct" relative to the salon's today. */
export function salonRelativeDayLabel(iso, now = new Date()) {
  const today = salonDateIso(0, now);
  const diff = diffDaysIso(today, iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatIsoDate(iso, { weekday: "short", day: "numeric", month: "short" });
}

/** Salon-local YYYY-MM-DD of an instant (ISO timestamp or Date). */
export function salonDateOf(instant) {
  return salonFormatter().format(new Date(instant));
}

/** "Mon, 6 Oct · 3:15 pm" in salon time for an ISO timestamp. */
export function formatSalonDateTime(instant) {
  return `${formatIsoDate(salonDateOf(instant), { weekday: "short", day: "numeric", month: "short" })} · ${salonTimeLabel(instant)}`;
}

/** First day (YYYY-MM-01) of the month containing `iso`, shifted by `offsetMonths`. */
export function monthStartIso(iso, offsetMonths = 0) {
  const date = isoToUtc(iso);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offsetMonths, 1)).toISOString().slice(0, 10);
}

/** Number of days in the month containing `iso`. */
export function daysInMonthIso(iso) {
  const date = isoToUtc(iso);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}
