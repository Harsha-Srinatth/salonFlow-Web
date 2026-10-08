import { motion, useReducedMotion } from "motion/react";
import { CalendarCheck2, CalendarPlus, Clock, Gift, Scissors, Share2, UserRound } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { fireConfetti } from "@/components/motion/confetti-burst";
import { SuccessBurst } from "@/components/motion/success-burst";
import { haptic, interaction, spring } from "@/components/motion/presets";
import { formatMoney } from "@/lib/format";
import { salonDateOf, salonRelativeDayLabel, salonTimeLabel } from "@/lib/salon-date";

/**
 * Shown once the backend confirms the booking (never optimistically). Fires the burst + confetti,
 * then prompts the customer to invite a friend (InviteSheet from the frame) after a beat.
 */
export function BookingSuccess({ booked, onBookAnother, onInvite, canInvite }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);

  useEffect(() => {
    haptic("success");
    if (!reduce) void fireConfetti({ element: ref.current, particleCount: 110, spread: 85 });
    if (!canInvite) return undefined;
    const t = setTimeout(onInvite, reduce ? 600 : 1600);
    return () => clearTimeout(t);
    // Once per success screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item = (i) => ({ initial: reduce ? false : { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: reduce ? 0 : 0.25 + i * 0.07 } });

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-4 text-center">
      <div ref={ref} className="aurora grain relative isolate grid w-full place-items-center overflow-hidden rounded-card bg-card px-6 pt-10 pb-8 ring-1 ring-inset ring-border/60">
        <SuccessBurst size={96} label="Booking confirmed" className="relative z-[2]" />
        <motion.h2 {...item(0)} className="relative z-[2] mt-4 font-display text-display-lg font-bold">
          You're booked
        </motion.h2>
        {booked.startsAt ? (
          <motion.p {...item(1)} className="relative z-[2] mt-2 flex items-center gap-2 font-semibold">
            <Clock className="size-4 text-portal" aria-hidden />
            {salonRelativeDayLabel(salonDateOf(booked.startsAt))} · {salonTimeLabel(booked.startsAt)}
          </motion.p>
        ) : null}
        {booked.stylist ? (
          <motion.p {...item(2)} className="relative z-[2] mt-1 flex items-center gap-2 text-sm text-ink-neutral">
            <UserRound className="size-4" aria-hidden /> {booked.stylist}
          </motion.p>
        ) : null}
      </div>

      {booked.services?.length ? (
        <motion.ul {...item(3)} className="w-full space-y-2 rounded-card bg-card p-4 text-left ring-1 ring-inset ring-border/60">
          {booked.services.map((name) => (
            <li key={name} className="flex items-center gap-2.5 text-sm font-medium">
              <span className="grid size-8 place-items-center rounded-xl bg-portal/12 text-portal">
                <Scissors className="size-4" aria-hidden />
              </span>
              {name}
            </li>
          ))}
          {booked.amount > 0 ? <li className="flex justify-between border-t border-dashed border-border pt-2 text-sm font-semibold"><span>Paid</span><span className="tabular-nums">{formatMoney(booked.amount)}</span></li> : null}
        </motion.ul>
      ) : null}

      {canInvite ? (
        <motion.button
          {...item(4)}
          type="button"
          onClick={onInvite}
          whileTap={reduce ? undefined : interaction.press}
          className="shine flex w-full items-center gap-3 rounded-card bg-gold/14 p-4 text-left ring-1 ring-inset ring-gold/35"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold/25 text-ink-warning">
            <Gift className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Share the glow</span>
            <span className="block text-caption text-ink-neutral">Invite a friend, both earn rewards</span>
          </span>
          <Share2 className="size-5 text-ink-warning" aria-hidden />
        </motion.button>
      ) : null}

      <motion.div {...item(5)} className="grid w-full gap-3 sm:grid-cols-2">
        <Link to="/user-dashboard/booking-history" className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-portal font-semibold text-portal-foreground shadow-glow">
          <CalendarCheck2 className="size-5" aria-hidden /> My bookings
        </Link>
        <button type="button" onClick={onBookAnother} className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-secondary font-semibold">
          <CalendarPlus className="size-5" aria-hidden /> Book another
        </button>
      </motion.div>
    </div>
  );
}
