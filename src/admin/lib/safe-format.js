/**
 * Null-safe wrappers around the shared helpers in @/lib/format and @/lib/salon-date.
 * API rows sometimes carry an empty or malformed timestamp; Intl throws on those, so admin screens
 * go through these and show "—" instead of crashing. Formatting itself stays in the shared helpers.
 */
import { formatIsoDate, formatSalonDateTime, salonDateOf, salonRelativeDayLabel, salonTimeLabel } from "@/lib/salon-date";

export const isValidInstant = (value) => value != null && value !== "" && !Number.isNaN(new Date(value).getTime());

/** "3:15 pm" (salon time) or "—". */
export const timeOf = (value) => (isValidInstant(value) ? salonTimeLabel(value) : "—");

/** "Today 3:15 pm", "Tomorrow 11:00 am", "Mon, 6 Oct 4:30 pm" or "—". */
export const dayTimeOf = (value) => (isValidInstant(value) ? `${salonRelativeDayLabel(salonDateOf(value))} · ${salonTimeLabel(value)}` : "—");

/** Full salon date + time or "—". */
export const dateTimeOf = (value) => (isValidInstant(value) ? formatSalonDateTime(value) : "—");

/** "6 Oct 2026" style date of an instant (salon calendar) or "—". */
export const dateOf = (value, options = { day: "numeric", month: "short", year: "numeric" }) => (isValidInstant(value) ? formatIsoDate(salonDateOf(value), options) : "—");
