"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { groupEmployeeQueue, formatBookingDateTime } from "@/employee/lib/queue-utils";
import { BookingStatusBadge } from "@/receptionist/components/booking-status-badge";
import { formatCurrency } from "@/receptionist/lib/booking-utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  PlayCircle,
  Scissors,
  Timer,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingOrb } from "@/components/shared/loading-orb";

function AppointmentCard({
  card,
  mutatingId,
  onStart,
  onComplete,
  highlight = false,
}) {
  const { booking, isStarted, pendingAutoComplete, displayStatus, pendingTimerText, inRedZone, beyondGrace, serviceTimerText } =
    card;
  const isDelayed = beyondGrace;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        highlight && "border-primary/40 ring-1 ring-primary/20",
        isDelayed && "border-destructive/50 bg-destructive/5",
        inRedZone && !isDelayed && "border-amber-500/40 bg-amber-500/5"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{booking.customer}</p>
            <BookingStatusBadge status={booking.status} />
            {displayStatus !== booking.status ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{displayStatus}</span>
            ) : null}
            {isDelayed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                <AlertTriangle className="size-3" />
                Delayed
              </span>
            ) : null}
            {inRedZone && !isDelayed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <Timer className="size-3" />
                Red zone
              </span>
            ) : null}
          </div>

          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Scissors className="size-3.5 shrink-0" />
            <span className="truncate">{booking.service}</span>
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" />
              {formatBookingDateTime(booking.startsAt)}
            </span>
            {booking.durationMinutes ? (
              <span>{booking.durationMinutes} min service</span>
            ) : null}
            {booking.customerPhone ? (
              <span className="inline-flex items-center gap-1">
                <User className="size-3.5" />
                {booking.customerPhone}
              </span>
            ) : null}
          </div>

          {pendingAutoComplete ? (
            <p className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Timer className="size-3.5" />
              Auto-completes in {pendingTimerText}
            </p>
          ) : null}

          {isStarted && !pendingAutoComplete ? (
            <p
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums",
                beyondGrace
                  ? "bg-destructive/10 text-destructive"
                  : inRedZone
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              )}
            >
              <Timer className="size-3.5" />
              Service timer: {serviceTimerText}
              {beyondGrace ? " · Over 10 min late" : inRedZone ? " · Wrap up soon" : ""}
            </p>
          ) : null}

          {Number(booking.penaltyAmount ?? 0) > 0 ? (
            <p className="text-xs font-medium text-destructive">
              Penalty: {formatCurrency(booking.penaltyAmount)}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
          {booking.payableAmount != null ? (
            <p className="w-full text-sm font-semibold sm:text-right">{formatCurrency(booking.payableAmount)}</p>
          ) : null}
          {!isStarted ? (
            <Button
              size="sm"
              disabled={mutatingId === booking.id}
              onClick={() => void onStart(booking.id)}
              className="gap-1.5"
            >
              <PlayCircle className="size-4" />
              {mutatingId === booking.id ? "Starting…" : "Start service"}
            </Button>
          ) : null}
          {booking.status !== "COMPLETED" ? (
            <Button
              size="sm"
              variant={isStarted ? "default" : "outline"}
              disabled={mutatingId === booking.id}
              onClick={() => void onComplete(booking.id)}
              className="gap-1.5"
            >
              <CheckCircle2 className="size-4" />
              {mutatingId === booking.id ? "Completing…" : "Complete"}
            </Button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function QueueSection({ id, title, emptyLabel, cards, mutatingId, onStart, onComplete, highlightFirst = false }) {
  return (
    <section id={id} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold">{title}</h3>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums">{cards.length}</span>
      </div>
      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {cards.map((card, index) => (
              <AppointmentCard
                key={card.booking.id}
                card={card}
                mutatingId={mutatingId}
                onStart={onStart}
                onComplete={onComplete}
                highlight={highlightFirst && index === 0}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </section>
  );
}

function QueueSkeleton() {
  return <LoadingOrb compact />;
}

export function AppointmentQueueBoard({
  cards = [],
  loading = false,
  mutatingId,
  onStart,
  onComplete,
  compact = false,
}) {
  const { waiting, active } = groupEmployeeQueue(cards);

  if (loading) return <QueueSkeleton />;

  if (!cards.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center">
        <p className="font-medium">No assigned bookings today</p>
        <p className="mt-1 text-sm text-muted-foreground">
          When reception assigns you appointments, they will appear here in real time.
        </p>
      </div>
    );
  }

  if (compact) {
    const preview = [...active, ...waiting].slice(0, 3);
    return (
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {preview.map((card) => (
            <AppointmentCard
              key={card.booking.id}
              card={card}
              mutatingId={mutatingId}
              onStart={onStart}
              onComplete={onComplete}
              highlight={card.isStarted}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <QueueSection
        id="active"
        title="In service"
        emptyLabel="No active services. Start the next waiting appointment when the client is ready."
        cards={active}
        mutatingId={mutatingId}
        onStart={onStart}
        onComplete={onComplete}
        highlightFirst
      />
      <QueueSection
        title="Up next"
        emptyLabel="No clients waiting. Enjoy a breather or check back shortly."
        cards={waiting}
        mutatingId={mutatingId}
        onStart={onStart}
        onComplete={onComplete}
        highlightFirst
      />
    </div>
  );
}
