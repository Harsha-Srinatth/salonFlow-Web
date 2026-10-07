"use client";

import { ErrorState, IconButton, PullToRefresh, StatusChip } from "@/components/kit";
import { StaffDayTimeline } from "@/components/kit-extra/staff-day-timeline";
import { SkeletonList } from "@/components/motion";
import { formatDuration } from "@/lib/format";
import { iconForCategory } from "@/lib/service-icons";
import { EmployeeLoadingScreen } from "@/employee/components/employee-loading-screen";
import { NowNextHero } from "@/employee/components/now-next-hero";
import { CompletionCelebration } from "@/employee/components/service-actions";
import { ShiftStats } from "@/employee/components/shift-stats";
import { useEmployeeQueue } from "@/employee/hooks/use-employee-queue";
import { useEmployeeSession } from "@/employee/hooks/use-employee-session";
import { computeShiftMetrics, groupEmployeeQueue, hourlyLoad } from "@/employee/lib/queue-utils";
import { EmployeeLayout } from "@/employee/portal/employee-layout";
import { ArrowRight, CalendarDays, RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function TimelineCard({ booking }) {
  const ServiceIcon = iconForCategory(booking.service);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-portal/12 text-portal">
        <ServiceIcon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{booking.customer ?? "Customer"}</p>
        <p className="truncate text-caption text-ink-neutral">
          {booking.service}
          {booking.durationMinutes ? ` · ${formatDuration(booking.durationMinutes)}` : ""}
        </p>
      </div>
      <StatusChip status={booking.status} booking={booking} size="sm" iconOnly />
    </div>
  );
}

export default function EmployeeDashboardPage() {
  const { loading, user } = useEmployeeSession();
  const { queue, cards, queueLoading, queueError, nowMs, realtimeConnected, loadQueue, startBooking, completeBooking } = useEmployeeQueue({
    user,
    enabled: Boolean(user),
  });
  const [burst, setBurst] = useState(0);

  const metrics = useMemo(() => computeShiftMetrics(queue, nowMs), [queue, nowMs]);
  const { active, waiting } = useMemo(() => groupEmployeeQueue(cards), [cards]);
  const trend = useMemo(() => hourlyLoad(queue), [queue]);
  const nowMinute = Math.floor(nowMs / 60000) * 60000;
  const onCompleted = useCallback(() => {
    setBurst((n) => n + 1);
    window.setTimeout(() => setBurst(0), 1500);
  }, []);

  if (loading) return <EmployeeLoadingScreen />;
  if (!user) return null;

  const firstLoad = queueLoading && !queue.length;

  return (
    <EmployeeLayout pageTitle="My day" pageSubtitle={`${greeting()}, ${user.name}`} realtimeConnected={realtimeConnected} user={user}>
      <PullToRefresh onRefresh={loadQueue}>
        <div className="space-y-6 sm:space-y-8">
          {queueError && !queue.length ? (
            <ErrorState title="Couldn't load your day" description={queueError} onRetry={loadQueue} />
          ) : (
            <>
              <NowNextHero
                active={active[0]}
                next={waiting[0]}
                nowMs={nowMinute}
                loading={firstLoad}
                onStart={startBooking}
                onComplete={completeBooking}
                onCompleted={onCompleted}
              />

              <ShiftStats metrics={metrics} trend={trend} loading={firstLoad} />

              <section aria-label="Timeline" className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-5 text-portal" aria-hidden />
                  <h2 className="flex-1 font-display text-title font-bold">Timeline</h2>
                  <IconButton icon={RefreshCw} label="Refresh" variant="outline" onClick={() => void loadQueue()} />
                  <Link
                    to="/employee-dashboard/appointments"
                    className="inline-flex h-11 items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-portal hover:bg-portal/10"
                  >
                    All <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
                {firstLoad ? (
                  <SkeletonList rows={3} />
                ) : queue.length ? (
                  <StaffDayTimeline items={queue} nowMs={nowMinute} renderItem={(b) => <TimelineCard booking={b} />} layoutGroupId="stylist-day" />
                ) : (
                  <p className="rounded-card border border-dashed border-border/80 p-6 text-center text-sm text-ink-neutral">Nothing assigned yet</p>
                )}
              </section>
            </>
          )}
        </div>
      </PullToRefresh>
      <CompletionCelebration burstKey={burst} />
    </EmployeeLayout>
  );
}
