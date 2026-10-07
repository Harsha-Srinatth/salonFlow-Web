"use client";

import { FloatingActionButton, PortalShell } from "@/components/kit";
import { StaffLivePill, StaffRealtimeBanner } from "@/components/kit-extra/staff-realtime-status";
import { NotificationBell } from "@/components/shared/notification-bell";
import { staffLogout } from "@/lib/staff-auth-client";
import { formatBookingTime } from "@/receptionist/lib/booking-utils";
import {
  RECEPTION_COLLECT,
  RECEPTION_SCHEDULE,
  RECEPTION_WALK_IN,
  receptionNavItems,
} from "@/receptionist/portal/nav-config";
import { CalendarSearch, CreditCard, LogOut, Search, UserPlus } from "lucide-react";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

export function ReceptionSignOutButton() {
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
 * Reception shell: PortalShell with the teal accent, live socket state, notifications,
 * quick-action FAB and a command palette that can jump to any loaded booking.
 * `pageTitle`/`pageSubtitle` names are kept because App.jsx renders `<ReceptionLayout pageTitle="">`
 * as the route fallback.
 */
export function ReceptionLayout({ pageTitle, pageSubtitle, actions, realtimeConnected, user, hideFab = false, children }) {
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
      title={pageTitle}
      subtitle={pageSubtitle}
      accent="teal"
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
