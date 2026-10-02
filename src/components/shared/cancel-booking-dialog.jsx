"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBookingDateTime, formatCurrency } from "@/receptionist/lib/booking-utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LoadingOrb } from "@/components/shared/loading-orb";

const money = (value) => Math.round(Number(value ?? 0) * 100) / 100;

/**
 * Staff cancellation (reception and admin share this dialog and the same backend code). Staff pick what
 * percentage goes back to the customer; the dialog shows the exact amount returned and kept for each
 * choice. The server re-computes the amount from what was actually paid, so this display is a preview,
 * not the source of truth.
 *
 * @param {{
 *   bookingId: string | null,
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   loadPreview: (bookingId: string) => Promise<{ ok: boolean, data?: any, error?: string }>,
 *   submitCancel: (bookingId: string, refundPercent: number) => Promise<{ ok: boolean, error?: string }>,
 *   onCancelled?: () => void,
 * }} props
 */
export function CancelBookingDialog({ bookingId, open, onOpenChange, loadPreview, submitCancel, onCancelled }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [percent, setPercent] = useState("0");

  useEffect(() => {
    if (!open || !bookingId) return;
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
      const data = result.data;
      setPreview(data);
      // Start on what the standard policy would give, so the default is the usual rule.
      setPercent(`${data?.policy?.percent ?? 0}`);
    });
    return () => {
      cancelled = true;
    };
  }, [open, bookingId, loadPreview]);

  const held = money(preview?.booking?.heldAmount);
  const refund = money((held * Number(percent)) / 100);
  const retained = money(held - refund);
  const options = preview?.options ?? [0, 25, 50, 75, 100];

  async function confirm() {
    setSubmitting(true);
    const result = await submitCancel(bookingId, Number(percent));
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not cancel booking");
      return;
    }
    toast.success(
      refund > 0
        ? `Booking cancelled — ${formatCurrency(refund)} (${percent}%) refunded${preview?.paidOnline ? " to the customer's original payment method" : ""}`
        : "Booking cancelled — no refund"
    );
    onOpenChange(false);
    onCancelled?.();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel booking</DialogTitle>
          <DialogDescription>
            {preview?.booking
              ? `${preview.booking.customer} — ${preview.booking.service}, ${formatBookingDateTime(preview.booking.startsAt)}`
              : "Choose how much to return to the customer."}
          </DialogDescription>
        </DialogHeader>

        {loading ? <LoadingOrb compact /> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {preview && preview.canCancel === false ? <p className="text-sm text-destructive">{preview.reason}</p> : null}

        {preview?.canCancel ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Paid by customer</span>
              <span className="font-semibold">{formatCurrency(held)}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-percent">Refund to customer</Label>
              <Select value={percent} onValueChange={setPercent} disabled={held <= 0}>
                <SelectTrigger id="refund-percent" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((value) => (
                    <SelectItem key={value} value={`${value}`}>
                      {value}% — {formatCurrency(money((held * value) / 100))}
                      {value === preview.policy?.percent ? "  (standard policy)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Standard policy for this timing: {preview.policy?.percent}% ({preview.policy?.tierLabel}).
              </p>
            </div>

            <div className="space-y-1.5 rounded-lg border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Returned to customer</span>
                <span className="font-semibold text-primary">{formatCurrency(refund)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kept by salon</span>
                <span className="font-medium">{formatCurrency(retained)}</span>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                {held <= 0
                  ? "Nothing has been collected for this booking, so there is nothing to refund."
                  : refund <= 0
                    ? "No money will be returned."
                    : preview.paidOnline
                      ? `Paid online${preview.onlineMethod ? ` (${preview.onlineMethod.toUpperCase()})` : ""}: the refund is sent back automatically to the customer's original payment method.`
                      : "Paid at the desk: hand the refund back to the customer in cash/at the counter."}
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
            Keep booking
          </Button>
          <Button variant="destructive" disabled={!preview?.canCancel || submitting} onClick={() => void confirm()}>
            {submitting ? "Cancelling..." : refund > 0 ? `Cancel & refund ${formatCurrency(refund)}` : "Cancel booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
