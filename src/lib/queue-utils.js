/**
 * Helpers shared by every screen that renders the live queue.
 *
 * The merge below is the reason a customer's wait time stays live without any
 * polling: their ticket codes come from one `/queue/me` call, and every pushed
 * board carries fresh timings for those same tickets.
 */

export const QUEUE_WAITING_STATUSES = ["PENDING", "CONFIRMED"];

/**
 * @param {number | null | undefined} minutes
 * @returns {string}
 */
export function formatWaitLabel(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value === 0) return "Now";
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/**
 * @param {string | null | undefined} iso
 * @returns {string}
 */
export function formatClockTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export const QUEUE_CONFIDENCE_LABEL = {
  HIGH: "Based on this salon's actual service times",
  MEDIUM: "Partly based on past service times",
  LOW: "Based on scheduled durations only",
};

/**
 * Refresh the customer's own entries with the timings from the latest board.
 *
 * Entries whose ticket is missing from the board keep their last known values —
 * the board is capped, so absence means "not shown", not "gone".
 *
 * @param {Array<object>} myEntries
 * @param {object | null} board
 * @returns {Array<object>}
 */
export function mergeMyEntriesWithBoard(myEntries, board) {
  if (!Array.isArray(myEntries) || !myEntries.length) return [];
  const byTicket = new Map((board?.entries ?? []).map((entry) => [entry.ticket, entry]));
  return myEntries.map((entry) => {
    const live = byTicket.get(entry.ticket);
    if (!live) return entry;
    return {
      ...entry,
      status: live.status,
      expectedStartAt: live.expectedStartAt,
      expectedEndAt: live.expectedEndAt ?? entry.expectedEndAt,
      waitMinutes: live.waitMinutes,
      remainingMinutes: live.remainingMinutes,
      salonPosition: live.salonPosition,
      positionInLane: live.positionInLane,
      peopleAhead: Math.max(0, Number(live.positionInLane ?? 0) - 1),
      confidence: live.confidence,
    };
  });
}

/**
 * The one entry a customer cares about right now: whatever is in the chair, or
 * else the next thing they are waiting for.
 *
 * @param {Array<object>} entries
 * @returns {object | null}
 */
export function pickActiveEntry(entries) {
  if (!Array.isArray(entries) || !entries.length) return null;
  return (
    entries.find((entry) => entry.status === "STARTED") ??
    entries.find((entry) => QUEUE_WAITING_STATUSES.includes(entry.status)) ??
    null
  );
}
