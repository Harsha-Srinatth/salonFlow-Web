"use client";

import { Avatar, StatusChip } from "@/components/kit";
import { spring } from "@/components/motion/presets";
import { formatDuration, formatMoney, maskPhone } from "@/lib/format";
import { salonTimeLabel } from "@/lib/salon-date";
import { iconForCategory } from "@/lib/service-icons";
import { cn } from "@/lib/utils";
import { CompleteServiceControl, StartServiceButton } from "@/employee/components/service-actions";
import { AlertTriangle, Clock3, Phone, Timer } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const RING_STROKE = { portal: "hsl(var(--portal-accent))", warning: "hsl(var(--warning))", destructive: "hsl(var(--destructive))" };

/** Planned-time ring without a glow filter (crisp at small sizes); pathLength springs each tick. */
function TimerRing({ ratio, size, stroke, tone, children }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <span role="progressbar" aria-label="Service time used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={RING_STROKE[tone]} strokeWidth={stroke} strokeLinecap="round" initial={false} animate={{ pathLength: pct }} transition={reduce ? { duration: 0 } : spring.gentle} />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </span>
  );
}

/** Live service timer: ring of planned time used + remaining (or overtime) clock. */
export function ServiceTimer({ card, size = 56, large = false }) {
  const over = card.overtime;
  const tone = card.beyondGrace ? "destructive" : over ? "warning" : "portal";
  return (
    <div className="flex items-center gap-3">
      <TimerRing ratio={card.elapsedRatio} size={size} stroke={large ? 9 : 6} tone={tone}>
        <Timer className={cn(large ? "size-6" : "size-4", over ? "text-ink-warning" : "text-portal")} aria-hidden />
      </TimerRing>
      <div>
        <p className={cn("font-display font-bold tabular-nums", large ? "text-display-lg leading-none" : "text-xl", card.beyondGrace ? "text-ink-destructive" : over ? "text-ink-warning" : "")}>
          {card.serviceTimerText.replace("-", "+")}
        </p>
        <p className="text-caption font-semibold text-ink-neutral">{over ? "Over planned time" : "Left"}</p>
      </div>
    </div>
  );
}

/** A booking assigned to this stylist, with the status-machine actions (Start / hold to Complete). */
export function AppointmentCard({ card, onStart, onComplete, onCompleted, highlight = false }) {
  const reduce = useReducedMotion();
  const { booking } = card;
  const ServiceIcon = iconForCategory(booking.service);
  const flagged = card.beyondGrace;

  return (
    <motion.article
      layout={reduce ? false : true}
      layoutId={reduce ? undefined : `stylist-${booking.id}`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      transition={spring.soft}
      className={cn(
        "relative overflow-hidden rounded-card border bg-card p-4 shadow-soft",
        flagged ? "border-destructive/45" : highlight ? "border-portal/40 shadow-glow" : "border-border/60"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={booking.customer} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-headline font-semibold leading-tight">{booking.customer ?? "Customer"}</h3>
            <StatusChip status={booking.status} booking={booking} size="sm" />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-neutral">
            <ServiceIcon className="size-4 shrink-0 text-portal" aria-hidden />
            <span className="truncate">{booking.service}</span>
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-neutral">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground tabular-nums">
              <Clock3 className="size-3.5" aria-hidden />
              {salonTimeLabel(booking.startsAt)}
            </span>
            {booking.durationMinutes ? <span>{formatDuration(booking.durationMinutes)}</span> : null}
            {booking.payableAmount != null ? <span className="tabular-nums">{formatMoney(booking.payableAmount)}</span> : null}
          </p>
        </div>
      </div>

      {card.isStarted ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3">
          <ServiceTimer card={card} />
          {card.pendingAutoComplete ? <p className="text-caption text-ink-neutral">Auto-completes in {card.pendingTimerText}</p> : null}
        </div>
      ) : null}

      {flagged || Number(booking.penaltyAmount ?? 0) > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-caption font-semibold text-ink-destructive">
          <AlertTriangle className="size-3.5" aria-hidden />
          {flagged ? "10+ min over" : null}
          {Number(booking.penaltyAmount ?? 0) > 0 ? ` Penalty ${formatMoney(booking.penaltyAmount, { decimals: true })}` : null}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        {booking.customerPhone ? (
          <a
            href={`tel:${booking.customerPhone}`}
            className="grid size-11 shrink-0 place-items-center rounded-control bg-muted text-foreground hover:bg-muted/70"
            aria-label={`Call ${booking.customer ?? "customer"} (${maskPhone(booking.customerPhone)})`}
          >
            <Phone className="size-4.5" aria-hidden />
          </a>
        ) : null}
        <div className="min-w-0 flex-1">
          {card.canComplete ? (
            <CompleteServiceControl card={card} onComplete={onComplete} onCompleted={onCompleted} />
          ) : (
            <StartServiceButton card={card} onStart={onStart} />
          )}
        </div>
      </div>
    </motion.article>
  );
}
