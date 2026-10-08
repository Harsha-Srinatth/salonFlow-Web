import { Gift, Lock, Share2, Sparkles, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Signed-out twin of ReferralShareCard (same layout) for marketing pages.
 * There is no code or balance before sign-up, so the code is masked and the actions lead to
 * signup. Never put a sample code or an amount here: reward amounts are set by the salon.
 * @param {{ to?: string, className?: string }} props
 */
export function LandingReferralPreview({ to = "/auth/signup", className }) {
  return (
    <div className={cn("relative rounded-card border border-border bg-card p-5 shadow-lift sm:p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-caption font-semibold text-ink-primary">
            <Gift className="size-4" aria-hidden /> Refer &amp; earn
          </p>
          <p className="mt-1 font-display text-title font-bold">Invite friends</p>
        </div>
        <div className="rounded-xl bg-gold/12 px-3 py-2 text-right">
          <p className="flex items-center justify-end gap-1 text-micro font-semibold text-ink-neutral">
            <Wallet className="size-3" aria-hidden /> Wallet
          </p>
          <p className="flex items-center justify-end gap-1 font-display text-lg font-bold text-gold">
            <Sparkles className="size-4" aria-hidden /> Credit
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-muted p-1.5 pl-4">
        <span className="min-w-0 flex-1">
          <span className="block text-micro font-semibold text-ink-neutral uppercase">Your code</span>
          <span className="block truncate font-mono text-lg font-bold tracking-[0.2em]" aria-label="Your code appears after sign up">
            ••••••
          </span>
        </span>
        <span className="grid size-11 place-items-center rounded-lg bg-card text-ink-neutral" aria-hidden>
          <Lock className="size-5" />
        </span>
      </div>

      <Link to={to} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]">
        <Share2 className="size-4" aria-hidden /> Get my invite link
      </Link>
    </div>
  );
}
