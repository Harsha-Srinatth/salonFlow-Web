export function normalizeBookingStatus(status) {
  return `${status ?? ""}`.trim().toUpperCase();
}

export function getAutoCompleteAtMs(booking) {
  const ref = booking?.actualStartAt ?? booking?.startsAt;
  if (!ref) return 0;
  const day = new Date(ref);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() + 1);
  return day.getTime();
}

export function isStartedPendingAutoComplete(booking) {
  return normalizeBookingStatus(booking?.status) === "STARTED" && Date.now() < getAutoCompleteAtMs(booking);
}

export function getBookingDisplayStatus(booking) {
  if (isStartedPendingAutoComplete(booking)) return "Pending";
  if (normalizeBookingStatus(booking?.status) === "NO-SHOW") return "Client did not visit";
  return `${booking?.status ?? ""}`.trim() || "PENDING";
}

export function isNoShowBooking(booking) {
  return normalizeBookingStatus(booking?.status) === "NO-SHOW";
}

export function getPendingAutoCompleteCountdownMs(booking, nowMs = Date.now()) {
  return getAutoCompleteAtMs(booking) - nowMs;
}

export function formatCountdownMs(remainMs) {
  const abs = Math.max(0, Math.abs(remainMs));
  const hours = Math.floor(abs / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  const secs = Math.floor((abs % 60000) / 1000);
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
