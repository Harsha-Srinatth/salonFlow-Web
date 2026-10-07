"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { haptic, interaction, spring } from "@/components/motion";
import { cn } from "@/lib/utils";

/** Multi-select chip (allowed services, categories): springs on press and pops a check in when on. */
export function ToggleChip({ selected, children, className, size = "default", disabled, onClick, ...props }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={Boolean(selected)}
      disabled={disabled}
      whileTap={disabled || reduce ? undefined : interaction.press}
      transition={spring.snappy}
      onClick={(event) => {
        haptic("tap");
        onClick?.(event);
      }}
      className={cn(
        "tap inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-caption" : "h-10 px-4 text-sm",
        selected ? "bg-portal text-portal-foreground ring-portal shadow-soft" : "bg-card text-foreground ring-border hover:bg-muted",
        className
      )}
      {...props}
    >
      <AnimatePresence initial={false}>
        {selected ? (
          <motion.span key="c" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.4 }} transition={spring.bouncy} className="inline-flex">
            <Check className="size-3.5" aria-hidden strokeWidth={3} />
          </motion.span>
        ) : null}
      </AnimatePresence>
      {children}
    </motion.button>
  );
}
