"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/receptionist/lib/booking-utils";
import { downloadReceptionInvoice } from "@/receptionist/lib/reception-invoice";
import { recordReceptionPaymentAsync } from "@/store/reception-bookings-slice";
import { CreditCard, Download, IndianRupee } from "lucide-react";
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "@/lib/notify";

// Bookings are already paid in full at creation (both online self-service and
// reception walk-in flows collect `payableAmount` immediately). Without this,
// every fresh booking would show up here as "payable" again and risk a second,
// duplicate payment being recorded against it.
function amountDue(booking) {
  const payable = Number(booking?.payableAmount ?? 0);
  const paid = Number(booking?.paidAmount ?? 0);
  return Math.max(0, Math.round((payable - paid) * 100) / 100);
}

export function PaymentPanel() {
  const dispatch = useDispatch();
  const { queue, paymentMutating } = useSelector((state) => state.receptionBookings);
  const payableBookings = useMemo(
    () => queue.filter((b) => ["PENDING", "CONFIRMED", "STARTED"].includes(b.status) && amountDue(b) > 0),
    [queue]
  );

  const [bookingId, setBookingId] = useState("");
  const [paymentMode, setPaymentMode] = useState("OFFLINE_CASH");
  const [amount, setAmount] = useState("");
  const [invoiceBookingId, setInvoiceBookingId] = useState("");
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const selectedBooking = payableBookings.find((b) => b.id === bookingId) ?? null;
  const selectedBookingDue = selectedBooking ? amountDue(selectedBooking) : 0;
  const invoiceTargetId = invoiceBookingId || bookingId;

  function onSelectBooking(value) {
    setBookingId(value);
    setInvoiceBookingId("");
    const booking = payableBookings.find((b) => b.id === value);
    if (booking) setAmount(String(amountDue(booking) || ""));
  }

  async function handleDownloadInvoice(targetId, { quiet = false } = {}) {
    const id = `${targetId ?? ""}`.trim();
    if (!id) return false;
    setDownloadingInvoice(true);
    try {
      await downloadReceptionInvoice(id);
      if (!quiet) toast.success("Invoice downloaded");
      return true;
    } catch (error) {
      toast.error(error.message ?? "Could not download invoice");
      return false;
    } finally {
      setDownloadingInvoice(false);
    }
  }

  async function submitPayment() {
    if (!bookingId) {
      toast.error("Select a booking to collect payment");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (parsedAmount > selectedBookingDue + 0.01) {
      toast.error(`Amount exceeds the remaining balance due (${formatCurrency(selectedBookingDue)})`);
      return;
    }
    const paidBookingId = bookingId;
    const result = await dispatch(
      recordReceptionPaymentAsync({
        sourceType: "BOOKING",
        bookingId: paidBookingId,
        amount: parsedAmount,
        paymentMode,
      })
    );
    if (recordReceptionPaymentAsync.rejected.match(result)) {
      toast.error(result.payload ?? "Could not record payment");
      return;
    }
    setInvoiceBookingId(paidBookingId);
    toast.success("Payment recorded");
    const downloaded = await handleDownloadInvoice(paidBookingId, { quiet: true });
    if (!downloaded) {
      toast.error("Payment saved. Tap Invoice to download.", {
        action: {
          label: "Download",
          onClick: () => void handleDownloadInvoice(paidBookingId),
        },
      });
    }
    setBookingId("");
    setAmount("");
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CreditCard className="size-4" />
        </div>
        <div>
          <h2 className="font-semibold">Collect payment</h2>
          <p className="text-xs text-muted-foreground">Record cash or UPI at the desk</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="payment-booking">Booking</Label>
          <Select value={bookingId || undefined} onValueChange={onSelectBooking}>
            <SelectTrigger id="payment-booking" className="w-full">
              <SelectValue placeholder="Select active booking" />
            </SelectTrigger>
            <SelectContent>
              {payableBookings.map((booking) => (
                <SelectItem key={booking.id} value={booking.id}>
                  {booking.customer} · {formatCurrency(amountDue(booking))} due
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!payableBookings.length ? (
            <p className="text-xs text-muted-foreground">
              Nothing outstanding — active bookings are paid in full when created.
            </p>
          ) : null}
        </div>

        {selectedBooking ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            <p className="font-medium">{selectedBooking.customer}</p>
            <p className="text-muted-foreground">{selectedBooking.service}</p>
            <p className="mt-1 font-semibold">Due: {formatCurrency(selectedBookingDue)}</p>
            {Number(selectedBooking.paidAmount ?? 0) > 0 ? (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(selectedBooking.paidAmount)} already collected of {formatCurrency(selectedBooking.payableAmount)}
              </p>
            ) : null}
          </div>
        ) : null}

        {invoiceBookingId && !bookingId ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">Last payment recorded</p>
            <p className="text-xs text-muted-foreground">Invoice available for download</p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount (Rs)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="payment-amount"
                type="number"
                min="0"
                max={selectedBooking ? selectedBookingDue : undefined}
                step="0.01"
                className="pl-9"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-mode">Method</Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger id="payment-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OFFLINE_CASH">Cash</SelectItem>
                <SelectItem value="OFFLINE_UPI">UPI transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="flex-1"
            disabled={paymentMutating || !bookingId}
            onClick={() => void submitPayment()}
          >
            {paymentMutating ? "Recording…" : "Record payment"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 sm:flex-1"
            disabled={!invoiceTargetId || downloadingInvoice}
            onClick={() => void handleDownloadInvoice(invoiceTargetId)}
          >
            <Download className="size-4" />
            {downloadingInvoice ? "Downloading…" : "Invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}
