"use client";

import { BookingStatusBadge } from "@/receptionist/components/booking-status-badge";
import {
  formatBookingDateTime,
  formatCurrency,
} from "@/receptionist/lib/booking-utils";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export function ScheduleBoard({ bookings = [], isCriticalDelay, loading }) {
  if (loading && !bookings.length) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center">
        <p className="font-medium text-foreground">No bookings scheduled</p>
        <p className="mt-1 text-sm text-muted-foreground">Create a walk-in booking to fill the schedule.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute bottom-4 left-[11px] top-4 hidden w-px bg-border md:block" aria-hidden />
      {bookings.map((booking, index) => {
        const delayed = isCriticalDelay?.(booking);
        return (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            className="relative flex gap-4 pb-4"
          >
            <div className="hidden md:flex md:w-6 md:justify-center">
              <span
                className={cn(
                  "relative z-10 mt-2 size-3 rounded-full border-2 bg-card",
                  delayed ? "border-destructive" : "border-primary"
                )}
              />
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 rounded-xl border bg-card p-4 shadow-sm",
                delayed && "border-destructive/40 bg-destructive/5"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{booking.customer}</p>
                    <BookingStatusBadge status={booking.status} />
                    {delayed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                        <AlertTriangle className="size-3" />
                        Delayed
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{booking.service}</p>
                </div>
                <p className="text-sm font-semibold">{formatCurrency(booking.payableAmount)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{formatBookingDateTime(booking.startsAt)}</span>
                <span>{booking.stylistName ?? "Unassigned"}</span>
                {booking.customerPhone ? <span>{booking.customerPhone}</span> : null}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
