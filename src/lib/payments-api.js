import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { handleUnauthorizedStatus } from "@/lib/auth/session-manager";

/** Authenticated fetch for the payments endpoints (same auth as the other customer API calls). */
export async function authedRequest(path, init) {
  const token = await getFirebaseIdToken().catch(() => null);
  const headers = { "Content-Type": "application/json", ...(init?.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(toApiUrl(path), { ...init, credentials: "include", headers });
  handleUnauthorizedStatus(response.status);
  return response;
}
