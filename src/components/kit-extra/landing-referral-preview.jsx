import { motion, useReducedMotion } from "motion/react";
import { Gift, Lock, Share2, Sparkles, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";

/**
 * Signed-out twin of ReferralShareCard (same gradient, grain and layout) for marketing pages.
 * There is no code or balance before sign-up, so the code is masked and the actions lead to
 * signup. Never put a sample code or an amount here: reward amounts are set by the salon.
 * @param {{ to?: string, className?: string }} props
 */
export function LandingReferralPreview({ to = "/auth/signup", className }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("relative isolate overflow-hidden rounded-card p-5 text-white shadow-float sm:p-6", className)}>
      <div aria-hidden className="absolute inset-0 -z-[1] bg-[linear-gradient(135deg,hsl(var(--portal-accent)),hsl(var(--ink-info))_120%)]" />
      <div aria-hidden className="absolute inset-0 -z-[1] hidden bg-[hsl(222_45%_6%/0.5)] dark:block" />
      <div aria-hidden className="grain absolute inset-0 -z-[1]" />
      <motion.div
        aria-hidden
        className="absolute -top-10 -right-10 -z-[1] size-40 rounded-blob bg-white/15 blur-xl"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-caption font-semibold opacity-90">
            <Gift className="size-4" aria-hidden /> Refer &amp; earn
          </p>
          <p className="mt-1 font-display text-title font-bold">Invite friends</p>
        </div>
        <div className="rounded-2xl bg-white/15 px-3 py-2 text-right backdrop-blur">
          <p className="flex items-center justify-end gap-1 text-micro font-semibold opacity-90">
            <Wallet className="size-3" aria-hidden /> Wallet
          </p>
          <p className="flex items-center justify-end gap-1 font-display text-lg font-bold">
            <Sparkles className="size-4" aria-hidden /> Credit
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-black/15 p-1.5 pl-4 backdrop-blur">
        <span className="min-w-0 flex-1">
          <span className="block text-micro font-semibold uppercase opacity-80">Your code</span>
          <span className="block truncate font-mono text-lg font-bold tracking-[0.2em]" aria-label="Your code appears after sign up">
            ••••••
          </span>
        </span>
        <span className="grid size-11 place-items-center rounded-xl bg-white/90 text-[hsl(222_45%_10%)]" aria-hidden>
          <Lock className="size-5" />
        </span>
      </div>

      <motion.div whileTap={reduce ? undefined : { scale: 0.97 }} transition={spring.snappy} className="mt-5">
        <Link to={to} className="shine inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-white text-sm font-bold text-[hsl(222_45%_10%)]">
          <Share2 className="size-4" aria-hidden /> Get my invite link
        </Link>
      </motion.div>
    </div>
  );
}
