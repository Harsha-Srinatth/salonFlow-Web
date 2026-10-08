import { getFirebaseIdToken } from "@/lib/auth/id-token";
import { toApiUrl } from "@/lib/api-base";

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
  return data;
}

export const fetchLoyaltyOverview = () => userRequest("/api/customer/loyalty");
export const fetchRewardVault = () => userRequest("/api/customer/loyalty/vault");
export const drawRewardCard = (referralId) => userRequest("/api/customer/loyalty/vault/draw", { method: "POST", body: { referralId } });
export const fetchMembership = () => userRequest("/api/customer/membership");
export const fetchCustomerFeedback = () => userRequest("/api/customer/feedback");
export const sendBookingFeedback = (bookingId, body) => userRequest(`/api/customer/bookings/${bookingId}/feedback`, { method: "POST", body });
