import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { haptic, spring } from "@/components/motion/presets";

/** Switch row for wallet credit / vouchers, with the amount it saves sliding in when on. */
export function ToggleRow({ icon: Icon, title, hint, checked, onChange, amount, tone = "portal", className }) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        haptic("tap");
        onChange(!checked);
      }}
      className={cn("flex w-full items-center gap-3 rounded-card bg-card p-4 text-left shadow-soft ring-1 ring-inset transition-shadow", checked ? "ring-portal/40" : "ring-border/60", className)}
    >
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", tone === "gold" ? "bg-gold/16 text-ink-warning" : "bg-portal/12 text-portal")}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-caption text-ink-neutral">{hint}</span>
      </span>
      {checked && amount > 0 ? (
        <motion.span key={amount} initial={reduce ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={spring.snappy} className="text-sm font-bold text-ink-success tabular-nums">
          −{formatMoney(amount)}
        </motion.span>
      ) : null}
      <span className={cn("relative flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors", checked ? "bg-portal" : "bg-muted-foreground/30")}>
        <motion.span layout={!reduce} transition={spring.snappy} className={cn("size-6 rounded-full bg-white shadow-soft", checked ? "ml-auto" : "")} />
      </span>
    </button>
  );
}
