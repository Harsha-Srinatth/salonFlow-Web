import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";
import { AnimatedCounter } from "@/components/motion/animated-counter";

const TONE_STROKE = { portal: "hsl(var(--portal-accent))", success: "hsl(var(--success))", warning: "hsl(var(--warning))", destructive: "hsl(var(--destructive))", gold: "hsl(var(--gold))", info: "hsl(var(--info))" };

/**
 * Circular progress that draws in when scrolled into view. Children replace the centre label.
 * @param {{ value: number, max?: number, size?: number, stroke?: number, tone?: keyof TONE_STROKE, label?: string, showValue?: boolean, children?: React.ReactNode }} props
 */
export function ProgressRing({ value, max = 100, size = 96, stroke = 9, tone = "portal", label, showValue = true, className, children }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const r = (size - stroke) / 2;
  return (
    <div ref={ref} role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE_STROKE[tone] ?? TONE_STROKE.portal}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: reduce ? pct : 0 }}
          animate={{ pathLength: inView ? pct : reduce ? pct : 0 }}
          transition={{ ...spring.gentle, delay: 0.1 }}
          style={{ filter: `drop-shadow(0 0 6px ${TONE_STROKE[tone] ?? TONE_STROKE.portal})` }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center">
        {children ?? (showValue ? <AnimatedCounter value={Math.round(pct * 100)} format={(n) => `${Math.round(n)}%`} className="font-display font-bold" style={{ fontSize: Math.max(11, size * 0.2) }} /> : null)}
      </span>
    </div>
  );
}
