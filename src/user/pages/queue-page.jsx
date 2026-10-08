"use client";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, BellRing, CalendarPlus, Clock3, Hourglass, Info, RefreshCw, Scissors, Ticket, UserRound, Users, Wifi, WifiOff, Zap } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState, ErrorState, IconButton, PullToRefresh, QueuePosition, StatCard, StatusChip } from "@/components/kit";
import { SkeletonList, SkeletonShimmer } from "@/components/motion/skeleton-shimmer";
import { haptic, spring } from "@/components/motion/presets";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { QUEUE_CONFIDENCE_LABEL, formatClockTime, formatWaitLabel } from "@/lib/queue-utils";
import { connectQueueRealtime, disconnectQueueRealtime, fetchMyQueueStatus, fetchQueueBoard } from "@/store/queue-slice";
import { UserLayout } from "../portal/user-layout";
import { SectionHeading } from "../components/section-heading";

/** Fallback poll cadence used only while the websocket is down. */
const OFFLINE_POLL_MS = 30000;
/** Top-up cadence for a ticket that sits beyond the capped public board. */
const STALE_TICKET_POLL_MS = 60000;
/** "Your turn soon" once this close (one person ahead or fewer, or within this many minutes). */
const SOON_MINUTES = 10;

const waitFmt = (n) => formatWaitLabel(n);
const countFmt = (n) => Math.round(n).toString();
const avgFmt = (n) => (Math.round(n) > 0 ? formatWaitLabel(n) : "None");

