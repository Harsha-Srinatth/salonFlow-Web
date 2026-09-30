"use client";
import { fetchCurrentAppUser, isSignupInProgress, onUserChange, signOutUser, syncSessionWithBackend, } from "@/lib/auth/auth-client";
import { redirectToLogin } from "@/lib/auth/session-manager";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [appUser, setAppUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const refresh = useCallback(async () => {
        if (firebaseUser) {
            const user = await syncSessionWithBackend();
            setAppUser(user);
            return;
        }
        const user = await fetchCurrentAppUser();
        setAppUser(user);
    }, [firebaseUser]);
    const logout = useCallback(async () => {
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
        void (async () => {
            const cookieUser = await fetchCurrentAppUser();
            if (cancelled)
                return;
            if (cookieUser) {
                setAppUser(cookieUser);
                finishLoading();
            }
        })();
        const unsubscribe = onUserChange(async (user) => {
            if (cancelled)
                return;
            setFirebaseUser(user);
            if (user) {
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
            const sessionUser = await fetchCurrentAppUser();
            if (cancelled)
                return;
            setAppUser(sessionUser);
            finishLoading();
        });
        const fallbackTimer = window.setTimeout(finishLoading, 4000);
        return () => {
            cancelled = true;
            window.clearTimeout(fallbackTimer);
            unsubscribe();
        };
    }, []);
    const value = useMemo(() => {
        return { firebaseUser, appUser, loading, refresh, logout };
    }, [firebaseUser, appUser, loading, refresh, logout]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used within AuthProvider");
    return context;
}
