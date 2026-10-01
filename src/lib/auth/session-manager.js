import { toApiUrl } from "@/lib/api-base";

let redirectInProgress = false;

function expireCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function clearBrowserSessionState() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.clear();
  } catch {
    // ignore storage errors in strict browser modes
  }
  try {
    // Clearing everything also wiped the theme and the per-browser device id that the
    // referral-abuse check depends on, so logging out reset both. Keep those two.
    const preserved = new Set(["theme", "sahasra_device_id"]);
    for (const key of Object.keys(window.localStorage)) {
      if (!preserved.has(key)) window.localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors in strict browser modes
  }
  expireCookie("app_access_token");
  expireCookie("staff_access_token");
}

export function getLoginRouteForPath(pathname) {
  const value = `${pathname ?? ""}`;
  if (value.startsWith("/user-dashboard") || value.startsWith("/auth")) return "/auth/login";
  return "/auth/login";
}

export function redirectToLogin(pathname) {
  if (typeof window === "undefined" || redirectInProgress) return;
  redirectInProgress = true;
  const loginPath = getLoginRouteForPath(pathname ?? window.location.pathname);
  window.location.replace(loginPath);
}

export async function clearServerSessions() {
  await Promise.allSettled([
    fetch(toApiUrl("/api/auth/logout"), { method: "POST", credentials: "include" }),
    fetch(toApiUrl("/api/auth/staff/logout"), { method: "POST", credentials: "include" }),
  ]);
}

export function isUnauthorizedStatus(status) {
  return status === 401 || status === 403;
}

/** Only 401 should end the session — 403 is usually role/permission, not "logged out". */
export function handleUnauthorizedStatus(status, pathname) {
  if (status !== 401) return false;
  if (typeof window === "undefined") return true;
  clearBrowserSessionState();
  redirectToLogin(pathname ?? window.location.pathname);
  return true;
}
