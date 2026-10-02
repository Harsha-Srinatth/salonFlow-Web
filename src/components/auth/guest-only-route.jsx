"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { getDashboardPathByRole } from "@/lib/auth/role-routing";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingOrb } from "@/components/shared/loading-orb";

const DASHBOARD_ROLES = new Set(["ADMIN", "USER", "STAFF", "RECEPTIONIST"]);

export function GuestOnlyRoute({ children }) {
    const { appUser, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (loading || !appUser?.role || !DASHBOARD_ROLES.has(appUser.role))
            return;
        navigate(getDashboardPathByRole(appUser.role), { replace: true });
    }, [appUser, loading, navigate]);

    if (loading) {
        return <LoadingOrb fullScreen />;
    }
    if (appUser?.role && DASHBOARD_ROLES.has(appUser.role))
        return null;
    return children;
}
