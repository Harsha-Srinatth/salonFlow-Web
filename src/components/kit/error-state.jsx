import { motion, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";
import { Illustration } from "./illustrations";
import { ButtonLoadingMorph, useAsyncAction } from "./button-loading-morph";

/**
 * Something failed: illustration, plain-language title, optional detail, one Retry action.
 * `onRetry` may be async; the button morphs while it runs.
 * @param {{ title?: string, description?: string, onRetry?: ()=>any, retryLabel?: string, compact?: boolean, offline?: boolean, className?: string }} props
 */
export function ErrorState({ title = "Something went wrong", description = "Please try again in a moment.", onRetry, retryLabel = "Try again", compact = false, offline = false, className }) {
  const reduce = useReducedMotion();
  const { state, run } = useAsyncAction({ successMs: 600 });
  return (
    <motion.div
      role="alert"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      className={cn("flex flex-col items-center gap-3 rounded-card bg-card text-center", compact ? "px-4 py-8" : "px-6 py-12", className)}
    >
      <Illustration name={offline ? "offline" : "error"} className={compact ? "h-20" : "h-28"} />
      <h3 className={cn("font-display font-semibold", compact ? "text-base" : "text-headline")}>{offline ? "You're offline" : title}</h3>
      {description ? <p className="max-w-sm text-sm text-ink-neutral">{offline ? "Check your connection and we'll pick up where you left off." : description}</p> : null}
      {onRetry ? (
        <ButtonLoadingMorph className="mt-1" icon={RotateCcw} state={state} variant="outline" onClick={() => run(onRetry)} successLabel="Loaded">
          {retryLabel}
        </ButtonLoadingMorph>
      ) : null}
    </motion.div>
  );
}
