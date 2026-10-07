import {
  formatCountdownMs,
  getBookingDisplayStatus,
  getPendingAutoCompleteCountdownMs,
  isStartedPendingAutoComplete,
  normalizeBookingStatus,
} from "@/lib/booking-pending-status";
import { salonHour } from "@/lib/salon-date";
import { formatBookingDateTime, formatBookingTime } from "@/receptionist/lib/booking-utils";

const CLOSED = ["COMPLETED", "CANCELLED", "NO-SHOW"];

/**
 * The stylist's status machine (unchanged rules, made explicit):
 * Start only from CONFIRMED, Complete only from STARTED.
 */
export const canStartBooking = (booking) => normalizeBookingStatus(booking?.status) === "CONFIRMED";
export const canCompleteBooking = (booking) => normalizeBookingStatus(booking?.status) === "STARTED";

export function buildAppointmentCardModels(queue, nowMs) {
  return (queue ?? []).map((booking) => {
    const isStarted = normalizeBookingStatus(booking.status) === "STARTED";
    const pendingAutoComplete = isStartedPendingAutoComplete(booking);
    const displayStatus = getBookingDisplayStatus(booking);
    const pendingCountdownMs = pendingAutoComplete ? getPendingAutoCompleteCountdownMs(booking, nowMs) : 0;
    const pendingTimerText = formatCountdownMs(pendingCountdownMs);
    const startAt = new Date(booking.actualStartAt ?? booking.startsAt).getTime();
    const durationMs = Number(booking.durationMinutes ?? 0) * 60 * 1000;
    const elapsedMs = Math.max(0, nowMs - startAt);
    const remainMs = durationMs - elapsedMs;
    const graceMs = 10 * 60 * 1000;
    const inRedZone = isStarted && !pendingAutoComplete && remainMs <= 0 && remainMs >= -graceMs;
    const beyondGrace = isStarted && !pendingAutoComplete && remainMs < -graceMs;
    const mins = Math.floor(Math.abs(remainMs) / 60000);
    const secs = Math.floor((Math.abs(remainMs) % 60000) / 1000);
    const serviceTimerText = `${remainMs < 0 ? "-" : ""}${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    return {
      booking,
      isStarted,
      pendingAutoComplete,
      displayStatus,
      pendingTimerText,
      inRedZone,
      beyondGrace,
      serviceTimerText,
      // For the live timer ring: share of the planned duration already used (0..1+).
      elapsedRatio: durationMs > 0 ? elapsedMs / durationMs : 0,
      overtime: isStarted && durationMs > 0 && remainMs < 0,
      canStart: canStartBooking(booking),
      canComplete: canCompleteBooking(booking),
    };
  });
}

export function computeShiftMetrics(queue = [], nowMs = Date.now()) {
  const cards = buildAppointmentCardModels(queue, nowMs);
  const waiting = cards.filter((card) => !card.isStarted && !CLOSED.includes(card.booking.status ?? ""));
  const inService = cards.filter((card) => card.isStarted);
  const delayed = cards.filter((card) => card.beyondGrace);
  const pendingAuto = cards.filter((card) => card.pendingAutoComplete);

  const nextUp = [...waiting].sort(
    (a, b) => new Date(a.booking.startsAt).getTime() - new Date(b.booking.startsAt).getTime()
  )[0];

  return {
    totalAssigned: cards.length,
    waiting: waiting.length,
    inService: inService.length,
    delayed: delayed.length,
    pendingAutoComplete: pendingAuto.length,
    queueValue: cards.reduce((sum, card) => sum + Number(card.booking.payableAmount ?? 0), 0),
    bookedMinutes: cards.reduce((sum, card) => sum + Number(card.booking.durationMinutes ?? 0), 0),
    nextUp: nextUp ?? null,
  };
}

export function groupEmployeeQueue(cards = []) {
  const byTime = (a, b) => new Date(a.booking.startsAt).getTime() - new Date(b.booking.startsAt).getTime();
  const waiting = cards.filter((card) => !card.isStarted && !CLOSED.includes(card.booking.status ?? "")).sort(byTime);
  const active = cards.filter((card) => card.isStarted).sort(byTime);
  return { waiting, active };
}

/** Bookings per salon hour across the assigned queue (first..last hour), for the load sparkline. */
export function hourlyLoad(queue = []) {
  const hours = queue.map((b) => salonHour(b.startsAt)).filter((h) => Number.isFinite(h));
  if (hours.length < 3) return [];
  const min = Math.min(...hours);
  const max = Math.max(...hours);
  if (max === min) return [];
  const out = Array.from({ length: max - min + 1 }, () => 0);
  for (const h of hours) out[h - min] += 1;
  return out;
}

export { formatBookingDateTime, formatBookingTime };
