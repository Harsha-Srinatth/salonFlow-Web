"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Clock3,
  Hourglass,
  RefreshCw,
  Scissors,
  Ticket,
  Users,
  Wifi,
  WifiOff,
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
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/10 text-success",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        </div>
        {Icon ? (
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", toneClasses[tone])}>
            <Icon className="size-5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MyTicketCard({ entry, confidence }) {
  const isInService = entry.status === "STARTED";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-6 sm:p-8">
      <div className="absolute -right-20 -top-20 size-40 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative z-10 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
            <Ticket className="size-4" />
            {entry.ticket}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
              isInService ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            )}
          >
            {isInService ? "In service" : "Waiting"}
          </span>
          {entry.needsAssignment ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
              <AlertTriangle className="size-3.5" />
              Awaiting stylist assignment
            </span>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {isInService ? "Estimated time remaining" : "Estimated wait"}
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
            {formatWaitLabel(isInService ? entry.remainingMinutes : entry.waitMinutes)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isInService
              ? `Expected to finish around ${formatClockTime(entry.expectedEndAt)}`
              : `You should be seated around ${formatClockTime(entry.expectedStartAt)}`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ahead of you</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {isInService ? "—" : entry.peopleAhead}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Salon position</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {isInService ? "—" : (entry.salonPosition ?? "—")}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Service</p>
            <p className="mt-1 truncate text-lg font-semibold">{entry.serviceName}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Stylist</p>
            <p className="mt-1 truncate text-lg font-semibold">{entry.stylistName ?? "To be assigned"}</p>
          </div>
        </div>

        {entry.delayMinutes > 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
            <Clock3 className="size-4 shrink-0" />
            Running about {formatWaitLabel(entry.delayMinutes)} behind the {formatClockTime(entry.scheduledStartAt)} slot.
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {QUEUE_CONFIDENCE_LABEL[confidence] ?? QUEUE_CONFIDENCE_LABEL.LOW}
        </p>
      </div>
    </div>
  );
}

function QueueBoardRow({ entry, isMine }) {
  const isInService = entry.status === "STARTED";
  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
        isMine ? "border-primary bg-primary/5" : "border-border/70 bg-card"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
            isInService ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          )}
        >
          {isInService ? "•" : (entry.salonPosition ?? "—")}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {entry.ticket}
            {isMine ? <span className="ml-2 text-xs font-medium text-primary">You</span> : null}
          </p>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <Scissors className="size-3 shrink-0" />
            {entry.serviceName}
            {entry.stylistName ? ` · ${entry.stylistName}` : ""}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">
          {isInService ? formatWaitLabel(entry.remainingMinutes) : formatWaitLabel(entry.waitMinutes)}
        </p>
        <p className="text-xs text-muted-foreground">
          {isInService ? "left in chair" : formatClockTime(entry.expectedStartAt)}
        </p>
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

  return (
    <UserLayout
      pageTitle="Live Queue"
      actions={
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            void dispatch(fetchQueueBoard());
            void dispatch(fetchMyQueueStatus());
          }}
          disabled={boardLoading || mineLoading}
        >
          <RefreshCw className={cn("size-4", (boardLoading || mineLoading) && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
              realtimeConnected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            )}
          >
            {realtimeConnected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {realtimeConnected ? "Live" : "Reconnecting"}
          </span>
          {board?.generatedAt ? <span>Updated {formatClockTime(board.generatedAt)}</span> : null}
        </div>

        {boardError || mineError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {boardError ?? mineError}
          </div>
        ) : null}

        {isFirstLoad ? (
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-2xl bg-muted/50" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted/50" />
              ))}
            </div>
          </div>
        ) : null}

        {!isFirstLoad && activeEntry ? (
          <MyTicketCard entry={activeEntry} confidence={summary?.confidence} />
        ) : null}

        {!isFirstLoad && !activeEntry ? (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Ticket className="size-5 text-primary" />
                You&apos;re not in today&apos;s queue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {summary?.nextWalkInWaitMinutes === 0
                  ? "A stylist is free right now — book and walk straight in."
                  : summary?.nextWalkInWaitMinutes != null
                    ? `The next stylist frees up in about ${formatWaitLabel(summary.nextWalkInWaitMinutes)}.`
                    : "Book an appointment to get a ticket and a live wait time."}
              </p>
              <Button asChild>
                <Link to="/user-dashboard/appointments">Book an appointment</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {summary ? (
          <div>
            <h3 className="mb-4 text-xl font-semibold">Salon right now</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile icon={Users} label="Waiting" value={summary.waitingCount} />
              <StatTile icon={Scissors} label="In service" value={summary.inServiceCount} tone="accent" />
              <StatTile
                icon={Hourglass}
                label="Average wait"
                value={summary.averageWaitMinutes ? formatWaitLabel(summary.averageWaitMinutes) : "No wait"}
                tone="neutral"
              />
              <StatTile
                icon={Clock3}
                label="Next free stylist"
                value={
                  summary.nextWalkInWaitMinutes == null ? "—" : formatWaitLabel(summary.nextWalkInWaitMinutes)
                }
                tone="success"
              />
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">Live board</h3>
              <p className="text-sm text-muted-foreground">
                Everyone is shown by ticket code — no personal details are published here.
              </p>
            </div>
          </div>
          {board?.entries?.length ? (
            <ul className="space-y-2">
              {board.entries.map((entry) => (
                <QueueBoardRow key={entry.ticket} entry={entry} isMine={myTickets.has(entry.ticket)} />
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              {isFirstLoad ? "Loading the queue…" : "No one is waiting right now."}
            </div>
          )}
          {board?.truncated ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing the next {board.entries.length} of {board.totalEntries} appointments.
            </p>
          ) : null}
        </div>
      </div>
    </UserLayout>
  );
}
