"use client";

import { ButtonLoadingMorph, SlideToConfirm, useAsyncAction } from "@/components/kit";
import { SuccessBurst } from "@/components/motion";
import { cn } from "@/lib/utils";
import { CircleCheckBig, Clock, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { spring } from "@/components/motion/presets";

/**
 * Start a service. Follows the status machine: only a CONFIRMED booking can start. A PENDING one
 * shows why it can't yet. Morphs label → dots → check, with haptics from the kit.
 */
export function StartServiceButton({ card, onStart, size = "lg", fullWidth = true, className }) {
  const { state, run } = useAsyncAction({ successMs: 900 });
  if (!card.canStart) {
    if (card.isStarted) return null;
    return (
      <p className={cn("flex h-11 items-center justify-center gap-2 rounded-control bg-warning/12 px-3 text-sm font-semibold text-ink-warning", className)}>
        <Clock className="size-4" aria-hidden /> Awaiting confirmation
      </p>
    );
  }
  return (
    <ButtonLoadingMorph
      state={state}
      icon={Play}
      size={size}
      fullWidth={fullWidth}
      loadingLabel="Starting…"
      successLabel="Started"
      errorLabel="Retry"
      onClick={() => run(() => onStart(card.booking.id))}
      aria-label={`Start service for ${card.booking.customer ?? "customer"}`}
      className={className}
    >
      Start
    </ButtonLoadingMorph>
  );
}

/**
 * Complete a service with accidental-tap protection: press and hold (pointer, Space or Enter).
 * Only a STARTED booking can complete.
 */
export function CompleteServiceControl({ card, onComplete, onCompleted, className }) {
  if (!card.canComplete) return null;
  return (
    <SlideToConfirm
      mode="hold"
      holdMs={900}
      tone="primary"
      icon={CircleCheckBig}
      label="Hold to complete"
      confirmedLabel="Completed"
      onConfirm={async () => {
        await onComplete(card.booking.id);
        onCompleted?.(card.booking);
      }}
      resetAfter={2000}
      className={className}
    />
  );
}

/** Centre-screen success burst after a completion. Re-key with a counter to replay. */
export function CompletionCelebration({ burstKey, label }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-toast grid place-items-center" aria-hidden={!burstKey}>
      <AnimatePresence>
        {burstKey ? (
          <motion.div
            key={burstKey}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring.bouncy}
            className="glass-strong flex flex-col items-center gap-2 rounded-card px-8 py-6"
          >
            <SuccessBurst size={84} label="Service completed" />
            <p className="font-display text-headline font-semibold">{label ?? "Done!"}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
