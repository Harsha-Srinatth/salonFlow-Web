import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Crown, Gift, Percent, Scissors, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatIsoDate, salonDateOf } from "@/lib/salon-date";
import { formatMoney } from "@/lib/format";
import { interaction, spring } from "@/components/motion/presets";
import { IconButton, PriceTag } from "@/components/kit";

export const endsLabel = (endAt) => (endAt ? `Ends ${formatIsoDate(salonDateOf(endAt), { day: "numeric", month: "short" })}` : null);

/** Store-wide discount banner. */
export function GlobalDiscountCard({ discount, action, className }) {
  return (
    <div className={cn("relative overflow-hidden isolate flex h-full min-h-36 flex-col justify-between gap-4 rounded-card bg-card p-5 ring-1 ring-inset ring-border/60", className)}>
      <span className="relative z-[2] grid size-11 place-items-center rounded-2xl bg-portal text-portal-foreground shadow-glow">
        <Sparkles className="size-5" aria-hidden />
      </span>
      <div className="relative z-[2] flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-headline leading-tight font-bold">{discount.label}</p>
          {endsLabel(discount.endAt) ? <p className="mt-1 text-caption text-ink-neutral">{endsLabel(discount.endAt)}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

/** A bundle of services at one price. */
export function ComboCard({ combo, applied, onApply, onClear, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : interaction.cardHover}
      transition={spring.soft}
      className={cn(
        "relative flex h-full flex-col gap-4 overflow-hidden rounded-card bg-card p-5 shadow-soft ring-1 ring-inset transition-shadow hover:shadow-lift",
        applied ? "ring-2 ring-portal shadow-glow" : "ring-border/60",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-portal/12 text-portal">
          <Gift className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-headline font-semibold">{combo.name}</p>
          <p className="mt-0.5 flex items-start gap-1.5 text-caption text-ink-neutral">
            <Scissors className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span className="line-clamp-2">{(combo.serviceNames ?? []).join(" · ")}</span>
          </p>
        </div>
      </div>
      <div className="mt-auto flex items-end justify-between gap-3">
        <PriceTag amount={combo.offerPrice} listPrice={combo.actualPrice} size="lg" />
        <div className="flex shrink-0 gap-1.5">
          {applied && onClear ? <IconButton icon={X} label="Remove combo" variant="soft" onClick={onClear} /> : null}
          <motion.button
            type="button"
            whileTap={reduce ? undefined : interaction.press}
            onClick={() => onApply(combo)}
            className={cn("inline-flex h-11 items-center gap-1.5 rounded-control px-4 text-sm font-semibold", applied ? "bg-portal/12 text-portal" : "bg-portal text-portal-foreground shadow-soft")}
          >
            {applied ? <Check className="size-4" aria-hidden /> : null}
            {applied ? "Applied" : "Book"}
            {applied ? null : <ArrowRight className="size-4" aria-hidden />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/** A per-service price offer (member deals get the gold member badge). */
export function DealCard({ offer, member = false, onClick, className }) {
  const reduce = useReducedMotion();
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      whileHover={reduce ? undefined : interaction.cardHover}
      whileTap={onClick && !reduce ? interaction.press : undefined}
      transition={spring.soft}
      className={cn("flex h-full w-full items-center gap-4 rounded-card bg-card p-4 text-left shadow-soft ring-1 ring-inset ring-border/60 transition-shadow hover:shadow-lift", className)}
    >
      <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold", member ? "bg-gold/16 text-ink-warning" : "bg-portal/12 text-portal")}>
        {Math.round(offer.discountPercent)}
        <Percent className="-mt-1 size-3" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-semibold">{offer.serviceName}</span>
          {member ? <Crown className="size-4 shrink-0 text-gold" aria-label="Members" /> : null}
        </span>
        <span className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-lg font-bold">{formatMoney(offer.finalPrice)}</span>
          <span className="text-caption text-ink-neutral line-through">{formatMoney(offer.originalPrice)}</span>
        </span>
      </span>
    </Comp>
  );
}
