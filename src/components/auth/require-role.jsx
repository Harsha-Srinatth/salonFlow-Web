"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { getDashboardPathByRole } from "@/lib/auth/role-routing";
import { Suspense } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingOrb } from "@/components/shared/loading-orb";

// `fallback` keeps the portal chrome (sidebar/header) on screen while auth or a lazy page chunk loads.
export function RequireRole({ roles, fallback = null }) {
    const { appUser, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return fallback ?? <LoadingOrb fullScreen />;
    }
    if (!appUser?.role) {
        return <Navigate to="/auth/login" replace state={{ from: location }} />;
    }
    if (!roles.includes(appUser.role)) {
        return <Navigate to={getDashboardPathByRole(appUser.role) ?? "/"} replace />;
    }
    return fallback ? <Suspense fallback={fallback}><Outlet /></Suspense> : <Outlet />;
}
