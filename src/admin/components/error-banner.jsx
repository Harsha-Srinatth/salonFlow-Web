"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleAlert, RotateCcw } from "lucide-react";
import { ButtonLoadingMorph, TONE_CLASSES, useAsyncAction } from "@/components/kit";
import { spring } from "@/components/motion";
import { cn } from "@/lib/utils";

/**
 * Slim inline alert that stays until the error clears (toasts disappear; this doesn't). Use it above
 * content that is still usable. When a list failed to load and there is nothing to show, render the
 * kit's <ErrorState onRetry> instead.
 */
export function ErrorBanner({ message, onRetry, className }) {
  const reduce = useReducedMotion();
  const { state, run } = useAsyncAction({ successMs: 600 });
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.div
          key="error"
          role="alert"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={spring.soft}
          className={cn("flex flex-col gap-3 rounded-2xl p-3 ring-1 ring-inset sm:flex-row sm:items-center sm:justify-between", TONE_CLASSES.destructive, className)}
        >
          <p className="flex items-start gap-2 text-sm font-medium">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="min-w-0 break-words">{message}</span>
          </p>
          {onRetry ? (
            <ButtonLoadingMorph size="sm" variant="outline" icon={RotateCcw} state={state} successLabel="Loaded" className="shrink-0 self-start sm:self-auto" onClick={() => run(onRetry)}>
              Retry
            </ButtonLoadingMorph>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
