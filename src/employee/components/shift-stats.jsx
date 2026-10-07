"use client";

import { StatCard } from "@/components/kit";
import { Stagger, StaggerItem } from "@/components/motion";
import { formatDuration, formatMoney } from "@/lib/format";
import { CalendarCheck, Clock4, Hourglass, IndianRupee, Scissors } from "lucide-react";

/**
 * Shift numbers, all derived from the bookings assigned to this stylist (`/api/staff/queue`).
 * There is no earnings/commission endpoint for staff, so "Booked value" is the sum of the
 * assigned bookings' payable amounts, not take-home pay.
 */
export function ShiftStats({ metrics, trend, loading }) {
  const items = [
    { icon: CalendarCheck, label: "Assigned", value: metrics.totalAssigned, tone: "primary", trend },
    { icon: Hourglass, label: "Waiting", value: metrics.waiting, tone: "warning" },
    { icon: Scissors, label: "In service", value: metrics.inService, tone: "info" },
    { icon: IndianRupee, label: "Value", value: metrics.queueValue, tone: "success", format: (n) => formatMoney(n) },
    { icon: Clock4, label: "Time", value: metrics.bookedMinutes, tone: "plum", format: (n) => formatDuration(n) },
  ];
  return (
    <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {items.map((item, i) => (
        <StaggerItem key={item.label} className={i === 0 ? "col-span-2 md:col-span-1" : undefined}>
          <StatCard icon={item.icon} label={item.label} value={item.value} format={item.format} tone={item.tone} trend={item.trend} loading={loading} className="h-full" />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
