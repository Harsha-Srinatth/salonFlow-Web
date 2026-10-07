import { normalizeBookingStatus } from "@/lib/booking-pending-status";

export const UPCOMING_STATUSES = new Set(["PENDING", "CONFIRMED", "STARTED"]);
export const canCancelBooking = (b) => ["PENDING", "CONFIRMED"].includes(normalizeBookingStatus(b?.status));
export const canRemoveBooking = (b) => ["COMPLETED", "CANCELLED", "NO-SHOW"].includes(normalizeBookingStatus(b?.status));
export const canReviewBooking = (b) => normalizeBookingStatus(b?.status) === "COMPLETED";

/** Next upcoming PENDING/CONFIRMED booking that hasn't started yet, soonest first. */
export function nextUpcoming(bookings, now = Date.now()) {
  return (
    [...(bookings ?? [])]
      .filter((b) => ["PENDING", "CONFIRMED"].includes(normalizeBookingStatus(b.status)) && new Date(b.startsAt).getTime() >= now)
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0] ?? null
  );
}

/**
 * Catalog service ids to put back in the cart for "Book again". Uses `booking.serviceIds` when the
 * API sends it; otherwise matches the booking's service names ("Haircut, Beard trim", optional
 * "(Option)" suffix) against the live catalog. Returns [] when nothing matches.
 */
export function rebookServiceIds(booking, services) {
  const catalog = services ?? [];
  if (Array.isArray(booking?.serviceIds) && booking.serviceIds.length) {
    return booking.serviceIds.filter((id) => catalog.some((s) => s.id === id));
  }
  const names = `${booking?.service ?? ""}`
    .split(/,|\s\+\s/)
    .map((n) => n.replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase())
    .filter(Boolean);
  return catalog.filter((s) => names.includes(`${s.name ?? ""}`.trim().toLowerCase())).map((s) => s.id);
}
