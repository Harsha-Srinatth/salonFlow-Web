"use client";

import { Avatar, EmptyState, IconButton, StatusChip } from "@/components/kit";
import { StaffDayTimeline } from "@/components/kit-extra/staff-day-timeline";
import { SkeletonList } from "@/components/motion";
import { spring, stagger } from "@/components/motion/presets";
import { salonRelativeDayLabel } from "@/lib/salon-date";
import { iconForCategory } from "@/lib/service-icons";
import { cn } from "@/lib/utils";
import { bookingDayIso, formatBookingTime, formatCurrency } from "@/receptionist/lib/booking-utils";
import { AlertTriangle, UserRound, XCircle } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

/** Compact booking card for the schedule (timeline rows and the list view). */
export function ScheduleCard({ booking, showStylist = true, showTime = false, delayed = false, onCancel }) {
  const ServiceIcon = iconForCategory(booking.service);
  const canCancel = ["PENDING", "CONFIRMED"].includes(booking.status) && onCancel;
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border bg-card p-3 shadow-soft", delayed ? "border-destructive/40" : "border-border/60")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 truncate font-semibold">{booking.customer ?? "Customer"}</p>
          <StatusChip status={booking.status} booking={booking} size="sm" />
          {delayed ? <AlertTriangle className="size-4 text-ink-destructive" aria-label="Over time" /> : null}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-caption text-ink-neutral">
          <ServiceIcon className="size-3.5 shrink-0 text-portal" aria-hidden />
          <span className="truncate">{booking.service}</span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-ink-neutral">
          {showTime ? <span className="font-semibold text-foreground tabular-nums">{formatBookingTime(booking.startsAt)}</span> : null}
          {showStylist ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <UserRound className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{booking.stylistName ?? "Unassigned"}</span>
            </span>
          ) : null}
          <span className="font-semibold text-foreground tabular-nums">{formatCurrency(booking.payableAmount)}</span>
        </p>
      </div>
      {canCancel ? <IconButton icon={XCircle} label={`Cancel booking for ${booking.customer ?? "customer"}`} variant="danger" size="sm" onClick={() => onCancel(booking)} /> : null}
    </div>
  );
}

/**
 * One salon day on a time rail. With `byStylist` and room (≥1024px), one lane per stylist; on phones
 * a single rail with the stylist on each card.
 */
export function ScheduleDay({ bookings, stylists, byStylist, nowMs, isToday, isCriticalDelay, onCancel }) {
  const lanes = useMemo(() => {
    if (!byStylist) return [];
    const map = new Map(stylists.map((s) => [s.id, { id: s.id, name: s.name, items: [] }]));
    for (const b of bookings) {
      const key = b.stylistId ?? "unassigned";
      if (!map.has(key)) map.set(key, { id: key, name: b.stylistName ?? "Unassigned", items: [] });
      map.get(key).items.push(b);
    }
    return [...map.values()].filter((lane) => lane.items.length);
  }, [bookings, stylists, byStylist]);

  if (byStylist) {
    return (
      <LayoutGroup id="schedule-lanes">
        <div className="hidden gap-4 lg:grid lg:grid-cols-2 2xl:grid-cols-3">
          {lanes.map((lane) => (
            <section key={lane.id} aria-label={lane.name} className="min-w-0 rounded-card border border-border/60 bg-card/60 p-3">
              <header className="mb-2 flex items-center gap-2 px-1">
                <Avatar name={lane.name} size="sm" />
                <h3 className="flex-1 truncate font-semibold">{lane.name}</h3>
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-muted px-1.5 text-micro font-bold tabular-nums">{lane.items.length}</span>
              </header>
              <StaffDayTimeline
                items={lane.items}
                nowMs={isToday ? nowMs : undefined}
                renderItem={(b) => <ScheduleCard booking={b} showStylist={false} delayed={isCriticalDelay?.(b)} onCancel={onCancel} />}
              />
            </section>
          ))}
        </div>
        <div className="lg:hidden">
          <StaffDayTimeline
            items={bookings}
            nowMs={isToday ? nowMs : undefined}
            renderItem={(b) => <ScheduleCard booking={b} delayed={isCriticalDelay?.(b)} onCancel={onCancel} />}
          />
        </div>
      </LayoutGroup>
    );
  }

  return (
    <StaffDayTimeline
      items={bookings}
      nowMs={isToday ? nowMs : undefined}
      renderItem={(b) => <ScheduleCard booking={b} delayed={isCriticalDelay?.(b)} onCancel={onCancel} />}
    />
  );
}

/** Every loaded booking, grouped by salon day (Today, Tomorrow, "Mon, 6 Oct"). */
export function ScheduleList({ bookings, isCriticalDelay, onCancel }) {
  const reduce = useReducedMotion();
  const groups = useMemo(() => {
    const map = new Map();
    const sorted = [...bookings].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    for (const b of sorted) {
      const day = bookingDayIso(b);
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(b);
    }
    return [...map.entries()];
  }, [bookings]);

  return (
    <div className="space-y-6">
      {groups.map(([day, items]) => (
        <section key={day} aria-label={salonRelativeDayLabel(day)}>
          <h3 className="sticky top-[calc(var(--topbar-h)+var(--safe-top))] z-raised -mx-1 mb-2 rounded-xl bg-background px-1 py-1.5 font-display text-headline font-semibold">
            {salonRelativeDayLabel(day)} <span className="text-caption font-semibold text-ink-neutral">· {items.length}</span>
          </h3>
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {items.map((b, i) => (
                <motion.li
                  key={b.id}
                  layout={reduce ? false : "position"}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ ...spring.soft, delay: Math.min(i, 10) * stagger.tight }}
                >
                  <ScheduleCard booking={b} showTime delayed={isCriticalDelay?.(b)} onCancel={onCancel} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ScheduleLoading() {
  return <SkeletonList rows={5} label="Loading schedule" />;
}

export function ScheduleEmpty({ searching, onClear }) {
  return searching ? (
    <EmptyState
      illustration="search"
      title="No matches"
      description="Try a name, phone or service."
      action={
        <button type="button" onClick={onClear} className="h-11 rounded-control px-4 text-sm font-semibold text-portal hover:bg-portal/10">
          Clear search
        </button>
      }
    />
  ) : (
    <EmptyState illustration="calendar" title="Nothing booked" description="Walk-ins you add show up here." />
  );
}
