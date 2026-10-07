import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Flag, MessageSquareHeart, Send } from "lucide-react";
import { ButtonLoadingMorph, FloatingLabelInput, Rating, ResponsiveModal, useAsyncAction } from "@/components/kit";
import { haptic, spring } from "@/components/motion/presets";
import { cn } from "@/lib/utils";

const MOOD = ["Tap a star", "Sorry to hear that", "We can do better", "Thanks for the feedback", "Glad you liked it", "Wonderful!"];
const EMOJI = ["", "😞", "😕", "🙂", "😊", "🤩"];

/** Rate a completed visit: animated stars, optional comment, complaint switch. */
export function ReviewSheet({ open, onOpenChange, booking, rating, onRating, comment, onComment, complaint, onComplaint, onSubmit }) {
  const reduce = useReducedMotion();
  const { state, run } = useAsyncAction({ successMs: 700 });
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={booking?.service ?? "Your visit"}
      description="How was it?"
      icon={MessageSquareHeart}
      size="sm"
      footer={
        <ButtonLoadingMorph state={state} icon={Send} fullWidth disabled={rating < 1} onClick={() => run(onSubmit)} successLabel="Thanks!">
          Send
        </ButtonLoadingMorph>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2 pt-1">
          <div className="relative h-12 w-12">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={rating}
                aria-hidden
                initial={reduce ? { opacity: 0 } : { scale: 0.3, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { scale: 0.3, opacity: 0 }}
                transition={spring.bouncy}
                className="absolute inset-0 grid place-items-center text-4xl"
              >
                {EMOJI[rating] || "⭐"}
              </motion.span>
            </AnimatePresence>
          </div>
          <Rating value={rating} onChange={onRating} size="lg" label="Your rating" />
          <p className="h-5 text-caption font-semibold text-ink-neutral" aria-live="polite">
            {MOOD[rating]}
          </p>
        </div>
        <FloatingLabelInput as="textarea" label="Comment (optional)" rows={3} maxLength={2000} value={comment} onChange={(e) => onComment(e.target.value)} />
        <button
          type="button"
          role="switch"
          aria-checked={complaint}
          onClick={() => {
            haptic("tap");
            onComplaint(!complaint);
          }}
          className={cn("flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold transition-colors", complaint ? "bg-destructive/12 text-ink-destructive" : "bg-muted/60")}
        >
          <Flag className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">This is a complaint</span>
          <span className={cn("flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors", complaint ? "bg-destructive" : "bg-muted-foreground/30")}>
            <motion.span layout={!reduce} transition={spring.snappy} className={cn("size-6 rounded-full bg-white shadow-soft", complaint && "ml-auto")} />
          </span>
        </button>
      </div>
    </ResponsiveModal>
  );
}
