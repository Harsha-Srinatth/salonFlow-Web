import { motion, useReducedMotion } from "motion/react";
import { Ban, CalendarClock, CalendarSync, ShieldAlert, Undo2 } from "lucide-react";
import { ResponsiveModal, SlideToConfirm } from "@/components/kit";
import { SkeletonShimmer } from "@/components/motion/skeleton-shimmer";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { spring } from "@/components/motion/presets";
import { formatMoney } from "@/lib/format";
import { formatSalonDateTime } from "@/lib/salon-date";

const money = (n) => formatMoney(n);

/**
 * Cancel (or "reschedule" = cancel, then rebook the same services) with the server's refund
 * preview front and centre. Confirming is a deliberate slide (contract item c).
 */
export function CancelBookingSheet({ open, onOpenChange, mode = "cancel", loading, preview, booking, onConfirm }) {
  const reduce = useReducedMotion();
  const reschedule = mode === "reschedule";
  const canCancel = Boolean(preview?.canCancel);
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={reschedule ? "Change time" : "Cancel booking"}
      description={reschedule ? "We cancel this one, then you pick a new time" : undefined}
      icon={reschedule ? CalendarSync : Ban}
      tone={reschedule ? "primary" : "destructive"}
      size="sm"
      footer={
        <div className="w-full">
          <SlideToConfirm
            tone={reschedule ? "primary" : "danger"}
            disabled={loading || !canCancel}
            label={reschedule ? "Slide to cancel & rebook" : "Slide to cancel"}
            confirmedLabel={reschedule ? "Cancelled" : "Cancelled"}
            resetAfter={null}
            onConfirm={onConfirm}
          />
          <button type="button" onClick={() => onOpenChange(false)} className="mt-2 h-11 w-full rounded-control text-sm font-semibold text-ink-neutral hover:bg-muted">
            Keep it
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-3" aria-label="Loading refund">
          <SkeletonShimmer className="h-16 rounded-2xl" />
          <SkeletonShimmer className="h-28 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-3">
          {booking ? (
            <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
              <CalendarClock className="size-5 shrink-0 text-portal" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{booking.service}</span>
                <span className="block text-caption text-ink-neutral">{formatSalonDateTime(booking.startsAt)}</span>
              </span>
            </div>
          ) : null}
          {canCancel ? (
            <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="rounded-2xl bg-success/12 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-success">
                <Undo2 className="size-4" aria-hidden /> {preview.tierLabel}
              </p>
              <p className="mt-1 flex items-baseline gap-2">
                <AnimatedCounter value={Number(preview.refundAmount ?? 0)} format={money} className="font-display text-display-lg leading-none font-bold" />
                <span className="text-sm font-semibold text-ink-neutral">back · {preview.refundPercent}%</span>
              </p>
              {Number(preview.retainedAmount ?? 0) > 0 ? <p className="mt-1.5 text-caption text-ink-neutral">{money(preview.retainedAmount)} not refundable</p> : null}
            </motion.div>
          ) : (
            <p className="flex items-center gap-2 rounded-2xl bg-destructive/12 p-4 text-sm font-semibold text-ink-destructive">
              <ShieldAlert className="size-5 shrink-0" aria-hidden />
              {preview?.reason ?? "This booking can't be cancelled."}
            </p>
          )}
        </div>
      )}
    </ResponsiveModal>
  );
}
