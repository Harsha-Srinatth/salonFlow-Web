import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic, interaction, spring } from "@/components/motion/presets";

/**
 * Animated add/remove control for a cart item: a round "+" that morphs into a filled pill with a
 * drawn check. Acts as a checkbox for assistive tech.
 * @param {{ added: boolean, onChange: (next:boolean)=>void, label: string, size?: "sm"|"md", showText?: boolean, className?: string }} props
 */
export function UserCartToggle({ added, onChange, label, size = "md", showText = false, className }) {
  const reduce = useReducedMotion();
  const dim = size === "sm" ? "h-9 min-w-9" : "h-11 min-w-11";
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={added}
      aria-label={added ? `Remove ${label}` : `Add ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        haptic(added ? "tap" : "success");
        onChange(!added);
      }}
      whileTap={reduce ? undefined : interaction.press}
      layout={!reduce}
      transition={spring.snappy}
      className={cn(
        "tap relative inline-flex shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full px-0 text-sm font-semibold shadow-soft transition-colors",
        dim,
        showText && "px-3.5",
        added ? "bg-portal text-portal-foreground shadow-glow" : "bg-card text-portal ring-1 ring-inset ring-portal/35",
        className
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {added ? (
          <motion.span key="on" className="grid place-items-center" initial={reduce ? { opacity: 0 } : { scale: 0.3, rotate: -90 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={spring.bouncy}>
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.28, delay: 0.05 }} />
            </svg>
          </motion.span>
        ) : (
          <motion.span key="off" className="grid place-items-center" initial={reduce ? { opacity: 0 } : { scale: 0.3, rotate: 90 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={spring.bouncy}>
            <Plus className="size-5" strokeWidth={2.6} aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
      {showText ? <span>{added ? "Added" : "Add"}</span> : null}
    </motion.button>
  );
}
