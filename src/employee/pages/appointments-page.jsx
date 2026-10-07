"use client";

import { AnimatedTabBar, EmptyState, ErrorState, IconButton, PullToRefresh } from "@/components/kit";
import { SkeletonList } from "@/components/motion";
import { AppointmentCard } from "@/employee/components/appointment-card";
import { EmployeeLoadingScreen } from "@/employee/components/employee-loading-screen";
import { CompletionCelebration } from "@/employee/components/service-actions";
import { useEmployeeQueue } from "@/employee/hooks/use-employee-queue";
import { useEmployeeSession } from "@/employee/hooks/use-employee-session";
import { groupEmployeeQueue } from "@/employee/lib/queue-utils";
import { EmployeeLayout } from "@/employee/portal/employee-layout";
import { Hourglass, Layers, RefreshCw, Scissors } from "lucide-react";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function EmployeeAppointmentsPage() {
  const { loading, user } = useEmployeeSession();
  const { queue, cards, queueLoading, queueError, realtimeConnected, loadQueue, startBooking, completeBooking } = useEmployeeQueue({
    user,
    enabled: Boolean(user),
  });
  const { waiting, active } = useMemo(() => groupEmployeeQueue(cards), [cards]);
  // "#active" (old quick-action links) opens on the in-service filter.
  const [filter, setFilter] = useState(() => (window.location.hash === "#active" ? "active" : "all"));
  const [burst, setBurst] = useState(0);
  const onCompleted = useCallback(() => {
    setBurst((n) => n + 1);
    window.setTimeout(() => setBurst(0), 1500);
  }, []);

  useEffect(() => {
    if (window.location.hash !== "#active") return undefined;
    const timer = window.setTimeout(() => document.getElementById("active")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    return () => window.clearTimeout(timer);
  }, [queueLoading, cards.length]);

  if (loading) return <EmployeeLoadingScreen message="Loading bookings…" />;
  if (!user) return null;

  const tabs = [
    { value: "all", label: "All", icon: Layers, badge: active.length + waiting.length },
    { value: "active", label: "In service", icon: Scissors, badge: active.length },
    { value: "waiting", label: "Up next", icon: Hourglass, badge: waiting.length },
  ];
  const shown = filter === "active" ? active : filter === "waiting" ? waiting : [...active, ...waiting];

  return (
    <EmployeeLayout pageTitle="Bookings" pageSubtitle="Start · track · complete" realtimeConnected={realtimeConnected} user={user}>
      <PullToRefresh onRefresh={loadQueue}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AnimatedTabBar items={tabs} value={filter} onChange={setFilter} label="Filter bookings" className="min-w-0 flex-1 sm:flex-none" />
            <span className="hidden flex-1 sm:block" />
            <IconButton icon={RefreshCw} label="Refresh" variant="outline" onClick={() => void loadQueue()} />
          </div>

          <div id="active" className="scroll-mt-[calc(var(--topbar-h)+1rem)]">
            {queueLoading && !queue.length ? (
              <SkeletonList rows={3} label="Loading bookings" />
            ) : queueError && !queue.length ? (
              <ErrorState title="Couldn't load bookings" description={queueError} onRetry={loadQueue} />
            ) : !shown.length ? (
              <EmptyState
                illustration={filter === "active" ? "sparkle" : "calendar"}
                title={filter === "active" ? "No active service" : "Nothing assigned"}
                description={filter === "active" ? "Start your next client when ready." : "Reception assignments appear here live."}
              />
            ) : (
              <LayoutGroup id="stylist-bookings">
                <div className="grid items-start gap-3 lg:grid-cols-2">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {shown.map((card, i) => (
                      <AppointmentCard
                        key={card.booking.id}
                        card={card}
                        onStart={startBooking}
                        onComplete={completeBooking}
                        onCompleted={onCompleted}
                        highlight={i === 0}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </LayoutGroup>
            )}
          </div>
        </div>
      </PullToRefresh>
      <CompletionCelebration burstKey={burst} />
    </EmployeeLayout>
  );
}
