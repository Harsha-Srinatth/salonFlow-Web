import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { isStartedPendingAutoComplete } from "@/lib/booking-pending-status";
import { spring } from "@/components/motion/presets";
import { getStatusMeta, TONE_CLASSES, TONE_DOT } from "./status-meta";

/**
 * The ONLY way to show a status (contract item a). Colour, icon and label come from STATUS_META.
 * The icon morphs when the status changes; STARTED gets a live pulse.
 * @param {{ status: string, booking?: object, audience?: "customer"|"staff", size?: "sm"|"md", iconOnly?: boolean, className?: string }} props
 */
export function StatusChip({ status, booking, audience = "staff", size = "md", iconOnly = false, className }) {
  const reduce = useReducedMotion();
  const meta = getStatusMeta(status ?? booking?.status, { audience });
  const Icon = meta.icon;
  const live = meta.live && (!booking || isStartedPendingAutoComplete(booking) || meta.key === "STARTED");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset",
        size === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-xs",
        iconOnly && (size === "sm" ? "w-6 justify-center px-0" : "w-7 justify-center px-0"),
        TONE_CLASSES[meta.tone],
        className
      )}
      title={iconOnly ? meta.label : undefined}
    >
      <span className="relative grid place-items-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={meta.key}
            className="grid place-items-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 45 }}
            transition={spring.bouncy}
          >
            <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden strokeWidth={2.4} />
          </motion.span>
        </AnimatePresence>
      </span>
      {iconOnly ? <span className="sr-only">{meta.label}</span> : <span>{meta.label}</span>}
    </span>
  );
}
