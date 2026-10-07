"use client";

import { EmptyState } from "@/components/kit";
import { SkeletonListItem } from "@/components/motion";
import { cn } from "@/lib/utils";
import { groupQueueByStatus } from "@/receptionist/lib/booking-utils";
import { ReceptionBookingCard } from "@/receptionist/components/reception-booking-card";
import { Hourglass, Scissors } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { spring } from "@/components/motion/presets";

function Lane({ title, icon: Icon, tone, bookings, empty, nowMs, isCriticalDelay, updatingBookingId, onCancel, onCollect }) {
  const reduce = useReducedMotion();
  return (
    <section aria-label={title} className="min-w-0 space-y-3">
      <header className="flex items-center gap-2">
        <span className={cn("grid size-9 place-items-center rounded-xl", tone)}>
          <Icon className="size-4.5" aria-hidden />
        </span>
        <h3 className="font-display text-headline font-semibold">{title}</h3>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={bookings.length}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.8 }}
            transition={spring.bouncy}
            className="grid h-7 min-w-7 place-items-center rounded-full bg-muted px-2 text-caption font-bold tabular-nums"
            aria-label={`${bookings.length} bookings`}
          >
            {bookings.length}
          </motion.span>
        </AnimatePresence>
      </header>
      <div className="relative space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {bookings.length ? (
            bookings.map((booking) => (
              <ReceptionBookingCard
                key={booking.id}
                layoutId={`queue-${booking.id}`}
                booking={booking}
                nowMs={nowMs}
                delayed={isCriticalDelay?.(booking)}
                busy={updatingBookingId === booking.id}
                onCancel={onCancel}
                onCollect={onCollect}
              />
            ))
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {empty}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/**
 * Live queue: "Up next" and "In service" lanes. All cards share one LayoutGroup, so when a socket
 * update moves a booking from waiting to started the card glides across instead of popping.
 */
export function LiveQueueBoard({ queue, loading, nowMs, isCriticalDelay, updatingBookingId, onCancel, onCollect }) {
  const { upcoming, inService } = groupQueueByStatus(queue);

  if (loading && !queue.length) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3">
            <SkeletonListItem />
            <SkeletonListItem />
          </div>
        ))}
      </div>
    );
  }

  return (
    <LayoutGroup id="reception-queue">
      <div className="grid gap-6 lg:grid-cols-2">
        <Lane
          title="Up next"
          icon={Hourglass}
          tone="bg-warning/14 text-ink-warning"
          bookings={upcoming}
          nowMs={nowMs}
          isCriticalDelay={isCriticalDelay}
          updatingBookingId={updatingBookingId}
          onCancel={onCancel}
          onCollect={onCollect}
          empty={<EmptyState compact illustration="queue" title="No one waiting" description="Walk-ins and online bookings land here." className="border border-dashed border-border/80" />}
        />
        <Lane
          title="In service"
          icon={Scissors}
          tone="bg-info/12 text-ink-info"
          bookings={inService}
          nowMs={nowMs}
          isCriticalDelay={isCriticalDelay}
          updatingBookingId={updatingBookingId}
          onCancel={onCancel}
          onCollect={onCollect}
          empty={<EmptyState compact icon={Scissors} title="Chairs are free" description="Stylists start services from their portal." className="border border-dashed border-border/80" />}
        />
      </div>
    </LayoutGroup>
  );
}
