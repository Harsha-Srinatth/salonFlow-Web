"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  QUEUE_CONFIDENCE_LABEL,
  formatClockTime,
  formatWaitLabel,
} from "@/lib/queue-utils";
import {
  connectQueueRealtime,
  disconnectQueueRealtime,
  fetchMyQueueStatus,
  fetchQueueBoard,
} from "@/store/queue-slice";
import {
  AlertTriangle,
  CalendarPlus,
  Clock3,
  Hourglass,
  Info,
  RefreshCw,
  Scissors,
  Ticket,
  User,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { UserLayout } from "../portal/user-layout";

/** Fallback poll cadence used only while the websocket is down. */
const OFFLINE_POLL_MS = 30000;
/** Top-up cadence for a ticket that sits beyond the capped public board. */
const STALE_TICKET_POLL_MS = 60000;

function StatTile({ icon: Icon, label, value, tone = "primary" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tones[tone])}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl font-bold tabular-nums">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/** One dot per person in front of you, then you — readable at a glance. */
function QueueDots({ ahead }) {
  const shown = Math.min(ahead, 8);
  return (
    <div className="flex items-center gap-1.5" aria-label={`${ahead} ahead of you`}>
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className="size-3 rounded-full bg-primary-foreground/35" />
      ))}
      {ahead > shown ? <span className="text-xs font-semibold opacity-80">+{ahead - shown}</span> : null}
      <span className="grid size-6 place-items-center rounded-full bg-card text-primary">
        <User className="size-3.5" />
      </span>
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-2xl bg-primary-foreground/10 p-3">
      <p className="flex items-center gap-1.5 text-xs opacity-80">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-0.5 truncate text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function MyTicketCard({ entry, confidence }) {
  const inService = entry.status === "STARTED";
  const minutes = inService ? entry.remainingMinutes : entry.waitMinutes;
  return (
    <section className="rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-bold text-primary">
          <Ticket className="size-4" />
          {entry.ticket}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-semibold">
          {inService ? <Scissors className="size-3.5" /> : <Hourglass className="size-3.5" />}
          {inService ? "In service" : "Waiting"}
        </span>
        {entry.needsAssignment ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-white">
            <AlertTriangle className="size-3.5" />
            Stylist pending
          </span>
        ) : null}
        <span className="ml-auto" title={QUEUE_CONFIDENCE_LABEL[confidence] ?? QUEUE_CONFIDENCE_LABEL.LOW}>
          <Info className="size-4 opacity-70" />
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm opacity-80">{inService ? "Done in about" : "Your turn in about"}</p>
          <p className="font-display text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">{formatWaitLabel(minutes)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm opacity-90">
            <Clock3 className="size-4" />
            {inService ? formatClockTime(entry.expectedEndAt) : formatClockTime(entry.expectedStartAt)}
          </p>
        </div>
        {!inService ? <QueueDots ahead={entry.peopleAhead ?? 0} /> : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact icon={Users} label="Ahead" value={inService ? "-" : entry.peopleAhead} />
        <Fact icon={Hourglass} label="Position" value={inService ? "-" : (entry.salonPosition ?? "-")} />
        <Fact icon={Scissors} label="Service" value={entry.serviceName} />
        <Fact icon={User} label="Stylist" value={entry.stylistName ?? "Pending"} />
      </div>

      {entry.delayMinutes > 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-primary-foreground/10 px-3 py-2 text-sm">
          <Clock3 className="size-4 shrink-0" />
          Running {formatWaitLabel(entry.delayMinutes)} late
        </p>
      ) : null}
    </section>
  );
}

