"use client";

import { Avatar, EmptyState, StatusChip } from "@/components/kit";
import { SkeletonCard } from "@/components/motion";
import { spring } from "@/components/motion/presets";
import { formatDuration } from "@/lib/format";
import { salonTimeLabel } from "@/lib/salon-date";
import { iconForCategory } from "@/lib/service-icons";
import { relativeStartLabel } from "@/receptionist/lib/booking-utils";
import { ServiceTimer } from "@/employee/components/appointment-card";
import { CompleteServiceControl, StartServiceButton } from "@/employee/components/service-actions";
import { Scissors, SkipForward } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

function HeroShell({ eyebrow, icon: Icon, children, live = false }) {
  return (
    <div className="relative overflow-hidden rounded-card border border-border/60 bg-card p-5 shadow-soft sm:p-6">
      <div className="relative z-[2]">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-portal/12 px-2.5 py-1 text-micro font-bold tracking-wide text-portal uppercase">
          {live ? (
            <span className="relative grid size-1.5" aria-hidden>
              <span className="relative size-1.5 rounded-full bg-portal" />
            </span>
          ) : null}
          <Icon className="size-3.5" aria-hidden />
          {eyebrow}
        </p>
        {children}
      </div>
    </div>
  );
}

/**
 * The one thing that matters right now: the active service (big timer + hold to complete) or,
 * if the chair is free, the next client (big Start). Morphs between the two as status changes.
 */
export function NowNextHero({ active, next, nowMs, loading, onStart, onComplete, onCompleted }) {
  const reduce = useReducedMotion();
  if (loading) return <SkeletonCard className="h-56" />;
  const card = active ?? next;
  const key = card ? `${active ? "now" : "next"}-${card.booking.id}` : "empty";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
        transition={spring.sheet}
      >
        {!card ? (
          <EmptyState illustration="sparkle" title="All clear" description="New assignments appear here live." className="border border-border/60 shadow-soft" />
        ) : (
          <HeroShell eyebrow={active ? "Now" : "Next"} icon={active ? Scissors : SkipForward} live={Boolean(active)}>
            <HeroBody card={card} active={Boolean(active)} nowMs={nowMs} onStart={onStart} onComplete={onComplete} onCompleted={onCompleted} />
          </HeroShell>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function HeroBody({ card, active, nowMs, onStart, onComplete, onCompleted }) {
  const { booking } = card;
  const ServiceIcon = iconForCategory(booking.service);
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:items-end">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <Avatar name={booking.customer} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate font-display text-title font-bold">{booking.customer ?? "Customer"}</h2>
            <p className="flex items-center gap-1.5 text-sm text-ink-neutral">
              <ServiceIcon className="size-4 shrink-0 text-portal" aria-hidden />
              <span className="truncate">{booking.service}</span>
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusChip status={booking.status} booking={booking} />
          <span className="inline-flex h-7 items-center rounded-full bg-card/80 px-2.5 text-xs font-semibold tabular-nums ring-1 ring-inset ring-border">
            {active ? salonTimeLabel(booking.actualStartAt ?? booking.startsAt) : relativeStartLabel(booking.startsAt, nowMs)}
          </span>
          {booking.durationMinutes ? (
            <span className="inline-flex h-7 items-center rounded-full bg-card/80 px-2.5 text-xs font-semibold ring-1 ring-inset ring-border">{formatDuration(booking.durationMinutes)}</span>
          ) : null}
        </div>
        {active ? (
          <div className="mt-5">
            <ServiceTimer card={card} size={88} large />
          </div>
        ) : null}
      </div>
      <div>
        {active ? (
          <CompleteServiceControl card={card} onComplete={onComplete} onCompleted={onCompleted} />
        ) : (
          <StartServiceButton card={card} onStart={onStart} size="lg" className="h-15 text-lg" />
        )}
      </div>
    </div>
  );
}
