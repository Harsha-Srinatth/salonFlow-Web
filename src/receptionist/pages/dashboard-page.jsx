"use client";

import { BrandLoader, ErrorState, IconButton, PullToRefresh } from "@/components/kit";
import { LiveQueueBoard } from "@/receptionist/components/live-queue-board";
import { NextArrivals } from "@/receptionist/components/next-arrivals";
import { PaymentSheet } from "@/receptionist/components/payment-sheet";
import { ReceptionCancelSheet } from "@/receptionist/components/reception-cancel-sheet";
import { StylistFloor } from "@/receptionist/components/stylist-floor";
import { TodayOverview } from "@/receptionist/components/today-overview";
import { useDelayAlerts } from "@/receptionist/hooks/use-delay-alerts";
import { useReceptionBootstrap } from "@/receptionist/hooks/use-reception-bootstrap";
import { useReceptionSession } from "@/receptionist/hooks/use-reception-session";
import { computeOpsMetrics } from "@/receptionist/lib/booking-utils";
import { ReceptionLayout } from "@/receptionist/portal/reception-layout";
import { fetchReceptionBookings, fetchReceptionQueue } from "@/store/reception-bookings-slice";
import { Activity, RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default function ReceptionDashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, user } = useReceptionSession();
  const { bookings, queue, queueLoading, loading: bookingsLoading, stylists, realtimeConnected, updatingBookingId, error } = useSelector(
    (state) => state.receptionBookings
  );
  useReceptionBootstrap({ enabled: Boolean(user) });
  const alertBookings = useMemo(() => {
    const seen = new Set();
    return [...bookings, ...queue].filter((booking) => {
      if (!booking?.id || seen.has(booking.id)) return false;
      seen.add(booking.id);
      return true;
    });
  }, [bookings, queue]);
  const { nowMs, isCriticalDelay } = useDelayAlerts(alertBookings);
  // Minute resolution is enough for the counters; avoids recomputing on every 1s tick.
  const nowMinute = Math.floor(nowMs / 60000);
  const metrics = useMemo(() => computeOpsMetrics(bookings, queue, nowMinute * 60000), [bookings, queue, nowMinute]);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [collectFor, setCollectFor] = useState(null);
  // "#collect-payment" (FAB, command palette, old quick-action links) opens the payment sheet.
  const paymentOpen = location.hash === "#collect-payment" || Boolean(collectFor);
  const closePayment = (open) => {
    if (open) return;
    setCollectFor(null);
    if (location.hash) navigate(location.pathname, { replace: true });
  };

  const refresh = useCallback(
    () => Promise.all([dispatch(fetchReceptionBookings()), dispatch(fetchReceptionQueue())]),
    [dispatch]
  );

  if (loading) return <BrandLoader className="py-24" label="Opening the desk…" />;
  if (!user) return null;

  const firstLoad = (bookingsLoading || queueLoading) && !bookings.length && !queue.length;

  return (
    <ReceptionLayout pageTitle="Today" pageSubtitle={`${greeting()}, ${user.name}`} realtimeConnected={realtimeConnected} user={user}>
      <PullToRefresh onRefresh={refresh}>
        <div className="space-y-6 sm:space-y-8">
          {error && !bookings.length && !queue.length ? (
            <ErrorState title="Couldn't load today" description={error} onRetry={refresh} />
          ) : (
            <>
              <TodayOverview metrics={metrics} loading={firstLoad} />
              <NextArrivals queue={queue} nowMs={nowMinute * 60000} />
              <StylistFloor stylists={stylists} queue={queue} loading={firstLoad} />
              <section aria-label="Live queue" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Activity className="size-5 text-portal" aria-hidden />
                  <h2 className="flex-1 font-display text-title font-bold">Live queue</h2>
                  <IconButton icon={RefreshCw} label="Refresh" variant="outline" onClick={() => void refresh()} />
                </div>
                <LiveQueueBoard
                  queue={queue}
                  loading={queueLoading}
                  nowMs={nowMinute * 60000}
                  isCriticalDelay={isCriticalDelay}
                  updatingBookingId={updatingBookingId}
                  onCancel={setCancelTarget}
                  onCollect={(booking) => setCollectFor(booking.id)}
                />
              </section>
            </>
          )}
        </div>
      </PullToRefresh>

      <ReceptionCancelSheet booking={cancelTarget} open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)} />
      <PaymentSheet open={paymentOpen} onOpenChange={closePayment} initialBookingId={collectFor} />
    </ReceptionLayout>
  );
}
