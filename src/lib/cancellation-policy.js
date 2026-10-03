// Mirrors bn/src/bookings/cancellation-policy.js. The server decides the actual refund;
// this only tells the customer, before they pay, what each window means for them.
export const FULL_REFUND_HOURS = 24;
export const PARTIAL_REFUND_MINUTES = 30;

const clock = (date) =>
  date.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * @param {string} startsAt ISO start of the appointment
 * @param {Date} [now]
 * @returns {{ tiers: Array<{key: string, title: string, when: string, available: boolean}>, current: string }}
 */
export function describeCancellationWindows(startsAt, now = new Date()) {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return { tiers: [], current: "NONE" };
  const fullUntil = new Date(start.getTime() - FULL_REFUND_HOURS * 3600e3);
  const partialUntil = new Date(start.getTime() - PARTIAL_REFUND_MINUTES * 60e3);
  const fullAvailable = fullUntil > now;
  const partialAvailable = partialUntil > now;
  return {
    current: fullAvailable ? "FULL" : partialAvailable ? "PARTIAL" : "NONE",
    tiers: [
      {
        key: "FULL",
        title: "Full refund",
        when: fullAvailable ? `Cancel before ${clock(fullUntil)}` : "Not available, this slot is less than 24 hours away",
        available: fullAvailable,
      },
      {
        key: "PARTIAL",
        title: "50% refund",
        when: partialAvailable ? `Cancel before ${clock(partialUntil)}` : "Not available for this slot",
        available: partialAvailable,
      },
      {
        key: "NONE",
        title: "No refund",
        when: `Within ${PARTIAL_REFUND_MINUTES} minutes of the start, or if you miss the visit`,
        available: true,
      },
    ],
  };
}
