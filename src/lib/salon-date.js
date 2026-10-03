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
