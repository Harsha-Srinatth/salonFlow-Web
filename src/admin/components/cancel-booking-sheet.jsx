"use client";
import { motion, useReducedMotion } from "motion/react";
import { CircleX, Landmark, Smartphone, Undo2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState, ResponsiveModal, SlideToConfirm } from "@/components/kit";
import { AnimatedCounter, SkeletonText, haptic, spring } from "@/components/motion";
import { formatMoney } from "@/lib/format";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { dayTimeOf } from "@/admin/lib/safe-format";

const money2 = (value) => Math.round(Number(value ?? 0) * 100) / 100;
const fmt = (n) => formatMoney(n, { decimals: !Number.isInteger(money2(n)) });

/**
 * Admin cancel + refund. Same contract and backend call as the reception desk's
 * CancelBookingDialog (`loadPreview(bookingId)` → cancellation-preview, `submitCancel(id, percent)` →
 * PATCH status CANCELLED with refundPercent): the admin picks the refund share, sees exactly what is
 * returned and kept, then slides to confirm. The server recomputes the amount from what was actually
 * paid, so the numbers here are a preview.
 */
export function CancelBookingSheet({ bookingId, open, onOpenChange, loadPreview, submitCancel, onCancelled }) {
  const reduce = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [percent, setPercent] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open || !bookingId) return undefined;
    let cancelled = false;
    setLoading(true);
    setPreview(null);
    setError(null);
    void loadPreview(bookingId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? "Could not load cancellation details");
        return;
      }
      setPreview(result.data);
      // Start on the standard policy so the default is the usual rule.
      setPercent(Number(result.data?.policy?.percent ?? 0));
    });
    return () => {
      cancelled = true;
    };
  }, [open, bookingId, loadPreview, attempt]);

  const held = money2(preview?.booking?.heldAmount);
  const refund = money2((held * percent) / 100);
  const retained = money2(held - refund);
  const options = preview?.options ?? [0, 25, 50, 75, 100];
  const canCancel = Boolean(preview?.canCancel);

  async function confirm() {
    const result = await submitCancel(bookingId, percent);
    if (!result.ok) {
      notify.error(result.error ?? "Could not cancel booking");
      throw new Error(result.error);
    }
    notify.success(refund > 0 ? `Cancelled · ${fmt(refund)} refunded` : "Booking cancelled", {
      description: refund > 0 ? (preview?.paidOnline ? "Back to the original payment method" : "Hand it back at the desk") : "No refund",
    });
    setTimeout(() => onOpenChange(false), 650);
    onCancelled?.();
  }

  const MethodIcon = preview?.paidOnline ? Smartphone : held > 0 ? Landmark : Wallet;
  const footer = canCancel ? (
    <div className="w-full">
      <SlideToConfirm
        key={`${bookingId}-${percent}`}
        tone="danger"
        label={refund > 0 ? `Slide to cancel · refund ${fmt(refund)}` : "Slide to cancel booking"}
        confirmedLabel="Cancelled"
        onConfirm={confirm}
        resetAfter={null}
      />
      <button type="button" onClick={() => onOpenChange(false)} className="mt-2 h-11 w-full rounded-control text-sm font-semibold text-ink-neutral hover:bg-muted">
        Keep booking
      </button>
    </div>
  ) : null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel booking"
      description={preview?.booking ? `${preview.booking.customer} · ${preview.booking.service} · ${dayTimeOf(preview.booking.startsAt)}` : "Choose how much goes back"}
      icon={CircleX}
      tone="destructive"
      size="md"
      footer={footer}
    >
      {loading ? <SkeletonText lines={5} className="py-2" /> : null}
      {error ? <ErrorState compact title="Couldn't load refund details" description={error} onRetry={() => setAttempt((n) => n + 1)} /> : null}
      {preview && !canCancel ? <p className="rounded-2xl bg-destructive/12 p-3 text-sm font-medium text-ink-destructive">{preview.reason ?? "This booking can't be cancelled."}</p> : null}

      {canCancel ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink-neutral">
              <MethodIcon className="size-4" aria-hidden /> Paid
            </span>
            <span className="font-display text-lg font-bold tabular-nums">{fmt(held)}</span>
          </div>

          <div>
            <p className="mb-2 flex items-center justify-between text-caption font-semibold text-ink-neutral">
              <span className="flex items-center gap-1.5">
                <Undo2 className="size-3.5" aria-hidden /> Refund
              </span>
              <span>Policy {preview.policy?.percent}%{preview.policy?.tierLabel ? ` · ${preview.policy.tierLabel}` : ""}</span>
            </p>
            <div role="radiogroup" aria-label="Refund share" className="grid grid-cols-5 gap-1.5">
              {options.map((value) => {
                const on = percent === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={held <= 0}
                    onClick={() => {
                      haptic("tap");
                      setPercent(value);
                    }}
                    className={cn(
                      "relative flex h-12 flex-col items-center justify-center rounded-xl text-sm font-bold ring-1 ring-inset transition-colors disabled:opacity-50",
                      on ? "text-portal-foreground ring-portal" : "bg-card ring-border hover:bg-muted"
                    )}
                  >
                    {on ? <motion.span layoutId="refund-pill" className="absolute inset-0 rounded-xl bg-portal" transition={reduce ? { duration: 0 } : spring.snappy} /> : null}
                    <span className="relative">{value}%</span>
                    {value === preview.policy?.percent ? <span className={cn("relative text-[9px] font-semibold uppercase", on ? "opacity-90" : "text-ink-neutral")}>policy</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-info/12 p-3 ring-1 ring-inset ring-info/25">
              <dt className="text-micro font-semibold uppercase text-ink-info">Returned</dt>
              <dd>
                <AnimatedCounter value={refund} format={fmt} className="font-display text-xl font-bold tabular-nums" />
              </dd>
            </div>
            <div className="rounded-2xl bg-muted/60 p-3 ring-1 ring-inset ring-border">
              <dt className="text-micro font-semibold uppercase text-ink-neutral">Kept</dt>
              <dd>
                <AnimatedCounter value={retained} format={fmt} className="font-display text-xl font-bold tabular-nums" />
              </dd>
            </div>
          </dl>
          <p className="text-caption text-ink-neutral">
            {held <= 0 ? "Nothing collected, nothing to refund." : refund <= 0 ? "No money goes back." : preview.paidOnline ? `Auto-refunded to ${preview.onlineMethod ? preview.onlineMethod.toUpperCase() : "the original method"}.` : "Paid at the desk: refund in person."}
          </p>
        </div>
      ) : null}
    </ResponsiveModal>
  );
}
