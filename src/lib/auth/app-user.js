import { toApiUrl } from "@/lib/api-base";
import { handleUnauthorizedStatus } from "@/lib/auth/session-manager";

// Firebase-free half of the auth client, so the app shell (AuthProvider, route guards) can ask
// "who is signed in?" without the Firebase SDK on the first-paint path.

export const SIGNUP_IN_PROGRESS_KEY = "signup_in_progress";

/**
 * Whether a signup is mid-verification in this tab.
 *
 * Signup holds a real Firebase session from its first step, long before the
 * account exists — so the usual "a Firebase user appeared, go fetch their app
 * profile" reflex in `AuthProvider` would fire against a registration that is
 * *designed* to be refused until both factors land. This flag lets that reflex
 * stand down. Kept in sessionStorage rather than a module variable so a reload
 * mid-signup does not resurrect the problem.
 */
export function isSignupInProgress() {
    if (typeof window === "undefined")
        return false;
    return window.sessionStorage.getItem(SIGNUP_IN_PROGRESS_KEY) === "1";
}

// Several places ask "who is signed in?" during the same page load (provider start-up and the
// Firebase auth callback); share one in-flight request instead of sending three.
let currentUserRequest = null;
export function fetchCurrentAppUser() {
    if (!currentUserRequest) {
        currentUserRequest = loadCurrentAppUser().finally(() => {
            currentUserRequest = null;
        });
    }
    return currentUserRequest;
}
async function loadCurrentAppUser() {
    try {
        const response = await fetch(toApiUrl("/api/auth/me"), { credentials: "include" });
        if (handleUnauthorizedStatus(response.status))
            return null;
        if (!response.ok)
            return null;
        const data = (await response.json());
        return data.user ?? null;
    }
    catch {
        return null;
    }
}
