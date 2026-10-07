import { formatMoney, maskPhone as maskPhoneDigits } from "@/lib/format";
import { formatSalonDateTime, salonDateIso, salonDateOf, salonTimeLabel } from "@/lib/salon-date";
import { normalizeStatus } from "@/components/kit/status-meta";

export const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "STARTED"];
export const WAITING_STATUSES = ["PENDING", "CONFIRMED"];

/** Time of a booking in salon time ("3:15 pm"). */
export function formatBookingTime(iso) {
  return iso ? salonTimeLabel(iso) : "—";
}

/** Date + time of a booking in salon time. Also used by the shared cancel dialog (admin + reception). */
export function formatBookingDateTime(iso) {
  return iso ? formatSalonDateTime(iso) : "—";
}

/** Money for the reception desk. Also used by the shared cancel dialog. */
export function formatCurrency(amount) {
  return formatMoney(amount, { decimals: !Number.isInteger(Number(amount ?? 0)) });
}

export function isCriticalDelay(booking, nowMs = Date.now()) {
  if (booking?.status !== "STARTED") return false;
  const startedAt = new Date(booking.actualStartAt ?? booking.startsAt).getTime();
  if (!Number.isFinite(startedAt)) return false;
  const plannedMs = Number(booking.durationMinutes ?? 0) * 60 * 1000;
  const elapsedMs = Math.max(0, nowMs - startedAt);
  return elapsedMs - plannedMs > 10 * 60 * 1000;
}

export function maskEmail(email) {
  const value = `${email ?? ""}`.trim();
  if (!value.includes("@")) return "—";
  const [local, domain] = value.split("@");
  if (!local) return `***@${domain}`;
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

export function maskPhone(phone) {
  return maskPhoneDigits(phone) || "—";
}

/** Salon-local day of a booking; device time zones can't shift it. */
export function bookingDayIso(booking) {
  return booking?.startsAt ? salonDateOf(booking.startsAt) : "";
}

export function isTodayBooking(booking) {
  return Boolean(booking?.startsAt) && bookingDayIso(booking) === salonDateIso(0);
}

/**
 * Bookings still owing money. Bookings are normally paid in full at creation (online and walk-in
 * flows both collect `payableAmount`), so this is usually empty; without it every fresh booking
 * would look payable and risk a duplicate payment.
 */
export function amountDue(booking) {
  const payable = Number(booking?.payableAmount ?? 0);
  const paid = Number(booking?.paidAmount ?? 0);
  return Math.max(0, Math.round((payable - paid) * 100) / 100);
}

export function computeOpsMetrics(bookings = [], queue = [], nowMs = Date.now()) {
  const todayBookings = bookings.filter(isTodayBooking);
  const activeQueue = queue.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const waiting = activeQueue.filter((b) => WAITING_STATUSES.includes(b.status)).length;
  const inService = activeQueue.filter((b) => b.status === "STARTED").length;
  const live = todayBookings.filter((b) => !["CANCELLED", "NO-SHOW"].includes(normalizeStatus(b.status)));
  const completed = live.filter((b) => normalizeStatus(b.status) === "COMPLETED").length;
  const todayRevenue = todayBookings
    .filter((b) => b.status !== "CANCELLED")
    .reduce((sum, b) => sum + Number(b.payableAmount ?? 0), 0);

  return {
    todayTotal: todayBookings.length,
    plannedToday: live.length,
    completed,
    waiting,
    inService,
    todayRevenue,
    delayed: activeQueue.filter((b) => isCriticalDelay(b, nowMs)).length,
  };
}

export function groupQueueByStatus(queue = []) {
  const byTime = (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  return {
    upcoming: queue.filter((b) => WAITING_STATUSES.includes(b.status)).sort(byTime),
    inService: queue.filter((b) => b.status === "STARTED").sort(byTime),
  };
}

export function computeStylistAvailability(stylists = [], queue = []) {
  const activeBookings = queue.filter((b) => ACTIVE_STATUSES.includes(b.status));

  return stylists.map((stylist) => {
    const inService = activeBookings.find((b) => b.stylistId === stylist.id && b.status === "STARTED");
    const upcoming = activeBookings.filter((b) => b.stylistId === stylist.id && WAITING_STATUSES.includes(b.status));

    let status = "available";
    if (inService) status = "busy";
    else if (upcoming.length) status = "upcoming";

    return {
      id: stylist.id,
      name: stylist.name,
      email: stylist.email ?? null,
      status,
      currentCustomer: inService?.customer ?? null,
      currentService: inService?.service ?? null,
      upcomingCount: upcoming.length,
    };
  });
}

/** Case-insensitive match on customer, phone digits, service and stylist (instant search). */
export function bookingMatches(booking, query) {
  const q = `${query ?? ""}`.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  const hay = [booking.customer, booking.service, booking.stylistName].filter(Boolean).join(" ").toLowerCase();
  if (hay.includes(q)) return true;
  return digits.length >= 3 && `${booking.customerPhone ?? ""}`.replace(/\D/g, "").includes(digits);
}

/** Minutes from now until a booking starts (negative when it is already past). */
export function minutesUntil(iso, nowMs = Date.now()) {
  return Math.round((new Date(iso).getTime() - nowMs) / 60000);
}

/** "in 12 min", "now", "8 min late". */
export function relativeStartLabel(iso, nowMs = Date.now()) {
  const m = minutesUntil(iso, nowMs);
  if (m > 90) return formatBookingTime(iso);
  if (m > 1) return `in ${m} min`;
  if (m >= -1) return "now";
  return `${Math.abs(m)} min late`;
}
