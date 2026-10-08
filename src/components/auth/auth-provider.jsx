"use client";
import { fetchCurrentAppUser, isSignupInProgress } from "@/lib/auth/app-user";
import { redirectToLogin } from "@/lib/auth/session-manager";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
const AuthContext = createContext(null);
// The Firebase half of the auth client is loaded after first paint: the landing page and the
// sign-in screen render without waiting for (or downloading up front) the Firebase SDK.
const loadAuthClient = () => import("@/lib/auth/auth-client");
const SIGNED_IN_HINT_KEY = "sahasra_signed_in";
/** Whether this browser had a signed-in session last time (a hint only; never trusted for access). */
export function readSignedInHint() {
    try {
        return window.localStorage.getItem(SIGNED_IN_HINT_KEY) === "1";
    }
    catch {
        return false;
    }
}
function writeSignedInHint(signedIn) {
    try {
        if (signedIn)
            window.localStorage.setItem(SIGNED_IN_HINT_KEY, "1");
        else
            window.localStorage.removeItem(SIGNED_IN_HINT_KEY);
    }
    catch {
        // storage blocked: guests just see the brief loader, as before
    }
}
export function AuthProvider({ children }) {
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [appUser, setAppUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const refresh = useCallback(async () => {
        if (firebaseUser) {
            const { syncSessionWithBackend } = await loadAuthClient();
            const user = await syncSessionWithBackend();
            setAppUser(user);
            return;
        }
        const user = await fetchCurrentAppUser();
        setAppUser(user);
    }, [firebaseUser]);
    // Sign-in screens already hold the user returned by the login call: hand it over directly so
    // navigation doesn't wait on another /me round trip, and the role guard never sees a gap.
    const setSignedInUser = useCallback((user) => {
        if (!user?.role)
            return;
        setAppUser(user);
        setLoading(false);
    }, []);
    const logout = useCallback(async () => {
        const { signOutUser } = await loadAuthClient();
        await signOutUser();
        setAppUser(null);
        redirectToLogin();
    }, []);
    useEffect(() => {
        let cancelled = false;
        let resolved = false;
        const finishLoading = () => {
            if (!cancelled && !resolved) {
                resolved = true;
                setLoading(false);
            }
        };
        // Reused by the first Firebase callback below: for a guest it fires with `null` right after
        // start-up, and refetching /me then only repeated this request.
        const startupUser = fetchCurrentAppUser();
        let firstCallback = true;
        void (async () => {
            const cookieUser = await startupUser;
            if (cancelled)
                return;
            if (cookieUser) {
                setAppUser(cookieUser);
                finishLoading();
            }
        })();
        let unsubscribe = () => { };
        void loadAuthClient().then(({ onUserChange, syncSessionWithBackend }) => {
            if (cancelled)
                return;
            unsubscribe = onUserChange(async (user) => {
                if (cancelled)
                    return;
                setFirebaseUser(user);
                if (user) {
                    firstCallback = false;
                    // A signup part-way through verification already holds a Firebase
                    // session, and registration will refuse it until both factors are
                    // confirmed. Syncing anyway spends the caller's session-sync rate
                    // limit on a call that is *expected* to 403, and logs a scary error
                    // during a flow that is going fine. The signup screen finishes the
                    // registration itself and refreshes this provider when it does.
                    //
                    // The second clause is the belt to that braces: an account holding
                    // an address it has not confirmed only ever exists mid-signup, so
                    // it still stands down after a reload that lost the flag.
                    if (isSignupInProgress() || (user.email && !user.emailVerified)) {
                        finishLoading();
                        return;
                    }
                    try {
                        const syncedUser = await syncSessionWithBackend();
                        if (syncedUser)
                            setAppUser(syncedUser);
                    }
                    catch (error) {
                        console.error("Failed to sync authenticated user with backend", error);
                    }
                    finishLoading();
                    return;
                }
                const sessionUser = await (firstCallback ? startupUser : fetchCurrentAppUser());
                firstCallback = false;
                if (cancelled)
                    return;
                setAppUser(sessionUser);
                finishLoading();
            });
        });
        const fallbackTimer = window.setTimeout(finishLoading, 4000);
        return () => {
            cancelled = true;
            window.clearTimeout(fallbackTimer);
            unsubscribe();
        };
    }, []);
    useEffect(() => {
        if (!loading)
            writeSignedInHint(Boolean(appUser?.role));
    }, [appUser, loading]);
    const value = useMemo(() => {
        return { firebaseUser, appUser, loading, refresh, setSignedInUser, logout };
    }, [firebaseUser, appUser, loading, refresh, setSignedInUser, logout]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used within AuthProvider");
    return context;
}
