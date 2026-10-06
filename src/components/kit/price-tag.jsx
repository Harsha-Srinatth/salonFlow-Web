import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

const SIZES = { sm: "text-sm", md: "text-lg", lg: "text-2xl", xl: "text-display-lg" };

/**
 * Price with optional strike-through list price, savings chip and member badge.
 * Rupees by default; pass `paise` when the amounts are in paise.
 * @param {{ amount: number, listPrice?: number, member?: boolean, from?: boolean, paise?: boolean, size?: keyof SIZES, showSavings?: boolean }} props
 */
export function PriceTag({ amount, listPrice, member = false, from = false, paise = false, size = "md", showSavings = true, className }) {
  const fmt = (v) => formatMoney(v, { paise });
  const discounted = listPrice != null && Number(listPrice) > Number(amount);
  const pct = discounted ? Math.round((1 - Number(amount) / Number(listPrice)) * 100) : 0;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      {from ? <span className="text-caption text-ink-neutral">from</span> : null}
      <span className={cn("font-display font-bold tabular-nums tracking-tight", SIZES[size] ?? SIZES.md)}>{fmt(amount)}</span>
      {discounted ? (
        <>
          <s className="text-caption tabular-nums text-ink-neutral" aria-label={`was ${fmt(listPrice)}`}>
            {fmt(listPrice)}
          </s>
          {showSavings && pct > 0 ? <span className="rounded-full bg-success/12 px-1.5 py-0.5 text-micro font-bold text-ink-success">−{pct}%</span> : null}
        </>
      ) : null}
      {member ? (
        <span className="inline-flex items-center gap-1 self-center rounded-full bg-gold/16 px-2 py-0.5 text-micro font-bold text-ink-warning ring-1 ring-inset ring-gold/35">
          <Crown className="size-3" aria-hidden /> Member
        </span>
      ) : null}
    </span>
  );
}
