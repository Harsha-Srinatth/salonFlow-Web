"use client";

import { BrandLoader, FloatingActionButton, PortalShell } from "@/components/kit";
import { StaffLivePill, StaffRealtimeBanner } from "@/components/kit-extra/staff-realtime-status";
import { NotificationBell } from "@/components/shared/notification-bell";
import { staffLogout } from "@/lib/staff-auth-client";
import { formatBookingTime } from "@/receptionist/lib/booking-utils";
import { useReceptionBootstrap } from "@/receptionist/hooks/use-reception-bootstrap";
import { useReceptionSession } from "@/receptionist/hooks/use-reception-session";
import {
  RECEPTION_COLLECT,
  RECEPTION_SCHEDULE,
  RECEPTION_WALK_IN,
  receptionNavItems,
} from "@/receptionist/portal/nav-config";
import { CalendarSearch, CreditCard, LogOut, Search, UserPlus } from "lucide-react";
import { createContext, Suspense, useContext, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";

const ReceptionFrameContext = createContext(null);

export function ReceptionSignOutButton() {
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

function ReceptionShell({ title, subtitle, actions, realtimeConnected, user, hideFab, children }) {
  const navigate = useNavigate();
  const bookings = useSelector((state) => state.receptionBookings?.bookings ?? []);

  const commands = useMemo(() => {
    const go = (href) => () => navigate(href);
    const bookingItems = bookings.slice(0, 40).map((b) => ({
      id: `booking-${b.id}`,
      label: b.customer ?? "Booking",
      icon: CalendarSearch,
      hint: `${formatBookingTime(b.startsAt)}${b.stylistName ? ` · ${b.stylistName}` : ""}`,
      keywords: [b.service, b.customerPhone, b.stylistName].filter(Boolean),
      onSelect: () => navigate(`${RECEPTION_SCHEDULE}?q=${encodeURIComponent(b.customer ?? "")}`),
    }));
    return [
      {
        heading: "Actions",
        items: [
          { id: "walk-in", label: "New walk-in", icon: UserPlus, onSelect: go(RECEPTION_WALK_IN) },
          { id: "collect", label: "Collect payment", icon: CreditCard, onSelect: go(RECEPTION_COLLECT) },
          { id: "find", label: "Find a booking", icon: Search, onSelect: go(`${RECEPTION_SCHEDULE}?focus=search`) },
        ],
      },
      { heading: "Go to", items: receptionNavItems.map((n) => ({ id: n.href, label: n.label, icon: n.icon, onSelect: go(n.href) })) },
      ...(bookingItems.length ? [{ heading: "Bookings", items: bookingItems }] : []),
    ];
  }, [bookings, navigate]);

  return (
    <PortalShell
      brand={{ name: "Sahasra", tagline: "Reception desk", href: receptionNavItems[0].href }}
      nav={receptionNavItems}
      title={title}
      subtitle={subtitle}
      user={user ? { name: user.name, role: "Receptionist" } : undefined}
      userMenu={<ReceptionSignOutButton />}
      commands={commands}
      actions={
        <>
          <StaffLivePill connected={realtimeConnected} />
          {actions}
          <NotificationBell portal="reception" />
        </>
      }
      fab={
        hideFab ? null : (
          <FloatingActionButton
            label="Quick actions"
            actions={[
              { id: "walk-in", label: "New walk-in", icon: UserPlus, onClick: () => navigate(RECEPTION_WALK_IN) },
              { id: "collect", label: "Collect payment", icon: CreditCard, onClick: () => navigate(RECEPTION_COLLECT) },
              { id: "find", label: "Find booking", icon: Search, onClick: () => navigate(`${RECEPTION_SCHEDULE}?focus=search`) },
            ]}
          />
        )
      }
    >
      <StaffRealtimeBanner connected={realtimeConnected} />
      {children}
    </PortalShell>
  );
}

/**
 * Route layout for every reception page: one shell, one session lookup, one data bootstrap and one
 * realtime socket for the whole visit. Switching tabs only swaps the page inside it, so the shared
 * bookings/queue/stylists/services stay loaded instead of being refetched per tab.
 */
export function ReceptionFrame() {
  const { loading, user } = useReceptionSession();
  const realtimeConnected = useSelector((state) => state.receptionBookings.realtimeConnected);
  useReceptionBootstrap({ enabled: Boolean(user) });
  const [meta, setMetaState] = useState({ title: "", subtitle: "", hideFab: false });
  const [slot, setSlot] = useState(null);

  const value = useMemo(
    () => ({
      setMeta: (next) =>
        setMetaState((cur) => (cur.title === next.title && cur.subtitle === next.subtitle && cur.hideFab === next.hideFab ? cur : next)),
      slot,
    }),
    [slot]
  );

  return (
    <ReceptionFrameContext.Provider value={value}>
      <ReceptionShell
        title={meta.title}
        subtitle={meta.subtitle}
        hideFab={meta.hideFab}
        realtimeConnected={realtimeConnected}
        user={user}
        actions={<span ref={setSlot} className="flex items-center gap-1 empty:hidden" />}
      >
        {loading && !user ? (
          <BrandLoader className="py-24" label="Opening the desk…" />
        ) : user ? (
          <Suspense fallback={<BrandLoader className="py-24" />}>
            <Outlet />
          </Suspense>
        ) : null}
      </ReceptionShell>
    </ReceptionFrameContext.Provider>
  );
}

/**
 * Page wrapper. Inside `ReceptionFrame` it reports the title and portals `actions` into the top
 * bar; outside it (the auth / chunk-loading fallback in App.jsx) it renders a complete shell.
 */
export function ReceptionLayout({ pageTitle, pageSubtitle, actions, realtimeConnected, user, hideFab = false, children }) {
  const frame = useContext(ReceptionFrameContext);

  useLayoutEffect(() => {
    frame?.setMeta({ title: pageTitle ?? "", subtitle: pageSubtitle ?? "", hideFab });
  }, [frame, pageTitle, pageSubtitle, hideFab]);

  if (frame) {
    return (
      <>
        {actions && frame.slot ? createPortal(actions, frame.slot) : null}
        {children}
      </>
    );
  }
  return (
    <ReceptionShell title={pageTitle} subtitle={pageSubtitle} actions={actions} realtimeConnected={realtimeConnected} user={user} hideFab={hideFab}>
      {children}
    </ReceptionShell>
  );
}
