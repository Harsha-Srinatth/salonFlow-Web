import { motion, useReducedMotion } from "motion/react";
import { Check, Copy, Gift, Hourglass, Share2, Wallet } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { copyText, shareLink } from "@/lib/referral";
import { notify } from "@/lib/notify";
import { haptic, spring } from "@/components/motion/presets";
import { AnimatedCounter } from "@/components/motion/animated-counter";

/**
 * Shareable invite card. Data comes from GET /api/customer/loyalty (referralCode, walletBalance,
 * pendingCredit); build the link with buildReferralLink(code). `progress` is optional and supplied
 * by the caller (e.g. rewarded referrals toward a target the business sets) — never invent one.
 * @param {{ code: string, link: string, walletBalance?: number, pendingCredit?: number,
 *   progress?: { current: number, target: number, label: string }, onInvite?: ()=>void, className?: string }} props
 */
export function ReferralShareCard({ code, link, walletBalance, pendingCredit, progress, onInvite, className }) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const pct = progress ? Math.min(1, progress.current / Math.max(1, progress.target)) : 0;

  const copy = async () => {
    if (await copyText(link)) {
      setCopied(true);
      haptic("success");
      notify.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } else notify.error("Couldn't copy the link");
  };
  const share = async () => {
    const r = await shareLink({ url: link });
    if (r === "unsupported") onInvite ? onInvite() : void copy();
  };

  return (
    <div className={cn("relative isolate overflow-hidden rounded-card p-5 bg-primary text-primary-foreground sm:p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-caption font-semibold opacity-90">
            <Gift className="size-4" aria-hidden /> Refer &amp; earn
          </p>
          <p className="mt-1 font-display text-title font-bold">Invite friends</p>
        </div>
        {walletBalance != null ? (
          <div className="rounded-2xl bg-primary-foreground/10 px-3 py-2 text-right">
            <p className="flex items-center justify-end gap-1 text-micro font-semibold opacity-90">
              <Wallet className="size-3" aria-hidden /> Wallet
            </p>
            <AnimatedCounter value={walletBalance} format={(n) => formatMoney(n)} className="font-display text-lg font-bold" />
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-primary-foreground/10 p-1.5 pl-4">
        <span className="min-w-0 flex-1">
          <span className="block text-micro font-semibold uppercase opacity-80">Your code</span>
          <span className="block truncate font-mono text-lg font-bold tracking-[0.2em]">{code}</span>
        </span>
        <motion.button type="button" whileTap={reduce ? undefined : { scale: 0.92 }} onClick={copy} aria-label="Copy invite link" className="grid size-11 place-items-center rounded-xl bg-primary-foreground text-primary">
          {copied ? (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} className="grid">
              <Check className="size-5" strokeWidth={3} aria-hidden />
            </motion.span>
          ) : (
            <Copy className="size-5" aria-hidden />
          )}
        </motion.button>
      </div>

      {progress ? (
        <div className="mt-4">
          <div className="flex justify-between text-caption font-semibold">
            <span>{progress.label}</span>
            <span className="tabular-nums">
              {progress.current}/{progress.target}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-primary-foreground/20" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={progress.label}>
            <motion.div className="h-full origin-left rounded-full bg-primary-foreground" initial={{ scaleX: 0 }} whileInView={{ scaleX: pct }} viewport={{ once: true }} transition={spring.gentle} />
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-2">
        <motion.button type="button" whileTap={reduce ? undefined : { scale: 0.97 }} onClick={onInvite ?? share} className="relative inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-control bg-primary-foreground text-sm font-bold text-primary">
          <Share2 className="size-4" aria-hidden /> Invite
        </motion.button>
        {pendingCredit ? (
          <span className="inline-flex h-12 items-center gap-1.5 rounded-control bg-primary-foreground/10 px-3 text-caption font-semibold">
            <Hourglass className="size-3.5" aria-hidden />
            {formatMoney(pendingCredit)} verifying
          </span>
        ) : null}
      </div>
    </div>
  );
}
