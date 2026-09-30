const DEVICE_ID_KEY = "sahasra_device_id";

/**
 * Stable per-browser identifier, sent as `x-device-id` on session sync.
 *
 * It exists for one job: telling the server that two accounts were created on
 * the same handset. That is the check an IP-based rule cannot make, because
 * turning airplane mode on and off hands the user a brand-new IP address while
 * the browser storage stays exactly where it was.
 *
 * Deliberately not a fingerprint — no canvas, fonts or hardware probing. It is a
 * random value this browser generated about itself, so clearing site data or
 * using a private window resets it. That ceiling is understood and accounted
 * for: the server treats a missing or fresh identifier as one weak signal among
 * several, and the cooling period plus admin review cover what it misses.
 */
export function getDeviceId() {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length >= 8) return existing;
    const generated =
      window.crypto?.randomUUID?.() ??
      `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    // Storage blocked (private mode, cookies disabled). The server scores a
    // missing identifier as a mild risk signal rather than failing the signup.
    return null;
  }
}
