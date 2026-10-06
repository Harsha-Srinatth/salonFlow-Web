import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";
import { Illustration } from "./illustrations";

/**
 * Friendly empty state: illustration (or icon), short title, one line of copy, ONE clear action.
 * Backward compatible with the old shared EmptyState ({ icon, title, description, action, className }).
 * @param {{ illustration?: "calendar"|"search"|"queue"|"gift"|"bag"|"sparkle", icon?: any, title: string,
 *   description?: string, action?: React.ReactNode, compact?: boolean, className?: string }} props
 */
export function EmptyState({ illustration, icon: Icon, title, description, action, compact = false, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      className={cn("flex flex-col items-center gap-3 rounded-card bg-card text-center", compact ? "px-4 py-8" : "px-6 py-12", className)}
    >
      {illustration || !Icon ? (
        <Illustration name={illustration ?? "sparkle"} className={compact ? "h-20" : "h-28"} />
      ) : (
        <span className="grid size-14 place-items-center rounded-2xl bg-portal/12 text-portal">
          <Icon className="size-7" aria-hidden />
        </span>
      )}
      <h3 className={cn("font-display font-semibold", compact ? "text-base" : "text-headline")}>{title}</h3>
      {description ? <p className="max-w-sm text-sm text-ink-neutral">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </motion.div>
  );
}
