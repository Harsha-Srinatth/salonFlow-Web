"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookingStatusBadge } from "@/receptionist/components/booking-status-badge";
import {
  formatBookingDateTime,
  formatCurrency,
  groupQueueByStatus,
} from "@/receptionist/lib/booking-utils";
import { CancelBookingDialog } from "@/components/shared/cancel-booking-dialog";
import {
  fetchReceptionCancellationPreviewAsync,
  updateReceptionBookingAsync,
} from "@/store/reception-bookings-slice";
import { useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Phone, Scissors, User, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { LoadingOrb } from "@/components/shared/loading-orb";

function BookingRow({ booking, isDelayed, updating, onCancel }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        isDelayed && "border-destructive/50 bg-destructive/5"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{booking.customer}</p>
            <BookingStatusBadge status={booking.status} />
            {isDelayed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                <AlertTriangle className="size-3" />
                Delayed
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
            <span className="inline-flex items-center gap-1">
              <User className="size-3.5" />
              {booking.stylistName ?? "Unassigned"}
            </span>
            {booking.customerPhone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" />
                {booking.customerPhone}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <p className="text-sm font-semibold">{formatCurrency(booking.payableAmount)}</p>
          <div className="flex flex-wrap gap-2">
            {booking.status === "STARTED" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <CheckCircle2 className="size-3.5" />
                Stylist completes from their portal
              </span>
            ) : null}
            {["PENDING", "CONFIRMED"].includes(booking.status) ? (
              <Button
                size="sm"
                variant="outline"
                disabled={updating}
                onClick={() => void onCancel(booking.id)}
                className="gap-1.5"
              >
                <XCircle className="size-4" />
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QueueSection({ title, emptyLabel, bookings, isCriticalDelay, updatingBookingId, onCancel }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums">{bookings.length}</span>
      </div>
      {bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {bookings.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                isDelayed={isCriticalDelay(booking)}
                updating={updatingBookingId === booking.id}
                onCancel={onCancel}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </section>
  );
}

export function LiveOpsBoard({ isCriticalDelay }) {
  const { queue, queueLoading, updatingBookingId } = useSelector((state) => state.receptionBookings);
  const { upcoming, inService } = groupQueueByStatus(queue);

  const dispatch = useDispatch();
  const [cancelTargetId, setCancelTargetId] = useState(null);

  const loadPreview = useCallback(
    async (bookingId) => {
      const result = await dispatch(fetchReceptionCancellationPreviewAsync(bookingId));
      return fetchReceptionCancellationPreviewAsync.rejected.match(result)
        ? { ok: false, error: result.payload }
        : { ok: true, data: result.payload };
    },
    [dispatch]
  );
  const submitCancel = useCallback(
    async (bookingId, refundPercent) => {
      const result = await dispatch(updateReceptionBookingAsync({ bookingId, action: "cancel", refundPercent }));
      return updateReceptionBookingAsync.rejected.match(result) ? { ok: false, error: result.payload } : { ok: true };
    },
    [dispatch]
  );

  function handleCancel(bookingId) {
    setCancelTargetId(bookingId);
  }

  if (queueLoading && !queue.length) {
    return <LoadingOrb compact />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <QueueSection
        title="Up next"
        emptyLabel="No customers waiting. Walk-ins and online bookings will appear here."
        bookings={upcoming}
        isCriticalDelay={isCriticalDelay}
        updatingBookingId={updatingBookingId}
        onCancel={handleCancel}
      />
      <QueueSection
        title="In service"
        emptyLabel="No active services. Stylists start appointments from their portal."
        bookings={inService}
        isCriticalDelay={isCriticalDelay}
        updatingBookingId={updatingBookingId}
        onCancel={handleCancel}
      />
      <CancelBookingDialog
        bookingId={cancelTargetId}
        open={Boolean(cancelTargetId)}
        onOpenChange={(open) => !open && setCancelTargetId(null)}
        loadPreview={loadPreview}
        submitCancel={submitCancel}
      />
    </div>
  );
}
