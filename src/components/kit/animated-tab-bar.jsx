import { motion, useReducedMotion } from "motion/react";
import { useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { haptic, spring } from "@/components/motion/presets";

/**
 * Segmented tabs with a morphing active pill (the fixed tab-bar preset, contract item g).
 * variant "pill" (default) | "underline" | "glass". Roving focus with arrow keys, Home/End.
 * Use it as a tablist for in-page tabs; PortalShell has its own nav bars built on the same motion.
 * @param {{ items: {value:string,label:string,icon?:any,badge?:number}[], value: string, onChange: (v:string)=>void,
 *   variant?: "pill"|"underline"|"glass", size?: "sm"|"md", fullWidth?: boolean, label?: string, className?: string }} props
 */
export function AnimatedTabBar({ items, value, onChange, variant = "pill", size = "md", fullWidth = false, label = "Tabs", className }) {
  const reduce = useReducedMotion();
  const id = useId();
  const refs = useRef([]);
  const idx = Math.max(0, items.findIndex((it) => it.value === value));
  const focusTo = (i) => {
    const n = (i + items.length) % items.length;
    refs.current[n]?.focus();
    onChange(items[n].value);
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "no-scrollbar relative inline-flex max-w-full overflow-x-auto",
        variant === "underline" ? "gap-1 border-b border-border" : "gap-1 rounded-full p-1",
        variant === "pill" && "bg-muted",
        variant === "glass" && "glass-surface",
        fullWidth && "flex w-full",
        className
      )}
    >
      {items.map((it, i) => {
        const active = it.value === value;
        const Icon = it.icon;
        return (
          <button
            key={it.value}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={i === idx ? 0 : -1}
            onClick={() => {
              if (!active) haptic("tap");
              onChange(it.value);
            }}
            onKeyDown={(e) => {
              const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: items.length - 1 };
              if (e.key in map) {
                e.preventDefault();
                focusTo(map[e.key]);
              }
            }}
            className={cn(
              "relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-colors duration-200",
              size === "sm" ? "h-8 px-3 text-caption" : "h-10 px-4 text-sm",
              variant === "underline" ? "rounded-t-xl pb-1" : "rounded-full",
              fullWidth && "flex-1",
              active ? (variant === "underline" ? "text-portal" : "text-foreground") : "text-ink-neutral hover:text-foreground"
            )}
          >
            {active ? (
              <motion.span
                layoutId={`${id}-active`}
                aria-hidden
                transition={reduce ? { duration: 0 } : spring.snappy}
                className={cn("absolute", variant === "underline" ? "inset-x-2 -bottom-px h-[3px] rounded-full bg-portal" : "inset-0 rounded-full bg-card shadow-soft")}
              />
            ) : null}
            {Icon ? <Icon className={cn("relative", size === "sm" ? "size-3.5" : "size-4")} aria-hidden /> : null}
            <span className="relative">{it.label}</span>
            {it.badge ? <span className="relative grid min-w-5 place-items-center rounded-full bg-portal px-1.5 text-[10px] font-bold leading-5 text-portal-foreground">{it.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
