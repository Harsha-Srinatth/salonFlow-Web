import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "./presets";

const RAYS = 8;

/**
 * Animated success mark: ring pops, check draws, eight sparks burst outward. Pure SVG + motion.
 * Re-key it (key={n}) to replay. `tone` is any CSS colour (defaults to success token).
 */
export function SuccessBurst({ size = 72, tone = "hsl(var(--success))", label = "Success", className }) {
  const reduce = useReducedMotion();
  return (
    <span role="img" aria-label={label} className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size, color: tone }}>
      {!reduce &&
        Array.from({ length: RAYS }, (_, i) => {
          const angle = (i / RAYS) * Math.PI * 2;
          return (
            <motion.span
              key={i}
              aria-hidden
              className="absolute size-1.5 rounded-full bg-current"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{ x: Math.cos(angle) * size * 0.62, y: Math.sin(angle) * size * 0.62, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
              transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            />
          );
        })}
      <motion.svg viewBox="0 0 52 52" width={size} height={size} initial={reduce ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy}>
        <circle cx="26" cy="26" r="24" fill="currentColor" opacity="0.14" />
        <motion.circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2.5" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }} />
        <motion.path d="M15 27 l7 7 l15 -16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.32, ease: [0.22, 1, 0.36, 1] }} />
      </motion.svg>
    </span>
  );
}
