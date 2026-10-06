"use client";

import { cn } from "@/lib/utils";
import { computeStylistAvailability } from "@/receptionist/lib/booking-utils";
import { motion } from "motion/react";
import { Clock3, Scissors, User } from "lucide-react";
import { useMemo } from "react";
import { LoadingOrb } from "@/components/shared/loading-orb";

const statusStyles = {
  available: {
    dot: "bg-emerald-500",
    label: "Available",
    card: "border-emerald-500/20 bg-emerald-500/5",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  busy: {
    dot: "bg-primary animate-pulse",
    label: "In service",
    card: "border-primary/25 bg-primary/5",
    text: "text-primary",
  },
  upcoming: {
    dot: "bg-amber-500",
    label: "Up next",
    card: "border-amber-500/20 bg-amber-500/5",
    text: "text-amber-700 dark:text-amber-400",
  },
};

export function StylistAvailabilityStrip({ stylists = [], queue = [], loading }) {
  const availability = useMemo(
    () => computeStylistAvailability(stylists, queue),
    [stylists, queue]
  );

  if (loading && !availability.length) {
    return <LoadingOrb compact />;
  }

  if (!availability.length) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
        No active stylists on shift. Ask admin to activate staff profiles.
      </div>
    );
  }

  const availableCount = availability.filter((s) => s.status === "available").length;
  const busyCount = availability.filter((s) => s.status === "busy").length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl font-bold">Stylist floor</h2>
          <p className="text-sm text-muted-foreground">
            {availableCount} available · {busyCount} in service
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
        {availability.map((stylist, index) => {
          const style = statusStyles[stylist.status] ?? statusStyles.available;
          return (
            <motion.div
              key={stylist.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={cn(
                "min-w-[11rem] shrink-0 snap-start rounded-xl border p-3 shadow-sm",
                style.card
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", style.dot)} aria-hidden />
                <p className="truncate font-semibold text-foreground">{stylist.name}</p>
              </div>
              <p className={cn("mt-1 text-xs font-medium", style.text)}>{style.label}</p>
              {stylist.status === "busy" && stylist.currentCustomer ? (
                <p className="mt-2 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <User className="size-3 shrink-0" />
                  {stylist.currentCustomer}
                </p>
              ) : null}
              {stylist.status === "busy" && stylist.currentService ? (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Scissors className="size-3 shrink-0" />
                  {stylist.currentService}
                </p>
              ) : null}
              {stylist.status === "upcoming" ? (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="size-3 shrink-0" />
                  {stylist.upcomingCount} upcoming
                </p>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
