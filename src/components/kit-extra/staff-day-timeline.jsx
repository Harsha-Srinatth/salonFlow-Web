import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { spring, stagger } from "@/components/motion/presets";
import { salonTimeLabel } from "@/lib/salon-date";
import { getStatusMeta, TONE_DOT } from "@/components/kit/status-meta";

/**
 * A day of bookings on a vertical time rail (staff portals: reception schedule per stylist and
 * the stylist's "my day"). Each row = time label, a status-coloured dot on the rail, and a card
 * rendered by the caller. A "Now" marker sits between past and upcoming rows when `nowMs` is
 * given. Rows animate in/out and re-order with layout animations, so live updates never jump.
 *
 * @param {{ items: { id: string, startsAt: string, status?: string }[], renderItem: (item: object) => React.ReactNode,
 *   nowMs?: number, layoutGroupId?: string, className?: string }} props
 */
export function StaffDayTimeline({ items = [], renderItem, nowMs, layoutGroupId, className }) {
  const reduce = useReducedMotion();
  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [items]
  );
  const nowIndex = useMemo(() => {
    if (!Number.isFinite(nowMs)) return -1;
    const i = sorted.findIndex((it) => new Date(it.startsAt).getTime() > nowMs);
    return i === -1 ? sorted.length : i;
  }, [sorted, nowMs]);

  const rows = [];
  sorted.forEach((item, i) => {
    if (i === nowIndex) rows.push({ now: true });
    rows.push({ item, index: i });
  });
  if (nowIndex === sorted.length && sorted.length) rows.push({ now: true });

  return (
    <LayoutGroup id={layoutGroupId}>
      <ol className={cn("relative", className)}>
        <span aria-hidden className="absolute top-3 bottom-3 left-[5.03rem] w-px bg-border sm:left-[5.53rem]" />
        <AnimatePresence initial={false}>
          {rows.map((row) =>
            row.now ? (
              <motion.li
                key="__now"
                layout={reduce ? false : "position"}
                transition={spring.soft}
                className="relative flex items-center gap-3 py-1.5"
                aria-label={`Now, ${salonTimeLabel(new Date(nowMs).toISOString())}`}
              >
                <span className="w-16 shrink-0 text-right text-micro font-bold text-portal uppercase sm:w-[4.5rem]">Now</span>
                <span aria-hidden className="relative z-[1] size-2.5 shrink-0 rounded-full bg-portal shadow-glow" />
                <span aria-hidden className="h-0.5 flex-1 rounded-full bg-gradient-to-r from-portal to-transparent" />
              </motion.li>
            ) : (
              <TimelineRow key={row.item.id} item={row.item} index={row.index} reduce={reduce} past={nowIndex >= 0 && row.index < nowIndex}>
                {renderItem(row.item)}
              </TimelineRow>
            )
          )}
        </AnimatePresence>
      </ol>
    </LayoutGroup>
  );
}

function TimelineRow({ item, index, reduce, past, children }) {
  const meta = getStatusMeta(item.status);
  return (
    <motion.li
      layout={reduce ? false : "position"}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      transition={{ ...spring.soft, delay: Math.min(index, 10) * stagger.tight }}
      className="relative flex gap-3 py-1.5"
    >
      <time dateTime={item.startsAt} className={cn("w-16 shrink-0 whitespace-nowrap pt-3.5 text-right text-caption font-semibold tabular-nums sm:w-[4.5rem]", past ? "text-ink-neutral" : "text-foreground")}>
        {salonTimeLabel(item.startsAt)}
      </time>
      <span aria-hidden className="relative z-[1] mt-4.5 grid size-2.5 shrink-0 place-items-center">
        {meta.live ? <span className={cn("kit-live-ping absolute inset-0 rounded-full", TONE_DOT[meta.tone])} /> : null}
        <span className={cn("relative size-2.5 rounded-full ring-4 ring-background", TONE_DOT[meta.tone])} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </motion.li>
  );
}
