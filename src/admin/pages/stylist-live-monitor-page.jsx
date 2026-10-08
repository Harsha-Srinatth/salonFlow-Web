"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Activity, AlertTriangle, CircleCheck, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ErrorState, ProgressRing, StatCard } from "@/components/kit";
import { SkeletonList, spring } from "@/components/motion";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ToneChip } from "@/admin/components/tone-chip";
import { selectAppointmentsList } from "@/admin/lib/selectors";
import { cn } from "@/lib/utils";
import { fetchAdminBookings } from "@/store/admin-portal-slice";
import { AdminLayout } from "../portal/admin-layout";

const CRITICAL_MS = 10 * 60 * 1000;

function formatMs(ms) {
  const abs = Math.max(0, Math.abs(ms));
  const mins = Math.floor(abs / 60000);
  const secs = Math.floor((abs % 60000) / 1000);
  return `${ms < 0 ? "+" : ""}${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const STATE = {
  ok: { label: "On track", tone: "success", ring: "success", icon: CircleCheck, ink: "text-ink-success" },
  over: { label: "Overtime", tone: "warning", ring: "warning", icon: Timer, ink: "text-ink-warning" },
  critical: { label: "Critical", tone: "destructive", ring: "destructive", icon: AlertTriangle, ink: "text-ink-destructive" },
};

/** Live countdown for every service in progress. Overtime after the planned duration, critical after +10 min. */
export default function AdminStylistLiveMonitorPage() {
  const reduce = useReducedMotion();
  const dispatch = useDispatch();
  const [nowMs, setNowMs] = useState(Date.now());
  const appointments = useSelector(selectAppointmentsList);
  const { appointmentsError, appointmentsLoading } = useSelector((state) => state.adminPortal);

  const load = () => dispatch(fetchAdminBookings({ limit: 200, offset: 0, sort: "proximity" }));
  useEffect(() => {
    void load();
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = useMemo(
    () =>
      appointments
        .filter((b) => b.status === "STARTED")
        .map((booking) => {
          const startedAt = new Date(booking.actualStartAt ?? booking.startsAt).getTime();
          const durationMs = Number(booking.durationMinutes ?? 0) * 60 * 1000;
          const remainingMs = durationMs - Math.max(0, nowMs - startedAt);
          const state = remainingMs < -CRITICAL_MS ? "critical" : remainingMs <= 0 ? "over" : "ok";
          const progress = durationMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / durationMs)) : 1;
          return { booking, remainingMs, state, progress };
        })
        .sort((a, b) => a.remainingMs - b.remainingMs),
    [appointments, nowMs]
  );
  const critical = cards.filter((c) => c.state === "critical").length;
  const over = cards.filter((c) => c.state === "over").length;
  const firstLoad = appointmentsLoading && !appointments.length;

  return (
    <AdminLayout pageTitle="Live floor" description="Services in progress, live">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Activity} label="In service" value={cards.length} tone="info" loading={firstLoad} />
          <StatCard icon={Timer} label="Overtime" value={over} tone="warning" loading={firstLoad} />
          <StatCard icon={AlertTriangle} label="Critical" value={critical} tone="destructive" loading={firstLoad} />
        </div>

        {appointmentsError && !appointments.length ? (
          <ErrorState title="Couldn't load the floor" description={appointmentsError} onRetry={() => load().unwrap()} />
        ) : firstLoad ? (
          <SkeletonList rows={3} />
        ) : !cards.length ? (
          <EmptyState illustration="queue" title="Nobody in the chair" description="Started services appear here with a live countdown." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {cards.map(({ booking, remainingMs, state, progress }) => {
                const s = STATE[state];
                return (
                  <motion.li
                    key={booking.id}
                    layout={!reduce}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={spring.soft}
                    className={cn("flex min-w-0 items-center gap-4 rounded-card border bg-card p-4 shadow-soft", state === "critical" ? "border-destructive/40" : "border-border/60")}
                  >
                    <ProgressRing value={Math.round(progress * 100)} size={72} stroke={7} tone={s.ring} label={`${booking.service} progress`} showValue={false}>
                      <AvatarBadge name={booking.customer} size="md" />
                    </ProgressRing>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{booking.customer}</p>
                      <p className="truncate text-caption text-ink-neutral">{booking.service}</p>
                      <p className="truncate text-caption text-ink-neutral">{booking.stylistName ?? "—"}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={cn("font-display text-xl font-bold tabular-nums", s.ink)} aria-label={remainingMs < 0 ? `${formatMs(remainingMs)} over` : `${formatMs(remainingMs)} left`}>
                        {formatMs(remainingMs)}
                      </span>
                      <ToneChip tone={s.tone} icon={s.icon} size="sm">
                        {s.label}
                      </ToneChip>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
