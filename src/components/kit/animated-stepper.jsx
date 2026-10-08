import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";

/**
 * Progress through a multi-step flow (booking, walk-in, onboarding). The connector fills with a
 * spring, finished steps morph into checks. On phones only the current step's label is shown.
 * Steps before `current` are clickable when `onStepClick` is given.
 * @param {{ steps: {id:string,label:string,icon?:any}[], current: number, onStepClick?: (i:number)=>void, className?: string }} props
 */
export function AnimatedStepper({ steps, current, onStepClick, className }) {
  const reduce = useReducedMotion();
  const pct = steps.length > 1 ? (Math.min(current, steps.length - 1) / (steps.length - 1)) * 100 : 0;
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="relative flex items-start justify-between">
        <span aria-hidden className="absolute top-5 right-5 left-5 h-1 rounded-full bg-muted" />
        <motion.span
          aria-hidden
          className="absolute top-5 left-5 h-1 origin-left rounded-full bg-portal"
          style={{ right: "1.25rem" }}
          initial={false}
          animate={{ scaleX: pct / 100 }}
          transition={reduce ? { duration: 0 } : spring.soft}
        />
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const Icon = step.icon;
          const clickable = done && onStepClick;
          return (
            <li key={step.id} className="relative z-[1] flex flex-1 flex-col items-center first:items-start last:items-end">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick(i)}
                aria-current={active ? "step" : undefined}
                aria-label={`${step.label}${done ? ", done" : active ? ", current" : ""}`}
                className="flex flex-col items-center gap-1.5 disabled:cursor-default"
              >
                <motion.span
                  initial={false}
                  animate={{ scale: active && !reduce ? 1.08 : 1 }}
                  transition={spring.bouncy}
                  className={cn(
                    "grid size-11 place-items-center rounded-full ring-4 ring-background transition-colors duration-300",
                    done ? "bg-portal text-portal-foreground" : active ? "bg-card text-portal shadow-glow ring-portal/30" : "bg-muted text-ink-neutral"
                  )}
                >
                  {done ? (
                    <motion.span key="check" initial={reduce ? false : { scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={spring.bouncy} className="grid">
                      <Check className="size-5" strokeWidth={3} aria-hidden />
                    </motion.span>
                  ) : Icon ? (
                    <Icon className="size-5" aria-hidden />
                  ) : (
                    <span className="text-sm font-bold">{i + 1}</span>
                  )}
                </motion.span>
                <span className={cn("max-w-20 text-center text-micro font-semibold sm:block", active ? "block text-foreground" : "hidden text-ink-neutral")}>{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
