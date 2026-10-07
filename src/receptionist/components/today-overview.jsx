"use client";

import { ProgressRing, StatCard, StatusChip } from "@/components/kit";
import { AnimatedCounter, Stagger, StaggerItem } from "@/components/motion";
import { formatMoney } from "@/lib/format";
import { formatIsoDate, salonDateIso } from "@/lib/salon-date";
import { AlertTriangle, CalendarCheck, Hourglass, IndianRupee, Scissors } from "lucide-react";

/**
 * Today at a glance: a progress ring for the day (completed / planned, cancellations and no-shows
 * excluded) next to animated counters. Every number is derived from the loaded bookings and queue.
 */
export function TodayOverview({ metrics, loading }) {
  const { plannedToday, completed, waiting, inService, todayRevenue, delayed } = metrics;
  const formatRevenue = (n) => formatMoney(n, { compact: n >= 100000 });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="aurora grain relative overflow-hidden rounded-card border border-border/60 bg-card p-5 shadow-soft">
        <div className="relative z-[2] flex items-center gap-5">
          <ProgressRing value={completed} max={plannedToday || 1} size={112} stroke={10} label="Day progress">
            <span className="flex flex-col items-center leading-none">
              <AnimatedCounter value={completed} className="font-display text-3xl font-bold" />
              <span className="mt-1 text-micro font-semibold text-ink-neutral">of {plannedToday}</span>
            </span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-micro font-semibold tracking-wide text-ink-neutral uppercase">{formatIsoDate(salonDateIso(0), { weekday: "long", day: "numeric", month: "short" })}</p>
            <p className="mt-1 font-display text-headline font-bold sm:text-title">Day progress</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusChip status="COMPLETED" size="sm" />
              {delayed > 0 ? (
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-destructive/12 px-2 text-[11px] font-semibold text-ink-destructive ring-1 ring-inset ring-destructive/25">
                  <AlertTriangle className="size-3" aria-hidden /> {delayed} over time
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Stagger className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StaggerItem>
          <StatCard icon={Hourglass} label="Waiting" value={waiting} tone="warning" loading={loading} />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={Scissors} label="In service" value={inService} tone="info" loading={loading} />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={CalendarCheck} label="Booked today" value={metrics.todayTotal} tone="primary" loading={loading} />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={IndianRupee} label="Revenue" value={todayRevenue} format={formatRevenue} tone="success" loading={loading} />
        </StaggerItem>
      </Stagger>
    </div>
  );
}
