import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";
import { salonTimeLabel } from "@/lib/salon-date";
import { BOOKING_FLOW, getStatusMeta, TONE_DOT, TONE_INK } from "./status-meta";

/**
 * Where a booking is in its lifecycle: Pending → Confirmed → In service → Completed, or ending in
 * Cancelled / No-show. Uses the same STATUS_META as StatusChip. `times` maps status → ISO timestamp.
 * @param {{ status: string, times?: Record<string,string>, orientation?: "vertical"|"horizontal", audience?: "customer"|"staff", className?: string }} props
 */
export function BookingTimeline({ status, times = {}, orientation = "horizontal", audience = "customer", className }) {
  const reduce = useReducedMotion();
  const current = getStatusMeta(status, { audience });
  const offFlow = current.key === "CANCELLED" || current.key === "NO-SHOW";
  const reached = offFlow ? Math.max(0, BOOKING_FLOW.indexOf(times.CONFIRMED ? "CONFIRMED" : "PENDING")) : BOOKING_FLOW.indexOf(current.key);
  const steps = offFlow ? [...BOOKING_FLOW.slice(0, reached + 1), current.key] : BOOKING_FLOW;
  const vertical = orientation === "vertical";
  const lastDone = offFlow ? steps.length - 1 : reached;

  return (
    <ol className={cn(vertical ? "flex flex-col" : "flex items-start", className)} aria-label="Booking progress">
      {steps.map((key, i) => {
        const meta = getStatusMeta(key, { audience });
        const Icon = meta.icon;
        const last = i === steps.length - 1;
        const done = i <= lastDone;
        const filled = i < lastDone;
        const nextTone = !last ? getStatusMeta(steps[i + 1]).tone : "neutral";
        const isCurrent = key === current.key;
        return (
          <li key={key} className={cn("relative flex", vertical ? "gap-3 pb-5 last:pb-0" : "flex-1 flex-col items-center text-center")} aria-current={isCurrent ? "step" : undefined}>
            {!last ? (
              <span aria-hidden className={cn("absolute bg-muted", vertical ? "top-9 bottom-0 left-[17px] w-0.5" : "top-[17px] left-1/2 h-0.5 w-full")}>
                <motion.span
                  className={cn("absolute inset-0 origin-top-left", TONE_DOT[nextTone], !filled && "opacity-0")}
                  initial={reduce ? false : vertical ? { scaleY: 0 } : { scaleX: 0 }}
                  animate={vertical ? { scaleY: 1 } : { scaleX: 1 }}
                  transition={{ ...spring.soft, delay: reduce ? 0 : 0.15 + i * 0.12 }}
                />
              </span>
            ) : null}
            <motion.span
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring.bouncy, delay: reduce ? 0 : i * 0.12 }}
              className={cn(
                "relative z-[1] grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-background",
                done ? cn("bg-card ring-2! ring-current", TONE_INK[meta.tone]) : "bg-muted text-ink-neutral",
                isCurrent && "shadow-glow"
              )}
            >
              {isCurrent && meta.live ? <span aria-hidden className={cn("kit-live-ping absolute inset-0 rounded-full", TONE_DOT[meta.tone])} /> : null}
              <Icon className="relative size-4" aria-hidden />
            </motion.span>
            <span className={cn(vertical ? "pt-1.5" : "mt-1.5 px-1")}>
              <span className={cn("block text-caption font-semibold", done ? "text-foreground" : "text-ink-neutral")}>{meta.label}</span>
              {times[key] ? <span className="block text-micro text-ink-neutral">{salonTimeLabel(times[key])}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
