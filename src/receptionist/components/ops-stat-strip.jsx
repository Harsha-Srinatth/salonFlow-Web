"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/receptionist/lib/booking-utils";
import { motion } from "motion/react";

const toneStyles = {
  primary: "from-primary/10 to-primary/5 border-primary/20",
  secondary: "from-secondary/30 to-secondary/10 border-border",
  accent: "from-accent/20 to-accent/5 border-accent/20",
  warning: "from-amber-500/15 to-amber-500/5 border-amber-500/25",
};

export function OpsStatStrip({ metrics }) {
  const items = [
    { label: "Today's bookings", value: metrics.todayTotal, tone: "primary" },
    { label: "Waiting", value: metrics.waiting, tone: "secondary" },
    { label: "In service", value: metrics.inService, tone: "accent" },
    { label: "Today's revenue", value: formatCurrency(metrics.todayRevenue), tone: "primary" },
    ...(metrics.delayed > 0
      ? [{ label: "Delayed", value: metrics.delayed, tone: "warning" }]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.04 }}
          className={cn(
            "rounded-2xl border bg-gradient-to-br p-4 shadow-sm",
            toneStyles[item.tone] ?? toneStyles.secondary
          )}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{item.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
