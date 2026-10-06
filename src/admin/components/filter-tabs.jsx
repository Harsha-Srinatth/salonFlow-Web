"use client";
import { LayoutGroup, motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Pill tabs with a sliding highlight. `options` = [{ value, label, count? }] or plain strings.
 * variant "soft" is the quieter style for secondary filters.
 */
export function FilterTabs({ options, value, onChange, label, variant = "solid", className }) {
  const id = useId();
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <LayoutGroup id={id}>
      <div className={cn("flex flex-wrap gap-1.5", className)} role="tablist" aria-label={label}>
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.value)}
              className={cn("relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors", active ? (variant === "solid" ? "text-primary-foreground" : "text-foreground") : "text-muted-foreground hover:bg-muted hover:text-foreground")}
            >
              {active ? <motion.span layoutId="pill" className={cn("absolute inset-0 rounded-full", variant === "solid" ? "bg-primary" : "bg-secondary")} transition={{ type: "spring", stiffness: 500, damping: 36 }} /> : null}
              <span className="relative">
                {item.label}
                {item.count != null ? <span className="ml-1 opacity-70">{item.count}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
