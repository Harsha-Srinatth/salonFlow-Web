"use client";

import { ErrorState, ResponsiveModal, SlideToConfirm } from "@/components/kit";
import { SkeletonText } from "@/components/motion";
import { spring } from "@/components/motion/presets";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { formatBookingDateTime, formatCurrency } from "@/receptionist/lib/booking-utils";
import {
  fetchReceptionCancellationPreviewAsync,
  updateReceptionBookingAsync,
} from "@/store/reception-bookings-slice";
import { Ban, CircleX, Landmark, Wallet } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { useCallback, useEffect, useId, useState } from "react";
import { useDispatch } from "react-redux";

const money = (value) => Math.round(Number(value ?? 0) * 100) / 100;

/**
 * Cancel a booking from the desk. Same endpoints and refund-percent rules as the shared
 * CancelBookingDialog (cancellation preview → PATCH action "cancel" with refundPercent), redone with
 * kit pieces: refund chips with a morphing pill and a slide-to-confirm (contract item c).
 * The server recomputes the refund from what was actually paid; this is a preview.
 */
export function ReceptionCancelSheet({ booking, open, onOpenChange }) {
  const dispatch = useDispatch();
  const pillId = useId();
  const bookingId = booking?.id ?? null;
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [percent, setPercent] = useState(0);

  const load = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    const result = await dispatch(fetchReceptionCancellationPreviewAsync(bookingId));
    setLoading(false);
    if (fetchReceptionCancellationPreviewAsync.rejected.match(result)) {
      setError(result.payload ?? "Could not load cancellation details");
      return;
    }
    setPreview(result.payload);
    setPercent(Number(result.payload?.policy?.percent ?? 0));
  }, [bookingId, dispatch]);

  useEffect(() => {
    if (open && bookingId) void load();
  }, [open, bookingId, load]);

  const held = money(preview?.booking?.heldAmount);
  const refund = money((held * percent) / 100);
  const retained = money(held - refund);
  const options = preview?.options ?? [0, 25, 50, 75, 100];
  const subject = preview?.booking ?? booking;

  async function confirm() {
    const result = await dispatch(updateReceptionBookingAsync({ bookingId, action: "cancel", refundPercent: percent }));
    if (updateReceptionBookingAsync.rejected.match(result)) {
      notify.error(result.payload ?? "Could not cancel booking");
      throw new Error("cancel failed");
    }
    notify.success(refund > 0 ? "Booking cancelled" : "Booking cancelled · no refund", {
      description: refund > 0 ? `${formatCurrency(refund)} (${percent}%) refunded${preview?.paidOnline ? " to original payment" : ""}` : undefined,
    });
    setTimeout(() => onOpenChange(false), 600);
  }

  const canCancel = preview?.canCancel;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel booking"
      description={subject ? `${subject.customer ?? "Customer"} · ${formatBookingDateTime(subject.startsAt)}` : undefined}
      icon={CircleX}
      tone="destructive"
      size="sm"
      footer={
        <div className="w-full">
          <SlideToConfirm
            tone="danger"
            label={refund > 0 ? `Slide to cancel · refund ${formatCurrency(refund)}` : "Slide to cancel"}
            confirmedLabel="Cancelled"
            disabled={!canCancel}
            onConfirm={confirm}
            resetAfter={null}
          />
          <button type="button" onClick={() => onOpenChange(false)} className="mt-2 h-11 w-full rounded-control text-sm font-semibold text-ink-neutral hover:bg-muted">
            Keep booking
          </button>
        </div>
      }
    >
      {loading ? <SkeletonText lines={4} className="py-2" /> : null}
      {error ? <ErrorState compact title="Couldn't load details" description={error} onRetry={load} /> : null}
      {preview && canCancel === false ? (
        <p className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-3 text-sm font-medium text-ink-destructive">
          <Ban className="mt-0.5 size-4 shrink-0" aria-hidden /> {preview.reason ?? "This booking can't be cancelled."}
        </p>
      ) : null}
      {canCancel ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3">
            <span className="inline-flex items-center gap-2 text-sm text-ink-neutral">
              <Wallet className="size-4" aria-hidden /> Paid
            </span>
            <span className="font-display text-lg font-bold tabular-nums">{formatCurrency(held)}</span>
          </div>

          <div>
            <p id={`${pillId}-label`} className="mb-2 text-caption font-semibold text-ink-neutral">
              Refund · policy {preview.policy?.percent ?? 0}%{preview.policy?.tierLabel ? ` (${preview.policy.tierLabel})` : ""}
            </p>
            <LayoutGroup id={pillId}>
              <div role="radiogroup" aria-labelledby={`${pillId}-label`} className="grid grid-cols-5 gap-1 rounded-full bg-muted p-1">
                {options.map((value) => {
                  const active = value === percent;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={held <= 0}
                      onClick={() => setPercent(value)}
                      className={cn("relative h-11 rounded-full text-sm font-semibold tabular-nums disabled:opacity-50", active ? "text-foreground" : "text-ink-neutral")}
                    >
                      {active ? <motion.span layoutId={`${pillId}-pill`} transition={spring.snappy} className="absolute inset-0 rounded-full bg-card shadow-soft ring-1 ring-destructive/25" /> : null}
                      <span className="relative">{value}%</span>
                      {value === preview.policy?.percent ? <span aria-hidden className="absolute top-1.5 right-2 size-1.5 rounded-full bg-portal" /> : null}
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
          </div>

          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-primary/10 p-3">
              <dt className="text-caption text-ink-neutral">To customer</dt>
              <dd className="font-display text-lg font-bold text-ink-primary tabular-nums">{formatCurrency(refund)}</dd>
            </div>
            <div className="rounded-2xl bg-muted/60 p-3">
              <dt className="text-caption text-ink-neutral">Salon keeps</dt>
              <dd className="font-display text-lg font-bold tabular-nums">{formatCurrency(retained)}</dd>
            </div>
          </dl>
          {held > 0 && refund > 0 ? (
            <p className="flex items-center gap-2 text-caption text-ink-neutral">
              <Landmark className="size-3.5 shrink-0" aria-hidden />
              {preview.paidOnline ? `Auto-refund to original payment${preview.onlineMethod ? ` (${preview.onlineMethod.toUpperCase()})` : ""}` : "Hand back at the desk"}
            </p>
          ) : null}
        </div>
      ) : null}
    </ResponsiveModal>
  );
}