function TurnSoonBanner({ entry }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="status"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={spring.bouncy}
      className="relative flex items-center gap-3 overflow-hidden rounded-card bg-success/12 p-4 ring-1 ring-inset ring-success/30"
    >
      <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-success text-success-foreground">
        <BellRing className="relative size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-headline font-bold text-ink-success">Your turn soon</span>
        <span className="block text-caption text-ink-neutral">
          Head to the salon · {entry.peopleAhead ? `${entry.peopleAhead} ahead` : "you're next"}
        </span>
      </span>
    </motion.div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-2xl bg-card p-3 ring-1 ring-inset ring-border/60">
      <p className="flex items-center gap-1.5 text-caption text-ink-neutral">
        <Icon className="size-3.5" aria-hidden /> {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function BoardRow({ entry, isMine }) {
  const reduce = useReducedMotion();
  const inService = entry.status === "STARTED";
  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
      transition={spring.soft}
      className={cn("flex items-center gap-3 rounded-2xl p-3 ring-1 ring-inset", isMine ? "bg-portal/10 shadow-glow ring-2 ring-portal" : "bg-card ring-border/60")}
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display text-sm font-bold tabular-nums", inService ? "bg-info/12 text-ink-info" : "bg-muted")}>
        {inService ? <Scissors className="size-4" aria-hidden /> : (entry.salonPosition ?? "–")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-semibold">
          <span className="font-mono">#{entry.ticket}</span>
          {isMine ? <span className="rounded-full bg-portal px-2 py-0.5 text-micro font-bold text-portal-foreground">YOU</span> : null}
        </p>
        <p className="truncate text-caption text-ink-neutral">
          {entry.serviceName}
          {entry.stylistName ? ` · ${entry.stylistName}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">{formatWaitLabel(inService ? entry.remainingMinutes : entry.waitMinutes)}</p>
        <p className="text-micro text-ink-neutral">{inService ? "left" : formatClockTime(entry.expectedStartAt)}</p>
      </div>
      <StatusChip status={entry.status} audience="customer" size="sm" iconOnly />
    </motion.li>
  );
}

export default function UserQueuePage() {
  const dispatch = useDispatch();
  const { appUser } = useAuth();
  const { board, boardLoading, boardError, mine, mineLoading, mineError, mineStale, realtimeConnected } = useSelector((state) => state.queue);
  const userId = appUser?.id;

  useEffect(() => {
    if (!userId) return undefined;
    void dispatch(fetchQueueBoard());
    void dispatch(fetchMyQueueStatus());
    void dispatch(connectQueueRealtime({ userId }));
    return () => {
      void dispatch(disconnectQueueRealtime());
    };
  }, [dispatch, userId]);

  // Degradation path only: while the push channel is healthy the board refreshes itself.
  useEffect(() => {
    if (!userId || realtimeConnected) return undefined;
    const timer = window.setInterval(() => void dispatch(fetchQueueBoard()), OFFLINE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [dispatch, realtimeConnected, userId]);

  useEffect(() => {
    if (!userId || !mineStale) return undefined;
    const timer = window.setInterval(() => void dispatch(fetchMyQueueStatus()), STALE_TICKET_POLL_MS);
    return () => window.clearInterval(timer);
  }, [dispatch, mineStale, userId]);

  const refresh = useCallback(() => Promise.allSettled([dispatch(fetchQueueBoard()), dispatch(fetchMyQueueStatus())]), [dispatch]);

  const summary = board?.summary ?? mine?.summary ?? null;
  const myTickets = new Set((mine?.entries ?? []).map((entry) => entry.ticket));
  const active = mine?.current ?? null;
  const isFirstLoad = (boardLoading || mineLoading) && !board && !mine;
  const refreshing = boardLoading || mineLoading;
  const next = summary?.nextWalkInWaitMinutes;
  const inService = active?.status === "STARTED";
  const soon = Boolean(active) && !inService && ((active.peopleAhead ?? 99) <= 1 || (active.waitMinutes ?? 99) <= SOON_MINUTES);

  // A gentle nudge the first time the customer's turn gets close.
  const nudged = useRef(false);
  useEffect(() => {
    if (soon && !nudged.current) {
      nudged.current = true;
      // Vibration needs a prior user gesture; skip it (and the console warning) on a cold load.
      if (navigator.userActivation?.hasBeenActive) haptic("warning");
      notify.info("Your turn is close", { description: "Head to the salon" });
    }
  }, [soon]);

  return (
    <UserLayout
      pageTitle="Live queue"
      actions={
        <>
          <span
            className={cn("hidden h-8 items-center gap-1.5 rounded-full px-3 text-caption font-semibold sm:inline-flex", realtimeConnected ? "bg-success/12 text-ink-success" : "bg-muted text-ink-neutral")}
          >
            {realtimeConnected ? <Wifi className="size-3.5" aria-hidden /> : <WifiOff className="size-3.5" aria-hidden />}
            {realtimeConnected ? "Live" : "Offline"}
          </span>
          <IconButton icon={RefreshCw} label="Refresh" disabled={refreshing} onClick={() => void refresh()} className={cn("hidden sm:inline-grid", refreshing && "[&_svg]:animate-spin")} />
        </>
      }
    >
      <PullToRefresh onRefresh={refresh}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 [&>*]:min-w-0">
          <div className="space-y-4 lg:col-span-7">
            {(boardError || mineError) && (board || mine) ? (
              <p role="alert" className="flex items-center gap-2 rounded-2xl bg-destructive/12 p-3 text-sm font-semibold text-ink-destructive">
                <AlertTriangle className="size-4 shrink-0" aria-hidden /> {boardError ?? mineError}
              </p>
            ) : null}

            <AnimatePresence>{soon ? <TurnSoonBanner key="soon" entry={active} /> : null}</AnimatePresence>

            {isFirstLoad ? (
              <SkeletonShimmer className="h-56 rounded-card" />
            ) : (boardError || mineError) && !board && !mine ? (
              <ErrorState title="Queue unavailable" onRetry={refresh} offline={typeof navigator !== "undefined" && navigator.onLine === false} />
            ) : active ? (
              <>
                <QueuePosition
                  position={active.positionInLane ?? active.salonPosition ?? 1}
                  peopleAhead={active.peopleAhead ?? 0}
                  waitMinutes={inService ? active.remainingMinutes : active.waitMinutes}
                  status={active.status}
                  ticket={active.ticket}
                />
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <Fact icon={Clock3} label={inService ? "Done by" : "Starts"} value={formatClockTime(inService ? active.expectedEndAt : active.expectedStartAt)} />
                  <Fact icon={Ticket} label="Salon spot" value={inService ? "In chair" : (active.salonPosition ?? "–")} />
                  <Fact icon={Scissors} label="Service" value={active.serviceName} />
                  <Fact icon={UserRound} label="Stylist" value={active.stylistName ?? "Pending"} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {active.delayMinutes > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/14 px-3 py-1.5 text-caption font-semibold text-ink-warning">
                      <Clock3 className="size-3.5" aria-hidden /> Running {formatWaitLabel(active.delayMinutes)} late
                    </span>
                  ) : null}
                  {active.needsAssignment ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/12 px-3 py-1.5 text-caption font-semibold text-ink-destructive">
                      <AlertTriangle className="size-3.5" aria-hidden /> Stylist pending
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-caption font-semibold text-ink-neutral">
                    <Info className="size-3.5" aria-hidden /> {QUEUE_CONFIDENCE_LABEL[summary?.confidence] ?? QUEUE_CONFIDENCE_LABEL.LOW}
                  </span>
                </div>
              </>
            ) : (
              <EmptyState
                illustration="queue"
                title="You're not in the queue"
                description={next === 0 ? "A stylist is free right now." : next != null ? `Next stylist free in about ${formatWaitLabel(next)}.` : undefined}
                action={
                  <Link to="/user-dashboard/appointments" className="inline-flex h-11 items-center gap-2 rounded-control bg-portal px-5 text-sm font-semibold text-portal-foreground shadow-soft">
                    <CalendarPlus className="size-4" aria-hidden /> Book now
                  </Link>
                }
              />
            )}

            {summary ? (
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={Users} label="Waiting" value={Number(summary.waitingCount ?? 0)} format={countFmt} />
                <StatCard icon={Scissors} label="In chair" value={Number(summary.inServiceCount ?? 0)} format={countFmt} tone="info" />
                <StatCard icon={Hourglass} label="Avg. wait" value={Number(summary.averageWaitMinutes ?? 0)} format={avgFmt} tone="neutral" />
                <StatCard icon={Zap} label="Next free" value={Number(next ?? 0)} format={waitFmt} tone="success" />
              </div>
            ) : null}
          </div>

          <section className="lg:col-span-5" aria-label="Live board">
            <SectionHeading icon={Users} title="Live board" />
            {board?.entries?.length ? (
              <LayoutGroup>
                <ol className="space-y-2">
                  <AnimatePresence initial={false}>
                    {board.entries.map((entry) => (
                      <BoardRow key={entry.ticket} entry={entry} isMine={myTickets.has(entry.ticket)} />
                    ))}
                  </AnimatePresence>
                </ol>
              </LayoutGroup>
            ) : isFirstLoad ? (
              <SkeletonList rows={4} label="Loading queue" />
            ) : (
              <EmptyState illustration="queue" title="No one waiting" compact />
            )}
            {board?.truncated ? (
              <p className="mt-3 text-caption text-ink-neutral">
                Showing {board.entries.length} of {board.totalEntries}
              </p>
            ) : null}
          </section>
        </div>
      </PullToRefresh>
    </UserLayout>
  );
}
