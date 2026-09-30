import {
  formatCountdownMs,
  getBookingDisplayStatus,
  getPendingAutoCompleteCountdownMs,
  isStartedPendingAutoComplete,
  normalizeBookingStatus,
} from "@/lib/booking-pending-status";
import { formatBookingDateTime, formatBookingTime } from "@/receptionist/lib/booking-utils";

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
    };
  });
}

export function computeShiftMetrics(queue = [], nowMs = Date.now()) {
  const cards = buildAppointmentCardModels(queue, nowMs);
  const waiting = cards.filter(
    (card) => !card.isStarted && !["COMPLETED", "CANCELLED", "NO-SHOW"].includes(card.booking.status ?? "")
  );
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
    nextUp: nextUp ?? null,
  };
}

export function groupEmployeeQueue(cards = []) {
  const waiting = cards.filter(
    (card) => !card.isStarted && !["COMPLETED", "CANCELLED", "NO-SHOW"].includes(card.booking.status ?? "")
  );
  const active = cards.filter((card) => card.isStarted);
  return { waiting, active };
}

export { formatBookingDateTime, formatBookingTime };
