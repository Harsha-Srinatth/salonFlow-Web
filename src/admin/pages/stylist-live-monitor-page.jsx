"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { StatCard } from "@/admin/components/stat-card";
import { StatusPill } from "@/admin/components/status-pill";
import { AnimatePresence, motion } from "motion/react";
import { fetchAdminBookings, selectAdminAppointments } from "@/store/admin-portal-slice";
import { Activity, AlertTriangle, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "@/lib/notify";
import { AdminLayout } from "../portal/admin-layout";

function formatMs(ms) {
  const abs = Math.max(0, Math.abs(ms));
  const mins = Math.floor(abs / 60000);
  const secs = Math.floor((abs % 60000) / 1000);
  return `${ms < 0 ? "-" : ""}${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function AdminStylistLiveMonitorPage() {
  const dispatch = useDispatch();
  const [nowMs, setNowMs] = useState(Date.now());
  const appointments = useSelector(selectAdminAppointments);
  const { realtimeConnected, appointmentsError } = useSelector((state) => state.adminPortal);

  useEffect(() => {
    void dispatch(fetchAdminBookings({ limit: 200, offset: 0, sort: "proximity" }));
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [dispatch]);

  useEffect(() => {
    if (appointmentsError) toast.error(appointmentsError);
  }, [appointmentsError]);

  function retryLoad() {
    void dispatch(fetchAdminBookings({ limit: 200, offset: 0, sort: "proximity" }));
  }

  const activeCards = useMemo(() => {
    return appointments
      .filter((booking) => booking.status === "STARTED")
      .map((booking) => {
        const startedAt = new Date(booking.actualStartAt ?? booking.startsAt).getTime();
        const durationMs = Number(booking.durationMinutes ?? 0) * 60 * 1000;
        const remainingMs = durationMs - Math.max(0, nowMs - startedAt);
        const inRedZone = remainingMs <= 0 && remainingMs >= -(10 * 60 * 1000);
        const critical = remainingMs < -(10 * 60 * 1000);
        const progress = durationMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / durationMs)) : 1;
        return { booking, remainingMs, inRedZone, critical, progress };
      })
      .sort((a, b) => a.remainingMs - b.remainingMs);
  }, [appointments, nowMs]);

  const criticalCount = activeCards.filter((c) => c.critical).length;
  const redZoneCount = activeCards.filter((c) => c.inRedZone && !c.critical).length;

  return (
    <AdminLayout
      pageTitle="Stylist Live Monitor"
      description="Live countdown for every service in progress."
      actions={
        <span className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
          <span className={`admin-live-dot relative inline-flex size-1.5 rounded-full ${realtimeConnected ? "bg-emerald-500 text-emerald-500" : "bg-muted-foreground text-muted-foreground"}`} />
          {realtimeConnected ? "Live" : "Offline"}
        </span>
      }
    >
      <div className="space-y-4">
        <ErrorBanner message={appointmentsError} onRetry={retryLoad} />

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard icon={Activity} label="In progress" value={activeCards.length} tone="primary" />
          <StatCard icon={Timer} label="In red zone" value={redZoneCount} tone="warning" delay={60} />
          <StatCard icon={AlertTriangle} label="Critical delay" value={criticalCount} tone="destructive" delay={120} />
        </div>

        <Card className="admin-shadow-sm">
          <CardHeader>
            <CardTitle>Live started services</CardTitle>
            <p className="text-xs text-muted-foreground">
              Red zone starts after planned duration, critical after 10 minutes overtime.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {!activeCards.length ? (
              <EmptyState icon={Activity} title="No started services right now" description="Once a stylist marks a booking as started, it will show up here with a live countdown." />
            ) : (
              <motion.div layout className="space-y-2.5">
                <AnimatePresence initial={false} mode="popLayout">
                {activeCards.map(({ booking, remainingMs, inRedZone, critical, progress }) => (
                  <motion.div
                    key={booking.id}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="admin-shadow-sm overflow-hidden rounded-xl border border-border/70 bg-card"
                  >
                  <div className="flex items-center justify-between gap-3 p-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <AvatarBadge name={booking.customer} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{booking.customer}</p>
                        <p className="truncate text-sm text-muted-foreground">{booking.service}</p>
                        <p className="text-xs text-muted-foreground">Stylist: {booking.stylistName ?? "—"}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-mono text-lg font-semibold tabular-nums ${critical ? "text-destructive" : inRedZone ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {formatMs(remainingMs)}
                      </p>
                      <StatusPill status={critical ? "Critical" : inRedZone ? "Red zone" : "On track"} className="mt-1" />
                    </div>
                  </div>
                  <div className="h-1 bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                    <motion.div className={`h-full ${critical ? "bg-destructive" : inRedZone ? "bg-warning" : "bg-primary"}`} animate={{ width: `${progress * 100}%` }} transition={{ ease: "linear", duration: 1 }} />
                  </div>
                  </motion.div>
                ))}
                </AnimatePresence>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
