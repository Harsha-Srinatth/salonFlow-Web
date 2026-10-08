"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Radio } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusChip } from "@/components/kit";
import { spring } from "@/components/motion";
import { normalizeStatus } from "@/components/kit/status-meta";
import { timeOf } from "@/admin/lib/safe-format";
import { AvatarBadge } from "./avatar-badge";

const MAX = 8;

/**
 * Live activity: booking status changes that arrive over the realtime socket while this screen is
 * open (they patch the Redux store; this diffs it). Before anything happens it shows today's
 * started/finished services by their slot time, so it is never invented.
 * @param {{ bookings: object[], today: object[] }} props
 */
export function ActivityFeed({ bookings, today }) {
  const reduce = useReducedMotion();
  const previous = useRef(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const next = new Map(bookings.map((b) => [b.id, normalizeStatus(b.status)]));
    const prev = previous.current;
    previous.current = next;
    if (!prev) return;
    const fresh = [];
    for (const booking of bookings) {
      const before = prev.get(booking.id);
      const now = next.get(booking.id);
      if (before && now && before !== now) fresh.push({ id: `${booking.id}:${now}:${Date.now()}`, booking, from: before, at: new Date().toISOString(), live: true });
    }
    if (fresh.length) setEvents((list) => [...fresh, ...list].slice(0, MAX));
  }, [bookings]);

  const earlier = useMemo(
    () =>
      today
        .filter((b) => ["STARTED", "COMPLETED", "NO-SHOW"].includes(normalizeStatus(b.status)))
        .sort((a, b) => new Date(b.actualStartAt ?? b.startsAt) - new Date(a.actualStartAt ?? a.startsAt))
        .slice(0, MAX)
        .map((b) => ({ id: `seed:${b.id}`, booking: b, at: b.actualStartAt ?? b.startsAt, live: false })),
    [today]
  );
  const rows = events.length ? [...events, ...earlier].slice(0, MAX) : earlier;

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="relative grid size-11 place-items-center rounded-2xl bg-portal/12 text-portal">
          <span aria-hidden className="kit-live-ping absolute inset-0 rounded-2xl bg-portal/30" />
          <Radio className="relative size-5" aria-hidden />
        </span>
        <p className="font-display font-semibold">Listening for updates</p>
        <p className="text-caption text-ink-neutral">Check-ins and status changes appear here live</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-1" aria-live="polite">
      <span aria-hidden className="absolute top-3 bottom-3 left-[21px] w-px bg-border" />
      <AnimatePresence initial={false}>
        {rows.map((event) => (
          <motion.li
            key={event.id}
            layout={!reduce}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -16, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.soft}
            className="relative flex items-center gap-3 rounded-2xl py-2 pr-2"
          >
            <AvatarBadge name={event.booking.customer} size="md" className="ring-2 ring-card" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{event.booking.customer ?? "Customer"}</p>
              <p className="flex min-w-0 items-center gap-1 truncate text-caption text-ink-neutral">
                {event.live && event.from ? (
                  <>
                    <StatusChip status={event.from} size="sm" iconOnly />
                    <ArrowRight className="size-3 shrink-0" aria-hidden />
                  </>
                ) : null}
                <span className="truncate">{event.booking.service ?? "Service"}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusChip status={event.booking.status} booking={event.booking} size="sm" />
              <span className="text-[11px] font-medium text-ink-neutral tabular-nums">{event.live ? `Live · ${timeOf(event.at)}` : `Slot ${timeOf(event.at)}`}</span>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}
