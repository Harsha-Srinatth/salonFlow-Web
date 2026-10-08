import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";

async function queueFetch(path) {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl(path), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

/**
 * Anonymised salon-wide board.
 *
 * Called once when a screen opens; after that the identical payload arrives over
 * the websocket, so a client watching the queue for an hour still makes exactly
 * one request for it.
 */
export async function fetchLiveQueueBoard() {
  return queueFetch("/api/customer/queue/live");
}

/** The signed-in customer's own tickets, positions and estimated start times. */
export async function fetchMyQueuePosition() {
  return queueFetch("/api/customer/queue/me");
}

/** Operational board with booking ids, for reception / admin / stylist screens. */
export async function fetchOperationalQueueBoard(portal) {
  const base = portal === "admin" ? "/api/admin" : portal === "staff" ? "/api/staff" : "/api/reception";
  return queueFetch(`${base}/queue/live`);
}
