"use client";

import { Avatar, ButtonLoadingMorph, EmptyState, FloatingLabelInput, ResponsiveModal, SlideToConfirm, useAsyncAction } from "@/components/kit";
import { SuccessBurst } from "@/components/motion";
import { spring } from "@/components/motion/presets";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { amountDue, formatBookingTime, formatCurrency } from "@/receptionist/lib/booking-utils";
import { downloadReceptionInvoice } from "@/receptionist/lib/reception-invoice";
import { recordReceptionPaymentAsync } from "@/store/reception-bookings-slice";
import { Banknote, CreditCard, Download, IndianRupee, Smartphone } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useId, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

export const PAYMENT_MODES = [
  { value: "OFFLINE_CASH", label: "Cash", icon: Banknote },
  { value: "OFFLINE_UPI", label: "UPI", icon: Smartphone },
];

/** Cash / UPI segmented control with a morphing pill. Shared by the payment sheet and walk-in wizard. */
export function PaymentModePicker({ value, onChange, className }) {
  const id = useId();
  return (
    <LayoutGroup id={id}>
      <div role="radiogroup" aria-label="Payment method" className={cn("grid grid-cols-2 gap-1 rounded-full bg-muted p-1", className)}>
        {PAYMENT_MODES.map((mode) => {
          const active = value === mode.value;
          const Icon = mode.icon;
          return (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(mode.value)}
              className={cn("relative inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold", active ? "text-foreground" : "text-ink-neutral")}
            >
              {active ? <motion.span layoutId={`${id}-pill`} transition={spring.snappy} className="absolute inset-0 rounded-full bg-card shadow-soft ring-1 ring-portal/25" /> : null}
              <Icon className={cn("relative size-4", active && "text-portal")} aria-hidden />
              <span className="relative">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

/**
 * Collect cash/UPI at the desk for a booking that still owes money. Validation and the auto invoice
 * download are the same as the old panel; the confirm is a gold slide-to-collect (contract item c).
 */
export function PaymentSheet({ open, onOpenChange, initialBookingId }) {
  const dispatch = useDispatch();
  const queue = useSelector((state) => state.receptionBookings.queue);
  const payableBookings = useMemo(
    () => queue.filter((b) => ["PENDING", "CONFIRMED", "STARTED"].includes(b.status) && amountDue(b) > 0),
    [queue]
  );
  const [bookingId, setBookingId] = useState("");
  const [paymentMode, setPaymentMode] = useState("OFFLINE_CASH");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState(null); // { bookingId, amount, customer }
  const invoice = useAsyncAction({ successMs: 1200 });

  useEffect(() => {
    if (!open) return;
    setPaid(null);
    const initial = payableBookings.find((b) => b.id === initialBookingId) ?? (payableBookings.length === 1 ? payableBookings[0] : null);
    setBookingId(initial?.id ?? "");
    setAmount(initial ? String(amountDue(initial)) : "");
    // Only when the sheet opens: a live update must not wipe what the receptionist typed.
  }, [open, initialBookingId]);

  const selected = payableBookings.find((b) => b.id === bookingId) ?? null;
  const due = selected ? amountDue(selected) : 0;
  const parsed = Number(amount);
  const amountError =
    amount === "" ? undefined : !Number.isFinite(parsed) || parsed <= 0 ? "Enter a valid amount" : parsed > due + 0.01 ? `Max ${formatCurrency(due)}` : undefined;
  const ready = Boolean(selected) && amount !== "" && !amountError;

  function pick(booking) {
    setBookingId(booking.id);
    setAmount(String(amountDue(booking) || ""));
  }

  async function downloadInvoice(id, { quiet = false } = {}) {
    try {
      await downloadReceptionInvoice(id);
      if (!quiet) notify.success("Invoice downloaded");
      return true;
    } catch (error) {
      if (!quiet) notify.error(error.message ?? "Could not download invoice");
      if (!quiet) throw error;
      return false;
    }
  }

  async function collect() {
    const result = await dispatch(
      recordReceptionPaymentAsync({ sourceType: "BOOKING", bookingId: selected.id, amount: parsed, paymentMode })
    );
    if (recordReceptionPaymentAsync.rejected.match(result)) {
      notify.error(result.payload ?? "Could not record payment");
      throw new Error("payment failed");
    }
    const record = { bookingId: selected.id, amount: parsed, customer: selected.customer };
    notify.success("Payment recorded", { description: `${formatCurrency(parsed)} · ${selected.customer ?? ""}` });
    setTimeout(() => setPaid(record), 500);
    const downloaded = await downloadInvoice(record.bookingId, { quiet: true });
    if (!downloaded) {
      notify.error("Payment saved. Invoice didn't download.", {
        action: { label: "Download", onClick: () => void downloadInvoice(record.bookingId).catch(() => {}) },
      });
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={paid ? "Payment collected" : "Collect payment"}
      icon={CreditCard}
      tone="primary"
      size="md"
      footer={
        paid ? (
          <div className="grid w-full grid-cols-2 gap-2">
            <ButtonLoadingMorph variant="outline" icon={Download} state={invoice.state} onClick={() => invoice.run(() => downloadInvoice(paid.bookingId))} successLabel="Saved">
              Invoice
            </ButtonLoadingMorph>
            <ButtonLoadingMorph onClick={() => onOpenChange(false)}>Done</ButtonLoadingMorph>
          </div>
        ) : payableBookings.length ? (
          <SlideToConfirm
            key={bookingId || "none"}
            tone="gold"
            label={ready ? `Slide to collect ${formatCurrency(parsed)}` : "Pick booking & amount"}
            confirmedLabel="Collected"
            disabled={!ready}
            onConfirm={collect}
            resetAfter={null}
          />
        ) : null
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {paid ? (
          <motion.div key="paid" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring.soft} className="flex flex-col items-center gap-3 py-6 text-center">
            <SuccessBurst size={88} label="Payment collected" />
            <p className="font-display text-display-lg font-bold tabular-nums">{formatCurrency(paid.amount)}</p>
            <p className="text-sm text-ink-neutral">{paid.customer}</p>
          </motion.div>
        ) : !payableBookings.length ? (
          <motion.div key="empty" exit={{ opacity: 0 }}>
            <EmptyState compact illustration="bag" title="Nothing due" description="Bookings are paid in full when created." />
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }} className="space-y-4">
            <div role="radiogroup" aria-label="Booking" className="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-0.5">
              {payableBookings.map((b) => {
                const active = b.id === bookingId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pick(b)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-inset transition-colors",
                      active ? "bg-portal/10 ring-portal/40" : "bg-card ring-border/60 hover:bg-muted"
                    )}
                  >
                    <Avatar name={b.customer} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{b.customer}</span>
                      <span className="block truncate text-caption text-ink-neutral">
                        {formatBookingTime(b.startsAt)} · {b.service}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-display font-bold tabular-nums">{formatCurrency(amountDue(b))}</span>
                      {Number(b.paidAmount ?? 0) > 0 ? <span className="block text-micro text-ink-neutral">of {formatCurrency(b.payableAmount)}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <FloatingLabelInput
              label="Amount"
              icon={IndianRupee}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={amountError}
              disabled={!selected}
            />
            <PaymentModePicker value={paymentMode} onChange={setPaymentMode} />
          </motion.div>
        )}
      </AnimatePresence>
    </ResponsiveModal>
  );
}
