import { getFirebaseIdToken } from "@/lib/auth/id-token";
import { toApiUrl } from "@/lib/api-base";
import { handleUnauthorizedStatus } from "@/lib/auth/session-manager";

/**
 * JSON request with consistent error handling. `auth: true` attaches the Firebase token (cookie
 * sessions are sent either way) and lets a 401 end the session like every other portal call.
 * Throws an Error with `.status` (0 = network failure / timeout) and a user-readable message.
 */
export async function apiJson(path, { method = "GET", body, auth = false, signal, timeoutMs = 30_000 } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = await getFirebaseIdToken().catch(() => null);
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), timeoutMs);
  const onAbort = () => controller.abort(signal.reason);
  signal?.addEventListener("abort", onAbort, { once: true });
  let response;
  try {
    response = await fetch(toApiUrl(path), {
      method,
      credentials: "include",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { status: 0, cancelled: true });
    const timedOut = controller.signal.reason?.name === "TimeoutError";
    throw Object.assign(new Error(timedOut ? "The server took too long to answer. Please try again." : "You appear to be offline. Check your connection and try again."), { status: 0, cause: error });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
  if (auth) handleUnauthorizedStatus(response.status);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      response.status === 429
        ? data?.message ?? "Too many requests. Please wait a moment and try again."
        : data?.error && data.error !== "Internal server error"
          ? data.error
          : "Something went wrong. Please try again.";
    throw Object.assign(new Error(message), { status: response.status, data });
  }
  return data;
}
