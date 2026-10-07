import { motion, useReducedMotion } from "motion/react";
import { Ban, CalendarSync, Clock, MessageSquareHeart, ReceiptText, RotateCcw, ShieldAlert, Trash2, UserRound, Wallet } from "lucide-react";
import { BookingTimeline, Rating, StatusChip } from "@/components/kit";
import { BrandDots } from "@/components/kit/brand-loader";
import { interaction, spring } from "@/components/motion/presets";
import { formatMoney } from "@/lib/format";
import { formatIsoDate, salonDateOf, salonTimeLabel } from "@/lib/salon-date";
import { formatCountdownMs, getPendingAutoCompleteCountdownMs, isNoShowBooking, isStartedPendingAutoComplete, normalizeBookingStatus } from "@/lib/booking-pending-status";
import { cn } from "@/lib/utils";
import { canCancelBooking, canRemoveBooking, canReviewBooking } from "../../lib/bookings";

function Action({ icon: Icon, children, onClick, tone, disabled, busy }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      whileTap={reduce || disabled ? undefined : interaction.press}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors disabled:opacity-50",
        tone === "danger" ? "bg-destructive/10 text-ink-destructive hover:bg-destructive/16" : tone === "primary" ? "bg-portal text-portal-foreground shadow-soft" : "bg-muted/70 hover:bg-muted"
      )}
    >
      {busy ? <BrandDots size={4} /> : <Icon className="size-4" aria-hidden />}
      {children}
    </motion.button>
  );
}

/** One booking: date tile, details, status, lifecycle timeline (upcoming) and its actions. */
export function BookingCard({ booking, index, nowMs, feedback, deleting, onInvoice, onReview, onCancel, onReschedule, onRemove, onRebook, reviewedRef }) {
  const reduce = useReducedMotion();
  const status = normalizeBookingStatus(booking.status);
  const dayIso = salonDateOf(booking.startsAt);
  const pendingAuto = isStartedPendingAutoComplete(booking);
  const upcoming = ["PENDING", "CONFIRMED", "STARTED"].includes(status);
  const times = booking.actualStartAt ? { STARTED: booking.actualStartAt } : {};

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -40, transition: { duration: 0.2 } }}
      transition={{ ...spring.soft, delay: reduce ? 0 : Math.min(index, 10) * 0.05 }}
      className="space-y-4 rounded-card bg-card p-4 shadow-soft ring-1 ring-inset ring-border/60 sm:p-5"
    >
      <div className="flex items-start gap-4">
        <div className={cn("grid w-14 shrink-0 place-items-center rounded-2xl py-2", upcoming ? "bg-portal text-portal-foreground shadow-glow" : "bg-muted text-foreground")}>
          <span className="text-micro font-semibold uppercase opacity-85">{formatIsoDate(dayIso, { month: "short" })}</span>
          <span className="font-display text-2xl leading-none font-bold tabular-nums">{formatIsoDate(dayIso, { day: "numeric" })}</span>
          <span className="text-micro opacity-85">{formatIsoDate(dayIso, { weekday: "short" })}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[17px] leading-snug font-semibold">{booking.service}</p>
            <StatusChip status={booking.status} booking={booking} audience="customer" size="sm" className="mt-0.5" />
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-neutral">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden /> {salonTimeLabel(booking.startsAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" aria-hidden /> {booking.stylistName ?? "To be assigned"}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Wallet className="size-3.5 text-ink-neutral" aria-hidden /> {formatMoney(booking.payableAmount ?? 0)}
            </span>
          </p>
        </div>
      </div>

      {upcoming ? <BookingTimeline status={booking.status} times={times} audience="customer" className="max-sm:[&_.text-caption]:text-[11px] max-sm:[&_.text-caption]:whitespace-nowrap" /> : null}

      {pendingAuto ? (
        <p className="flex items-center gap-2 rounded-2xl bg-info/12 px-3 py-2 text-sm font-semibold text-ink-info">
          <BrandDots size={4} /> Wraps up in {formatCountdownMs(getPendingAutoCompleteCountdownMs(booking, nowMs))}
        </p>
      ) : null}
      {isNoShowBooking(booking) ? (
        <p className="flex items-center gap-2 rounded-2xl bg-plum/12 px-3 py-2 text-sm font-semibold text-ink-plum">
          <ShieldAlert className="size-4 shrink-0" aria-hidden /> Missed visit · no refund
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {!upcoming && onRebook ? (
          <Action icon={RotateCcw} tone="primary" onClick={() => onRebook(booking)}>
            Book again
          </Action>
        ) : null}
        <Action icon={ReceiptText} onClick={() => onInvoice(booking)}>
          Invoice
        </Action>
        {canReviewBooking(booking) ? (
          feedback ? (
            <span ref={reviewedRef} className="inline-flex h-10 items-center rounded-full bg-gold/12 px-3">
              <Rating value={feedback.rating} size="sm" label="Your rating" />
            </span>
          ) : (
            <Action icon={MessageSquareHeart} onClick={() => onReview(booking)}>
              Rate
            </Action>
          )
        ) : null}
        {canCancelBooking(booking) ? (
          <>
            <Action icon={CalendarSync} onClick={() => onReschedule(booking)}>
              Change
            </Action>
            <Action icon={Ban} tone="danger" onClick={() => onCancel(booking)}>
              Cancel
            </Action>
          </>
        ) : null}
        {canRemoveBooking(booking) ? (
          <span className="ml-auto">
            <Action icon={Trash2} disabled={deleting} busy={deleting} onClick={() => onRemove(booking)}>
              <span className="sr-only sm:not-sr-only">Remove</span>
            </Action>
          </span>
        ) : null}
      </div>
    </motion.li>
  );
}
