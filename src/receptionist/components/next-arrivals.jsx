"use client";

import { Avatar } from "@/components/kit";
import { spring, stagger } from "@/components/motion/presets";
import { iconForCategory } from "@/lib/service-icons";
import { cn } from "@/lib/utils";
import { formatBookingTime, groupQueueByStatus, minutesUntil, relativeStartLabel } from "@/receptionist/lib/booking-utils";
import { DoorOpen } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/** The next few customers expected at the desk, soonest first, with a live "in 8 min" label. */
export function NextArrivals({ queue, nowMs, limit = 4 }) {
  const reduce = useReducedMotion();
  const next = groupQueueByStatus(queue).upcoming.slice(0, limit);
  if (!next.length) return null;

  return (
    <section aria-label="Next arrivals" className="rounded-card border border-border/60 bg-card p-4 shadow-soft">
      <header className="mb-3 flex items-center gap-2">
        <DoorOpen className="size-4.5 text-portal" aria-hidden />
        <h2 className="font-display text-headline font-semibold">Next arrivals</h2>
      </header>
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {next.map((b, i) => {
            const mins = minutesUntil(b.startsAt, nowMs);
            const ServiceIcon = iconForCategory(b.service);
            return (
              <motion.li
                key={b.id}
                layout={reduce ? false : "position"}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ ...spring.soft, delay: i * stagger.base }}
                className="flex items-center gap-3 rounded-2xl bg-muted/50 p-2.5"
              >
                <Avatar name={b.customer} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{b.customer}</span>
                  <span className="flex items-center gap-1 truncate text-caption text-ink-neutral">
                    <ServiceIcon className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{b.stylistName ?? formatBookingTime(b.startsAt)}</span>
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-1 text-micro font-bold tabular-nums",
                    mins < -1 ? "bg-destructive/12 text-ink-destructive" : mins <= 15 ? "bg-portal/12 text-portal" : "bg-card text-ink-neutral"
                  )}
                >
                  {relativeStartLabel(b.startsAt, nowMs)}
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </section>
  );
}
