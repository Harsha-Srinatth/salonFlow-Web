"use client";
import { motion, useReducedMotion } from "motion/react";
import { haptic, spring } from "@/components/motion";
import { cn } from "@/lib/utils";

/** On/off switch with a springy thumb; 44px hit area via `tap`. `label` is required (aria-label). */
export function Switch({ checked, onChange, label, disabled, className }) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic("tap");
        onChange(!checked);
      }}
      className={cn(
        "tap relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 ring-1 ring-inset transition-colors disabled:opacity-50",
        checked ? "bg-portal ring-portal" : "bg-muted ring-border",
        className
      )}
    >
      <motion.span
        aria-hidden
        className="size-6 rounded-full bg-card shadow-soft"
        animate={{ x: checked ? 20 : 0 }}
        transition={reduce ? { duration: 0 } : spring.snappy}
      />
    </button>
  );
}
