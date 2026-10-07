import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { spring } from "@/components/motion/presets";
import { AnimatedCounter } from "@/components/motion/animated-counter";

const money = (n) => formatMoney(n);

/**
 * Price breakdown whose lines slide in/out as discounts toggle and whose total counts to its new
 * value. Purely presentational: the caller computes every amount.
 * @param {{ lines: { id: string, label: string, amount: number, icon?: any, tone?: "default"|"saving" }[],
 *   total: number, totalLabel?: string, className?: string }} props
 */
export function UserPriceBreakdown({ lines, total, totalLabel = "Total", className }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("rounded-card bg-card p-5 ring-1 ring-inset ring-border/60", className)}>
      <ul className="space-y-2.5">
        <AnimatePresence initial={false} mode="popLayout">
          {lines.map((line) => {
            const Icon = line.icon;
            const saving = line.tone === "saving";
            return (
              <motion.li
                key={line.id}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: 12 }}
                transition={spring.soft}
                className={cn("flex items-center justify-between gap-3 overflow-hidden text-sm", saving ? "text-ink-success" : "")}
              >
                <span className={cn("flex min-w-0 items-center gap-2", !saving && "text-ink-neutral")}>
                  {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
                  <span className="truncate">{line.label}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{saving ? `−${money(line.amount)}` : money(line.amount)}</span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      <motion.div layout={!reduce} transition={spring.soft} className="mt-4 flex items-end justify-between border-t border-dashed border-border pt-4">
        <span className="text-sm font-semibold">{totalLabel}</span>
        <AnimatedCounter value={total} format={money} duration={0.7} className="font-display text-title font-bold text-portal" />
      </motion.div>
    </div>
  );
}
