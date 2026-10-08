"use client";
import { CalendarCheck, Gift, LogOut, Plus, UserPlus, Wifi, WifiOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@/components/auth/auth-provider";
import { FloatingActionButton, PortalShell, useAsyncAction, ButtonLoadingMorph } from "@/components/kit";
import { NotificationBell } from "@/components/shared/notification-bell";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { adminNavItems, adminTabHrefs } from "./nav-config";
import { useAdminCommands } from "./use-admin-commands";

/** Realtime socket state: a small chip in the top bar (icon-only on phones). */
function LiveStatus() {
  const connected = useSelector((state) => state.adminPortal.realtimeConnected);
  const Icon = connected ? Wifi : WifiOff;
  return (
    <span
      role="status"
      title={connected ? "Live updates on" : "Live updates paused"}
      className={cn(
        "hidden h-9 items-center gap-1.5 rounded-full px-3 text-caption font-semibold ring-1 ring-inset sm:inline-flex",
        connected ? "bg-success/12 text-ink-success ring-success/25" : "bg-muted text-ink-neutral ring-border"
      )}
    >
      <span className="relative grid place-items-center">
        <Icon className="relative size-3.5" aria-hidden />
      </span>
      <span className="hidden md:inline">{connected ? "Live" : "Offline"}</span>
      <span className="sr-only md:hidden">{connected ? "Live updates on" : "Live updates paused"}</span>
    </span>
  );
}

function SignOutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { state, run } = useAsyncAction();
  return (
    <ButtonLoadingMorph
      variant="ghost"
      fullWidth
      icon={LogOut}
      state={state}
      loadingLabel="Signing out…"
      successLabel="Signed out"
      className="justify-start text-ink-destructive"
      onClick={() =>
        run(async () => {
          try {
            await logout();
            navigate("/auth/login", { replace: true });
          } catch (error) {
            notify.error("Sign out failed", { description: "Please try again." });
            throw error;
          }
        })
      }
    >
      Sign out
    </ButtonLoadingMorph>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  return (
    <FloatingActionButton
      className="lg:hidden"
      label="Quick actions"
      actions={[
        { id: "booking", label: "Bookings", icon: CalendarCheck, onClick: () => navigate("/admin-dashboard/appointments") },
        { id: "service", label: "Add service", icon: Plus, onClick: () => navigate("/admin-dashboard/services?new=1") },
        { id: "staff", label: "Add staff", icon: UserPlus, onClick: () => navigate("/admin-dashboard/staff/new") },
        { id: "offer", label: "New offer", icon: Gift, onClick: () => navigate("/admin-dashboard/offers?new=1") },
      ]}
    />
  );
}

/**
 * The admin chrome, built on the shared PortalShell (glass sidebar ≥1024px, bottom tab bar + "More"
 * sheet on phones, ⌘K palette, PageTransition). `slotRef` receives the node a page's header actions
 * are portalled into (see AdminFrame); `actions` renders them directly when there is no frame.
 */
export function AdminShell({ pageTitle, description, actions, slotRef, children }) {
  const { pathname } = useLocation();
  const { appUser } = useAuth();
  const commands = useAdminCommands();

  return (
    <PortalShell
      brand={{ name: "Sahasra", tagline: "Admin console", href: "/admin-dashboard" }}
      nav={adminNavItems}
      tabs={adminTabHrefs}
      title={pageTitle}
      subtitle={description}
      user={{ name: appUser?.name ?? "Administrator", role: appUser?.email ?? "Admin" }}
      userMenu={<SignOutButton />}
      commands={commands}
      fab={pathname === "/admin-dashboard" ? <QuickActions /> : null}
      actions={
        <>
          {slotRef ? <div ref={slotRef} className="hidden items-center gap-2 empty:hidden sm:flex" /> : actions ? <div className="hidden items-center gap-2 sm:flex">{actions}</div> : null}
          <LiveStatus />
          <NotificationBell portal="admin" />
        </>
      }
    >
      {children}
    </PortalShell>
  );
}
