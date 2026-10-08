"use client";

import { BrandLoader, PortalShell } from "@/components/kit";
import { StaffLivePill, StaffRealtimeBanner } from "@/components/kit-extra/staff-realtime-status";
import { NotificationBell } from "@/components/shared/notification-bell";
import { staffLogout } from "@/lib/staff-auth-client";
import { EmployeeQueueContext, useEmployeeQueueSource } from "@/employee/hooks/use-employee-queue";
import { useEmployeeSession } from "@/employee/hooks/use-employee-session";
import { employeeNavItems } from "@/employee/portal/nav-config";
import { LogOut } from "lucide-react";
import { createContext, Suspense, useContext, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Outlet, useNavigate } from "react-router-dom";

const EmployeeFrameContext = createContext(null);

export function EmployeeSignOutButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink-destructive hover:bg-destructive/10"
      onClick={async () => {
        await staffLogout();
        navigate("/auth/login", { replace: true });
      }}
    >
      <LogOut className="size-4" aria-hidden /> Sign out
    </button>
  );
}

function EmployeeShell({ title, subtitle, actions, realtimeConnected, user, children }) {
  return (
    <PortalShell
      brand={{ name: "Sahasra", tagline: "Stylist floor", href: employeeNavItems[0].href }}
      nav={employeeNavItems}
      title={title}
      subtitle={subtitle}
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

/**
 * Route layout for every stylist page: one shell, one session lookup, one queue and one realtime
 * socket for the whole shift. Tabs swap inside it and read the shared queue.
 */
export function EmployeeFrame() {
  const { user } = useEmployeeSession();
  const queue = useEmployeeQueueSource({ user, enabled: true });
  const [meta, setMetaState] = useState({ title: "", subtitle: "" });
  const [slot, setSlot] = useState(null);

  const value = useMemo(
    () => ({
      setMeta: (next) => setMetaState((cur) => (cur.title === next.title && cur.subtitle === next.subtitle ? cur : next)),
      slot,
    }),
    [slot]
  );

  return (
    <EmployeeFrameContext.Provider value={value}>
      <EmployeeQueueContext.Provider value={queue}>
        <EmployeeShell
          title={meta.title}
          subtitle={meta.subtitle}
          realtimeConnected={queue.realtimeConnected}
          user={user}
          actions={<span ref={setSlot} className="flex items-center gap-1 empty:hidden" />}
        >
          {/* The page chunk loads in parallel with the session lookup (pages show their own loader
              until the shared, de-duplicated /staff/me resolves) instead of after it. */}
          <Suspense fallback={<BrandLoader className="py-24" label="Loading your shift…" />}>
            <Outlet />
          </Suspense>
        </EmployeeShell>
      </EmployeeQueueContext.Provider>
    </EmployeeFrameContext.Provider>
  );
}

/**
 * Page wrapper. Inside `EmployeeFrame` it reports the title and portals `actions` into the top
 * bar; outside it (the auth / chunk-loading fallback in App.jsx) it renders a complete shell.
 */
export function EmployeeLayout({ pageTitle, pageSubtitle, actions, realtimeConnected, user, children }) {
  const frame = useContext(EmployeeFrameContext);

  useLayoutEffect(() => {
    frame?.setMeta({ title: pageTitle ?? "", subtitle: pageSubtitle ?? "" });
  }, [frame, pageTitle, pageSubtitle]);

  if (frame) {
    return (
      <>
        {actions && frame.slot ? createPortal(actions, frame.slot) : null}
        {children}
      </>
    );
  }
  return (
    <EmployeeShell title={pageTitle} subtitle={pageSubtitle} actions={actions} realtimeConnected={realtimeConnected} user={user}>
      {children}
    </EmployeeShell>
  );
}
