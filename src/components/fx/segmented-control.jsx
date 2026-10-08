"use client";
import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Segmented control whose single thumb slides between segments (shared layoutId). Ported from
 * atom-v3's SegmentedControl, restyled for Sahasra's tokens. options: [{ value, label, icon? }]
 */
export function SegmentedControl({ options, value, onChange, fluid = false, className, label }) {
  const thumb = `seg-${useId()}`;
  return (
    <div role="group" aria-label={label} className={cn("relative inline-flex items-center gap-1 rounded-xl border border-border bg-muted/60 p-1", fluid && "flex w-full", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn("relative inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors", fluid && "flex-1", active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {active ? <motion.span layoutId={thumb} aria-hidden className="absolute inset-0 rounded-lg bg-primary shadow-sm" transition={{ type: "spring", stiffness: 380, damping: 32 }} /> : null}
            {Icon ? <Icon className="relative z-[1] size-3.5 shrink-0" /> : null}
            <span className="relative z-[1] truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
