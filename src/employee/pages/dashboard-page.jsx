"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentQueueBoard } from "@/employee/components/appointment-queue-board";
import { EmployeeLoadingScreen } from "@/employee/components/employee-loading-screen";
import { ShiftStatStrip } from "@/employee/components/shift-stat-strip";
import { useEmployeeQueue } from "@/employee/hooks/use-employee-queue";
import { useEmployeeSession } from "@/employee/hooks/use-employee-session";
import { computeShiftMetrics, formatBookingTime } from "@/employee/lib/queue-utils";
import { EmployeeLayout } from "@/employee/portal/employee-layout";
import { staffLogout } from "@/lib/staff-auth-client";
import { motion } from "motion/react";
import { ArrowRight, Calendar, LogOut, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const { loading, user } = useEmployeeSession();
  const { cards, queueLoading, mutatingId, nowMs, realtimeConnected, startBooking, completeBooking } =
    useEmployeeQueue({ user, enabled: Boolean(user) });

  const metrics = useMemo(
    () => computeShiftMetrics(cards.map((c) => c.booking), nowMs),
    [cards, nowMs]
  );

  if (loading) return <EmployeeLoadingScreen />;

  if (!user) return null;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <EmployeeLayout
      pageTitle="My shift"
      pageSubtitle={`${greeting}, ${user.name}`}
      realtimeConnected={realtimeConnected}
      actions={
        <Button
          variant="destructive"
          className="gap-2"
          onClick={async () => {
            await staffLogout();
            navigate("/auth/login", { replace: true });
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-8"
      >
        {metrics.nextUp ? (
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="size-3.5" />
                  Next client
                </p>
                <p className="font-serif text-xl font-bold">{metrics.nextUp.booking.customer}</p>
                <p className="text-sm text-muted-foreground">
                  {metrics.nextUp.booking.service} · {formatBookingTime(metrics.nextUp.booking.startsAt)}
                </p>
              </div>
              <Button asChild className="gap-2 shrink-0">
                <Link to="/employee-dashboard/appointments">
                  View queue
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : metrics.inService > 0 ? (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">You have {metrics.inService} active service{metrics.inService === 1 ? "" : "s"}</p>
                <p className="text-sm text-muted-foreground">Complete or track timers from your appointments.</p>
              </div>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/employee-dashboard/appointments#active">
                  Go to active
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <ShiftStatStrip metrics={metrics} />

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-bold">Today's queue</h2>
              <p className="text-sm text-muted-foreground">Your assigned appointments update live</p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/employee-dashboard/appointments">
                <Calendar className="size-4" />
                Full schedule
              </Link>
            </Button>
          </div>
          <AppointmentQueueBoard
            cards={cards}
            loading={queueLoading}
            mutatingId={mutatingId}
            onStart={startBooking}
            onComplete={completeBooking}
            compact
          />
        </section>
      </motion.div>
    </EmployeeLayout>
  );
}
