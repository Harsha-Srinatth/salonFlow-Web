"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { getDashboardPathByRole } from "@/lib/auth/role-routing";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export function RequireRole({ roles }) {
    const { appUser, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">Loading…</div>;
    }
    if (!appUser?.role) {
        return <Navigate to="/auth/login" replace state={{ from: location }} />;
    }
    if (!roles.includes(appUser.role)) {
        return <Navigate to={getDashboardPathByRole(appUser.role) ?? "/"} replace />;
    }
    return <Outlet />;
}
