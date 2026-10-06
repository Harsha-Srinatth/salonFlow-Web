import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";
import { formatWaitLabel } from "@/lib/queue-utils";
import { ordinal } from "@/lib/format";
import { Avatar } from "./avatar";
import { StatusChip } from "./status-chip";

/**
 * The customer's place in the live queue: big animated position number (rolls when it changes),
 * people-ahead dots and wait time. Props mirror the queue entry fields
 * (positionInLane, peopleAhead, waitMinutes, status, ticket) from /queue/me + live board.
 * @param {{ position: number, peopleAhead?: number, waitMinutes?: number, status?: string, ticket?: string, className?: string }} props
 */
export function QueuePosition({ position, peopleAhead = Math.max(0, (position ?? 1) - 1), waitMinutes, status = "CONFIRMED", ticket, className }) {
  const reduce = useReducedMotion();
  const inService = status === "STARTED";
  return (
    <div className={cn("aurora grain relative overflow-hidden rounded-card bg-card p-5 ring-1 ring-inset ring-border/60", className)}>
      <div className="relative z-[2] flex items-start justify-between gap-4">
        <div>
          <p className="text-caption font-semibold text-ink-neutral">{inService ? "You're in the chair" : "Your place"}</p>
          <div className="relative mt-1 h-[4.5rem] overflow-hidden" aria-live="polite" aria-atomic="true">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={inService ? "now" : position}
                initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
                transition={spring.bouncy}
                className="font-display text-display-xl leading-none font-bold text-gradient-portal"
              >
                {inService ? "Now" : ordinal(position)}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <StatusChip status={status} audience="customer" />
      </div>
      <div className="relative z-[2] mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2">
          <Users className="size-4 text-portal" aria-hidden />
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: Math.min(peopleAhead, 6) }, (_, i) => (
              <motion.span key={i} layout initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring.bouncy, delay: i * 0.04 }} className="size-2 rounded-full bg-portal/60" />
            ))}
          </span>
          <span className="font-semibold">{peopleAhead === 0 ? "No one ahead" : `${peopleAhead} ahead`}</span>
        </span>
        {waitMinutes != null ? (
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Clock className="size-4 text-portal" aria-hidden />
            {formatWaitLabel(waitMinutes)}
          </span>
        ) : null}
        {ticket ? <span className="ml-auto rounded-full bg-muted px-2.5 py-1 font-mono text-caption font-semibold">#{ticket}</span> : null}
      </div>
    </div>
  );
}

/**
 * Live queue list; rows glide to their new positions when the order changes (layout animation).
 * Each entry: { ticket, name, status, waitMinutes, highlight? }.
 */
export function QueueList({ entries = [], className }) {
  return (
    <LayoutGroup>
      <ol className={cn("space-y-2", className)}>
        <AnimatePresence initial={false}>
          {entries.map((e, i) => (
            <motion.li
              key={e.ticket}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={spring.soft}
              className={cn("flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-inset ring-border/60", e.highlight && "ring-2 ring-portal shadow-glow")}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted font-display text-sm font-bold tabular-nums">{i + 1}</span>
              <Avatar name={e.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{e.highlight ? "You" : e.name}</span>
                <span className="block text-caption text-ink-neutral">{e.status === "STARTED" ? "In the chair" : formatWaitLabel(e.waitMinutes)}</span>
              </span>
              <StatusChip status={e.status} size="sm" audience="customer" iconOnly />
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </LayoutGroup>
  );
}
