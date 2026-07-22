"use client";

import { cn } from "@/lib/utils";
import { getBookingStatusConfig } from "@/receptionist/lib/booking-utils";

const toneClasses = {
  primary: "bg-primary/15 text-primary border-primary/20",
  blue: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  muted: "bg-muted text-muted-foreground border-border",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
};

export function BookingStatusBadge({ status, className }) {
  const config = getBookingStatusConfig(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        toneClasses[config.tone] ?? toneClasses.muted,
        className
      )}
    >
      {config.label}
    </span>
  );
}
