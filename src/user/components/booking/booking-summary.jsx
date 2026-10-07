import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarClock, Info, ShoppingBag, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { spring } from "@/components/motion/presets";
import { AnimatedCounter } from "@/components/motion/animated-counter";

const money = (n) => formatMoney(n);

function CountBadge({ count }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-portal/12 text-portal">
      <ShoppingBag className="size-5" aria-hidden />
      <AnimatePresence mode="popLayout" initial={false}>
        {count ? (
          <motion.span
            key={count}
            initial={reduce ? { opacity: 0 } : { scale: 0.2, y: -6 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.2, opacity: 0 }}
            transition={spring.bouncy}
            className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-portal px-1 text-[11px] leading-5 font-bold text-portal-foreground ring-2 ring-card"
          >
            {count}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

/**
 * Phone/tablet: sticky cart summary pinned above the tab bar. Springs up when the first service is
 * added; the count badge pops and the total counts to its new value.
 */
export function CartBar({ visible, count, total, caption, blocker, actions, chips }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={reduce ? { opacity: 0 } : { y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: 120, opacity: 0 }}
          transition={spring.sheet}
          className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+0.5rem)] z-sticky px-3 lg:hidden"
        >
          <div className="glass-strong mx-auto max-w-xl space-y-2.5 rounded-sheet p-3 shadow-float">
            {chips}
            <div className="flex items-center gap-3 px-0.5">
              <CountBadge count={count} />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-caption", blocker ? "font-semibold text-ink-warning" : "text-ink-neutral")}>{blocker ?? caption}</p>
                <AnimatedCounter value={total} format={money} duration={0.6} className="font-display text-lg leading-tight font-bold" />
              </div>
            </div>
            {actions}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Desktop: the live summary beside the steps, with the step actions inside it. */
export function BookingAside({ services, priceOf, onRemove, canRemove, when, stylist, savings, wallet, total, blocker, refundNote, actions }) {
  const reduce = useReducedMotion();
  return (
    <aside className="hidden lg:block" aria-label="Your booking">
      <div className="sticky top-[calc(var(--topbar-h)+1.5rem)] space-y-4 rounded-card bg-card p-5 shadow-soft ring-1 ring-inset ring-border/60">
        <div className="flex items-center gap-3">
          <CountBadge count={services.length} />
          <h2 className="font-display text-headline font-semibold">Your booking</h2>
        </div>

        {services.length ? (
          <ul className="space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
              {services.map((service) => (
                <motion.li
                  key={service.id}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: 10 }}
                  transition={spring.soft}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{service.name}</span>
                  <span className="font-semibold tabular-nums">{money(priceOf(service))}</span>
                  {canRemove ? (
                    <button type="button" aria-label={`Remove ${service.name}`} onClick={() => onRemove(service.id)} className="tap grid size-7 place-items-center rounded-full bg-muted hover:bg-destructive/12 hover:text-ink-destructive">
                      <X className="size-3.5" aria-hidden />
                    </button>
                  ) : null}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="rounded-2xl bg-muted/60 p-4 text-caption text-ink-neutral">No services yet</p>
        )}

        {when || stylist ? (
          <div className="space-y-2 border-t border-border pt-3 text-sm">
            {when ? (
              <p className="flex items-center gap-2 font-medium">
                <CalendarClock className="size-4 text-portal" aria-hidden /> {when}
              </p>
            ) : null}
            {stylist ? (
              <p className="flex items-center gap-2 font-medium">
                <UserRound className="size-4 text-portal" aria-hidden /> {stylist}
              </p>
            ) : null}
          </div>
        ) : null}

        {savings > 0 || wallet > 0 ? (
          <div className="space-y-1.5 border-t border-border pt-3 text-sm text-ink-success">
            {savings > 0 ? (
              <p className="flex justify-between font-medium">
                <span>Offers</span>
                <span className="tabular-nums">−{money(savings)}</span>
              </p>
            ) : null}
            {wallet > 0 ? (
              <p className="flex justify-between font-medium">
                <span>Wallet</span>
                <span className="tabular-nums">−{money(wallet)}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {refundNote ? <p className="rounded-2xl bg-muted/60 px-3 py-2 text-caption text-ink-neutral">{refundNote}</p> : null}

        <div className="flex items-end justify-between border-t border-dashed border-border pt-3">
          <span className="text-sm font-semibold">Total</span>
          <AnimatedCounter value={total} format={money} duration={0.6} className="font-display text-title font-bold text-portal" />
        </div>

        {blocker ? (
          <p className="flex items-center gap-2 rounded-2xl bg-warning/12 px-3 py-2 text-caption font-semibold text-ink-warning">
            <Info className="size-4 shrink-0" aria-hidden /> {blocker}
          </p>
        ) : null}
        {actions}
      </div>
    </aside>
  );
}
