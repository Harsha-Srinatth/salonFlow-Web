"use client";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** On/off or multi-select chip: springs on press and pops a check in when selected. */
export function ToggleChip({ selected, children, className, size = "default", disabled, ...props }) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={Boolean(selected)}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      layout
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm",
        selected ? "border-primary bg-primary text-primary-foreground shadow-xs" : "border-input bg-background hover:bg-muted",
        className
      )}
      {...props}
    >
      <AnimatePresence initial={false}>
        {selected ? (
          <motion.span key="c" initial={{ width: 0, opacity: 0, scale: 0.4 }} animate={{ width: "auto", opacity: 1, scale: 1 }} exit={{ width: 0, opacity: 0, scale: 0.4 }} className="inline-flex overflow-hidden">
            <Check className="size-3.5" />
          </motion.span>
        ) : null}
      </AnimatePresence>
      {children}
    </motion.button>
  );
}
