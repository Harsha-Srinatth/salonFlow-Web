import { toApiUrl } from "@/lib/api-base";
import { clearBrowserSessionState, clearServerSessions, handleUnauthorizedStatus } from "@/lib/auth/session-manager";
const JSON_HEADERS = { "Content-Type": "application/json" };
async function readJson(res) {
    const text = await res.text();
    if (!text.trim())
        return {};
    try {
        return JSON.parse(text);
    }
    catch {
        return {};
    }
}
export async function staffLogin(email, password) {
    const res = await fetch(toApiUrl("/api/auth/staff/login"), {
        method: "POST",
        headers: JSON_HEADERS,
        credentials: "include",
        body: JSON.stringify({ email, password }),
    });
    const data = await readJson(res);
    if (res.status === 429)
        throw new Error(data.error ?? "TOO_MANY_ATTEMPTS");
    if (!res.ok)
        throw new Error(data.error ?? "Login failed");
    try {
        const { signOut } = await import("firebase/auth");
        const { firebaseAuth } = await import("@/lib/firebase/client");
        await signOut(firebaseAuth);
    } catch {
        // ignore — staff session uses HTTP-only cookie, not Firebase
    }
    return data.user;
}
export async function staffLogout() {
    await clearServerSessions();
    clearBrowserSessionState();
}

/** Staff/reception API calls — cookie session only (no Firebase Bearer). */
export async function staffApiFetch(path, init = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
    };
    const response = await fetch(path, {
        ...init,
        credentials: "include",
        headers,
    });
    if (response.status === 401) {
        handleUnauthorizedStatus(401, typeof window !== "undefined" ? window.location.pathname : undefined);
    }
    return response;
}
export async function fetchStaffMe() {
    const res = await fetch(toApiUrl("/api/auth/staff/me"), { credentials: "include" });
    if (handleUnauthorizedStatus(res.status))
        return null;
    const data = await readJson(res);
    return data.user;
}
/** After Firebase Phone Auth confirm(), exchange ID token for staff password-setup JWT. */
export async function verifyStaffPhoneWithFirebaseIdToken(idToken) {
    const res = await fetch(toApiUrl("/api/auth/staff/verify-firebase-phone"), {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await readJson(res);
    if (!res.ok)
        throw new Error(data.error ?? "Verification failed");
    if (!data.setupToken)
        throw new Error(data.error ?? "Invalid server response");
    return data.setupToken;
}
/**
 * @deprecated Renamed to `verifyStaffPhoneWithFirebaseIdToken`. Pass the Firebase ID token (not phone+OTP).
 * Kept so stale bundler caches / old imports still resolve.
 */
export const verifyStaffOtp = verifyStaffPhoneWithFirebaseIdToken;
export async function setStaffPassword(setupToken, password) {
    const res = await fetch(toApiUrl("/api/auth/staff/set-password"), {
        method: "POST",
        headers: { ...JSON_HEADERS, Authorization: `Bearer ${setupToken}` },
        body: JSON.stringify({ password }),
    });
    const data = await readJson(res);
    if (!res.ok)
        throw new Error(data.error ?? "Could not set password");
}
