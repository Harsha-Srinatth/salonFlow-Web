import { getFirebaseIdToken } from "@/lib/auth/id-token";
import { toApiUrl } from "@/lib/api-base";

// Last successful GET response per path, for this tab's session. Pages seed their state from it
// so a revisit renders straight away while their usual fetch refreshes it in the background.
const lastResponses = new Map();

/** The last successful GET response for `path`, if any (never a substitute for fetching). */
export function peekUserResource(path) {
  return lastResponses.get(path);
}

/** Forget remembered responses (sign-out). */
export function clearUserResources() {
  lastResponses.clear();
}

/**
 * Authenticated JSON request for the customer portal (the same Firebase token + session cookie every
 * customer page used inline before). Throws an Error with the server's `error` message on failure.
 */
export async function userRequest(path, { method = "GET", body } = {}) {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl(path), {
    method,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Request failed"), { status: res.status });
  if (method === "GET") lastResponses.set(path, data);
  return data;
}

export const fetchLoyaltyOverview = () => userRequest("/api/customer/loyalty");
export const REWARD_VAULT_PATH = "/api/customer/loyalty/vault";
export const fetchRewardVault = () => userRequest(REWARD_VAULT_PATH);
export const drawRewardCard = (referralId) => userRequest("/api/customer/loyalty/vault/draw", { method: "POST", body: { referralId } });
export const MEMBERSHIP_PATH = "/api/customer/membership";
export const fetchMembership = () => userRequest(MEMBERSHIP_PATH);
export const fetchCustomerFeedback = () => userRequest("/api/customer/feedback");
export const sendBookingFeedback = (bookingId, body) => userRequest(`/api/customer/bookings/${bookingId}/feedback`, { method: "POST", body });
