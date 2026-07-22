"use client";
import { fetchCurrentAppUser, onUserChange, signOutUser, syncSessionWithBackend, } from "@/lib/auth/auth-client";
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