function QueueBoardRow({ entry, isMine }) {
  const inService = entry.status === "STARTED";
  return (
    <li className={cn("flex items-center gap-3 rounded-2xl p-3", isMine ? "bg-primary/10 ring-2 ring-primary" : "bg-card")}>
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold tabular-nums",
          inService ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
        )}
      >
        {inService ? <Scissors className="size-4" /> : (entry.salonPosition ?? "-")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {entry.ticket}
          {isMine ? <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">YOU</span> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {entry.serviceName}
          {entry.stylistName ? ` · ${entry.stylistName}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">
          {formatWaitLabel(inService ? entry.remainingMinutes : entry.waitMinutes)}
        </p>
        <p className="text-xs text-muted-foreground">{inService ? "left" : formatClockTime(entry.expectedStartAt)}</p>
      </div>
    </li>
  );
}

export default function UserQueuePage() {
  const dispatch = useDispatch();
  const { appUser } = useAuth();
  const { board, boardLoading, boardError, mine, mineLoading, mineError, mineStale, realtimeConnected } =
    useSelector((state) => state.queue);

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

  // Degradation path only: while the push channel is healthy the board refreshes
  // itself and this never runs, so a connected client makes no repeat requests.
  useEffect(() => {
    if (!userId || realtimeConnected) return undefined;
    const timer = window.setInterval(() => {
      void dispatch(fetchQueueBoard());
    }, OFFLINE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [dispatch, realtimeConnected, userId]);

  useEffect(() => {
    if (!userId || !mineStale) return undefined;
    const timer = window.setInterval(() => {
      void dispatch(fetchMyQueueStatus());
    }, STALE_TICKET_POLL_MS);
    return () => window.clearInterval(timer);
  }, [dispatch, mineStale, userId]);

  const summary = board?.summary ?? mine?.summary ?? null;
  const myEntries = mine?.entries ?? [];
  const activeEntry = mine?.current ?? null;
  const myTickets = new Set(myEntries.map((entry) => entry.ticket));
  const isFirstLoad = (boardLoading || mineLoading) && !board && !mine;
  const refreshing = boardLoading || mineLoading;

  const next = summary?.nextWalkInWaitMinutes;

  return (
    <UserLayout
      pageTitle="Live Queue"
      actions={
        <>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
              realtimeConnected ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            )}
          >
            {realtimeConnected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {realtimeConnected ? "Live" : "Offline"}
          </span>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Refresh"
            className="rounded-full"
            disabled={refreshing}
            onClick={() => {
              void dispatch(fetchQueueBoard());
              void dispatch(fetchMyQueueStatus());
            }}
          >
            <RefreshCw className={cn(refreshing && "animate-spin")} />
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {boardError || mineError ? (
          <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 p-4 text-sm font-medium text-destructive">
            <AlertTriangle className="size-5 shrink-0" />
            {boardError ?? mineError}
          </div>
        ) : null}

        {isFirstLoad ? <Skeleton className="h-64 rounded-3xl" /> : null}

        {!isFirstLoad && activeEntry ? <MyTicketCard entry={activeEntry} confidence={summary?.confidence} /> : null}

        {!isFirstLoad && !activeEntry ? (
          <EmptyState
            icon={Ticket}
            title="You're not in the queue"
            description={
              next === 0
                ? "A stylist is free right now."
                : next != null
                  ? `Next stylist free in about ${formatWaitLabel(next)}.`
                  : undefined
            }
            action={
              <Button asChild className="h-11 rounded-full px-6">
                <Link to="/user-dashboard/appointments">
                  <CalendarPlus /> Book now
                </Link>
              </Button>
            }
          />
        ) : null}

        {summary ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={Users} label="Waiting" value={summary.waitingCount} />
            <StatTile icon={Scissors} label="In service" value={summary.inServiceCount} tone="accent" />
            <StatTile
              icon={Hourglass}
              label="Avg. wait"
              value={summary.averageWaitMinutes ? formatWaitLabel(summary.averageWaitMinutes) : "None"}
              tone="neutral"
            />
            <StatTile icon={Zap} label="Next free" value={next == null ? "-" : formatWaitLabel(next)} tone="success" />
          </div>
        ) : null}

        <div>
          <h2 className="mb-3 font-display text-xl font-semibold">Live board</h2>
          {board?.entries?.length ? (
            <ul className="space-y-2">
              {board.entries.map((entry) => (
                <QueueBoardRow key={entry.ticket} entry={entry} isMine={myTickets.has(entry.ticket)} />
              ))}
            </ul>
          ) : isFirstLoad ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} title="No one waiting" className="py-8" />
          )}
          {board?.truncated ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {board.entries.length} of {board.totalEntries}
            </p>
          ) : null}
        </div>
      </div>
    </UserLayout>
  );
}
