import { motion, useReducedMotion } from "motion/react";
import { Star } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { haptic, spring } from "@/components/motion/presets";

const SIZES = { sm: "size-4", md: "size-5", lg: "size-8" };

/**
 * Star rating. Read-only (supports halves) by default; pass onChange to make it an accessible radio
 * group (arrow keys, spring pop on pick). Gold is one of the few places gold is allowed in dark mode.
 * @param {{ value?: number, max?: number, onChange?: (n:number)=>void, size?: keyof SIZES, count?: number, showValue?: boolean, label?: string }} props
 */
export function Rating({ value = 0, max = 5, onChange, size = "md", count, showValue = false, label = "Rating", className }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(0);
  const name = useId();
  const interactive = typeof onChange === "function";
  const shown = hover || value;

  if (!interactive) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)} role="img" aria-label={`${label}: ${Number(value).toFixed(1)} out of ${max}`}>
        <span className="inline-flex">
          {Array.from({ length: max }, (_, i) => {
            const fill = Math.max(0, Math.min(1, value - i));
            return (
              <span key={i} className="relative">
                <Star className={cn(SIZES[size], "text-ink-warning/40")} strokeWidth={1.75} aria-hidden />
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <Star className={cn(SIZES[size], "fill-gold text-ink-warning")} strokeWidth={1.75} aria-hidden />
                </span>
              </span>
            );
          })}
        </span>
        {showValue ? <span className="text-caption font-semibold tabular-nums">{Number(value).toFixed(1)}</span> : null}
        {count != null ? <span className="text-caption text-ink-neutral">({count})</span> : null}
      </span>
    );
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex", className)} onPointerLeave={() => setHover(0)}>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const on = n <= shown;
        return (
          <label key={n} className="tap relative grid cursor-pointer place-items-center p-1" onPointerEnter={() => setHover(n)}>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => {
                haptic("tap");
                onChange(n);
              }}
              className="peer sr-only"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            />
            <motion.span
              className="rounded-md peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
              animate={on && !reduce ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              transition={spring.bouncy}
            >
              <Star className={cn(SIZES[size], on ? "fill-gold text-ink-warning" : "text-ink-neutral/50")} strokeWidth={1.75} aria-hidden />
            </motion.span>
          </label>
        );
      })}
    </div>
  );
}
