"use client";

import { Avatar, StatusChip } from "@/components/kit";
import { interaction, spring } from "@/components/motion/presets";
import { iconForCategory } from "@/lib/service-icons";
import { cn } from "@/lib/utils";
import { amountDue, formatBookingTime, formatCurrency, relativeStartLabel } from "@/receptionist/lib/booking-utils";
import { AlertTriangle, Clock3, CreditCard, Phone, UserRound, XCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { maskPhone } from "@/lib/format";

/**
 * One booking as reception sees it. `layoutId` lets the same card glide between queue lanes
 * (Up next → In service) when a Socket.IO update changes its status.
 */
export function ReceptionBookingCard({ booking, nowMs, delayed = false, busy = false, onCancel, onCollect, layoutId, showRelative = true, className }) {
  const reduce = useReducedMotion();
  const ServiceIcon = iconForCategory(booking.service);
  const due = amountDue(booking);
  const canCancel = ["PENDING", "CONFIRMED"].includes(booking.status) && onCancel;
  const canCollect = due > 0 && ["PENDING", "CONFIRMED", "STARTED"].includes(booking.status) && onCollect;
  const timeLabel = showRelative && ["PENDING", "CONFIRMED"].includes(booking.status) ? relativeStartLabel(booking.startsAt, nowMs) : formatBookingTime(booking.startsAt);

  return (
    <motion.article
      layout={reduce ? false : true}
      layoutId={reduce ? undefined : layoutId}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      transition={spring.soft}
      className={cn(
        "relative overflow-hidden rounded-card border bg-card p-3.5 shadow-soft sm:p-4",
        delayed ? "border-destructive/40" : "border-border/60",
        className
      )}
    >
      {delayed ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-destructive" /> : null}
      <div className="flex items-start gap-3">
        <Avatar name={booking.customer} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate font-semibold leading-tight">{booking.customer ?? "Customer"}</h4>
            <StatusChip status={booking.status} booking={booking} size="sm" />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-neutral">
            <ServiceIcon className="size-3.5 shrink-0 text-portal" aria-hidden />
            <span className="truncate">{booking.service}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-neutral">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Clock3 className="size-3.5" aria-hidden />
              {timeLabel}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <UserRound className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{booking.stylistName ?? "Unassigned"}</span>
            </span>
            {booking.customerPhone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" aria-hidden />
                {maskPhone(booking.customerPhone)}
              </span>
            ) : null}
            {delayed ? (
              <span className="inline-flex items-center gap-1 font-semibold text-ink-destructive">
                <AlertTriangle className="size-3.5" aria-hidden /> Over time
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <span className="font-display text-lg font-bold tabular-nums">
          {formatCurrency(booking.payableAmount)}
          {due > 0 ? <span className="ml-1.5 text-caption font-semibold text-ink-warning">{formatCurrency(due)} due</span> : null}
        </span>
        <div className="flex items-center gap-2">
          {canCancel ? (
            <motion.button
              type="button"
              whileTap={reduce ? undefined : interaction.press}
              disabled={busy}
              onClick={() => onCancel(booking)}
              className="inline-flex h-11 items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-ink-destructive hover:bg-destructive/10 disabled:opacity-50"
              aria-label={`Cancel booking for ${booking.customer ?? "customer"}`}
            >
              <XCircle className="size-4" aria-hidden />
              <span className="hidden sm:inline">Cancel</span>
            </motion.button>
          ) : null}
          {canCollect ? (
            <motion.button
              type="button"
              whileTap={reduce ? undefined : interaction.press}
              onClick={() => onCollect(booking)}
              className="inline-flex h-11 items-center gap-1.5 rounded-control bg-portal px-4 text-sm font-semibold text-portal-foreground shadow-soft hover:shadow-glow"
            >
              <CreditCard className="size-4" aria-hidden />
              Collect
            </motion.button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
