"use client";

import { PortalShell } from "@/components/kit";
import { StaffLivePill, StaffRealtimeBanner } from "@/components/kit-extra/staff-realtime-status";
import { NotificationBell } from "@/components/shared/notification-bell";
import { staffLogout } from "@/lib/staff-auth-client";
import { employeeNavItems } from "@/employee/portal/nav-config";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function EmployeeSignOutButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="flex h-11 w-full items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-ink-destructive hover:bg-destructive/10"
      onClick={async () => {
        await staffLogout();
        navigate("/auth/login", { replace: true });
      }}
    >
      <LogOut className="size-4" aria-hidden /> Sign out
    </button>
  );
}

/**
 * Stylist shell: the shared PortalShell with the indigo accent, live socket state and notifications.
 * `pageTitle`/`pageSubtitle` names are kept because App.jsx renders `<EmployeeLayout pageTitle="">`
 * as the route fallback.
 */
export function EmployeeLayout({ pageTitle, pageSubtitle, actions, realtimeConnected, user, children }) {
  return (
    <PortalShell
      brand={{ name: "Sahasra", tagline: "Stylist floor", href: employeeNavItems[0].href }}
      nav={employeeNavItems}
      title={pageTitle}
      subtitle={pageSubtitle}
      accent="indigo"
      user={user ? { name: user.name, role: "Stylist" } : undefined}
      userMenu={<EmployeeSignOutButton />}
      actions={
        <>
          <StaffLivePill connected={realtimeConnected} />
          {actions}
          <NotificationBell portal="staff" />
        </>
      }
    >
      <StaffRealtimeBanner connected={realtimeConnected} />
      {children}
    </PortalShell>
  );
}
