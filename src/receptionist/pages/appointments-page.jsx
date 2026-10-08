"use client";

import { AnimatedTabBar, BrandLoader, DateStrip, FloatingLabelInput, IconButton, PullToRefresh } from "@/components/kit";
import { ReceptionCancelSheet } from "@/receptionist/components/reception-cancel-sheet";
import { ScheduleDay, ScheduleEmpty, ScheduleList, ScheduleLoading } from "@/receptionist/components/schedule-board";
import { useDelayAlerts } from "@/receptionist/hooks/use-delay-alerts";
import { useReceptionBootstrap } from "@/receptionist/hooks/use-reception-bootstrap";
import { useReceptionSession } from "@/receptionist/hooks/use-reception-session";
import { bookingDayIso, bookingMatches } from "@/receptionist/lib/booking-utils";
import { ReceptionLayout } from "@/receptionist/portal/reception-layout";
import { salonDateIso } from "@/lib/salon-date";
import { fetchReceptionBookings, fetchReceptionQueue } from "@/store/reception-bookings-slice";
import { CalendarRange, List, RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "@/lib/notify";

const VIEWS = [
  { value: "day", label: "Day", icon: CalendarRange },
  { value: "all", label: "All", icon: List },
];

export default function ReceptionAppointmentsPage() {
  const dispatch = useDispatch();
  const { loading, user } = useReceptionSession();
  const { bookings, stylists, loading: bookingsLoading, error, realtimeConnected } = useSelector((state) => state.receptionBookings);
  useReceptionBootstrap({ enabled: Boolean(user) });
  const { nowMs, isCriticalDelay } = useDelayAlerts(bookings);
  const nowMinute = Math.floor(nowMs / 60000) * 60000;

  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [view, setView] = useState(() => (params.get("q") ? "all" : "day"));
  const [day, setDay] = useState(() => salonDateIso(0));
  const [stylistFilter, setStylistFilter] = useState("all");
  const [cancelTarget, setCancelTarget] = useState(null);
  const searchRef = useRef(null);

  // Command palette / FAB deep links: ?q=Name fills the search, ?focus=search focuses it.
  const q = params.get("q");
  const focus = params.get("focus");
  useEffect(() => {
    if (q != null) {
      setQuery(q);
      setView("all");
    }
    if (focus === "search") window.setTimeout(() => searchRef.current?.focus(), 250);
    if (q != null || focus) setParams({}, { replace: true });
  }, [q, focus, setParams]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const refresh = useCallback(
    () => Promise.all([dispatch(fetchReceptionBookings()), dispatch(fetchReceptionQueue())]),
    [dispatch]
  );

  const searched = useMemo(() => bookings.filter((b) => bookingMatches(b, query)), [bookings, query]);
  const stylistTabs = useMemo(
    () => [{ value: "all", label: "All" }, ...stylists.map((s) => ({ value: s.id, label: s.name?.split(" ")[0] ?? "Stylist" }))],
    [stylists]
  );
  const dayBookings = useMemo(
    () => searched.filter((b) => bookingDayIso(b) === day && (stylistFilter === "all" || b.stylistId === stylistFilter)),
    [searched, day, stylistFilter]
  );
  const shown = view === "day" ? dayBookings : searched;

  if (loading) return <BrandLoader className="py-24" label="Loading schedule…" />;
  if (!user) return null;

  return (
    <ReceptionLayout pageTitle="Schedule" pageSubtitle="Every booking, live" realtimeConnected={realtimeConnected} user={user}>
      <PullToRefresh onRefresh={refresh}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FloatingLabelInput
              ref={searchRef}
              label="Search name, phone, service"
              icon={Search}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1"
              trailing={query ? <IconButton icon={X} label="Clear search" size="sm" onClick={() => setQuery("")} /> : null}
            />
            <IconButton icon={RefreshCw} label="Refresh" variant="outline" onClick={() => void refresh()} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <AnimatedTabBar items={VIEWS} value={view} onChange={setView} label="Schedule view" />
            {view === "day" && stylistTabs.length > 2 ? (
              <AnimatedTabBar items={stylistTabs} value={stylistFilter} onChange={setStylistFilter} size="sm" label="Stylist" className="max-w-full" />
            ) : null}
          </div>

          {view === "day" ? <DateStrip value={day} onChange={setDay} days={14} label="Pick a day" /> : null}

          {bookingsLoading && !bookings.length ? (
            <ScheduleLoading />
          ) : !shown.length ? (
            <ScheduleEmpty searching={Boolean(query.trim())} onClear={() => setQuery("")} />
          ) : view === "day" ? (
            <ScheduleDay
              bookings={dayBookings}
              stylists={stylists}
              byStylist={stylistFilter === "all"}
              nowMs={nowMinute}
              isToday={day === salonDateIso(0)}
              isCriticalDelay={isCriticalDelay}
              onCancel={setCancelTarget}
            />
          ) : (
            <ScheduleList bookings={searched} isCriticalDelay={isCriticalDelay} onCancel={setCancelTarget} />
          )}
        </div>
      </PullToRefresh>
      <ReceptionCancelSheet booking={cancelTarget} open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)} />
    </ReceptionLayout>
  );
}
