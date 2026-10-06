/**
 * The ONE place for display formatting (contract item e). Every portal formats money, phone numbers,
 * dates and times through these helpers so the product reads the same everywhere.
 *
 * Money: amounts in this app are rupees (see service-pricing.js). Pass { paise: true } for values that
 * arrive in paise (Razorpay order amounts); the conversion is integer-safe.
 */
import { formatRupees } from "@/lib/service-pricing";
import { formatIsoDate, formatSalonDateTime, salonRelativeDayLabel, salonTimeLabel } from "@/lib/salon-date";

export { formatRupees, formatIsoDate, formatSalonDateTime, salonRelativeDayLabel, salonTimeLabel };

/** Integer paise → rupees without float drift (12345 → 123.45). */
export const paiseToRupees = (paise) => Math.round(Number(paise) || 0) / 100;

/**
 * "₹1,250" (whole rupees, the app default) or "₹1,250.50" with { decimals: true }.
 * @param {number|string} value
 * @param {{ paise?: boolean, decimals?: boolean, compact?: boolean }} [opts]
 */
export function formatMoney(value, { paise = false, decimals = false, compact = false } = {}) {
  const rupees = paise ? paiseToRupees(value) : Number(value) || 0;
  if (compact && Math.abs(rupees) >= 1000) {
    return `₹${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(rupees)}`;
  }
  if (!decimals) return formatRupees(rupees);
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Indian numbers as "+91 98765 43210"; anything else is returned trimmed with its digits grouped.
 * @param {string} phone
 */
export function formatPhone(phone) {
  const raw = `${phone ?? ""}`.trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return raw;
}

/** Last four digits only, for lists shown to other staff ("•••• 3210"). */
export function maskPhone(phone) {
  const digits = `${phone ?? ""}`.replace(/\D/g, "");
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : "";
}

/** "45 min", "1h 15m". */
export function formatDuration(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  if (value < 60) return `${value} min`;
  const h = Math.floor(value / 60);
  const m = value % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** 1 → "1st", 2 → "2nd" … for queue positions. */
export function ordinal(n) {
  const v = Math.abs(Math.trunc(Number(n) || 0));
  const s = ["th", "st", "nd", "rd"];
  const mod = v % 100;
  return `${v}${s[(mod - 20) % 10] || s[mod] || s[0]}`;
}
