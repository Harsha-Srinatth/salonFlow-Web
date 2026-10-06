"use client";

import { Button } from "@/components/ui/button";
import { AppointmentQueueBoard } from "@/employee/components/appointment-queue-board";
import { EmployeeLoadingScreen } from "@/employee/components/employee-loading-screen";
import { ShiftStatStrip } from "@/employee/components/shift-stat-strip";
import { useEmployeeQueue } from "@/employee/hooks/use-employee-queue";
import { useEmployeeSession } from "@/employee/hooks/use-employee-session";
import { computeShiftMetrics } from "@/employee/lib/queue-utils";
import { EmployeeLayout } from "@/employee/portal/employee-layout";
import { staffLogout } from "@/lib/staff-auth-client";
import { motion } from "motion/react";
import { LogOut } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function EmployeeAppointmentsPage() {
  const navigate = useNavigate();
  const { loading, user } = useEmployeeSession();
  const { cards, queueLoading, mutatingId, nowMs, realtimeConnected, startBooking, completeBooking } =
    useEmployeeQueue({ user, enabled: Boolean(user) });

  const metrics = useMemo(
    () => computeShiftMetrics(cards.map((c) => c.booking), nowMs),
    [cards, nowMs]
  );

  useEffect(() => {
    if (window.location.hash !== "#active") return;
    const timer = window.setTimeout(() => {
      document.getElementById("active")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [queueLoading, cards.length]);

  if (loading) return <EmployeeLoadingScreen message="Loading appointments…" />;

  if (!user) return null;

  return (
    <EmployeeLayout
      pageTitle="Appointments"
      pageSubtitle="Start services, track timers, and complete bookings"
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
        <ShiftStatStrip metrics={metrics} />
        <AppointmentQueueBoard
          cards={cards}
          loading={queueLoading}
          mutatingId={mutatingId}
          onStart={startBooking}
          onComplete={completeBooking}
        />
      </motion.div>
    </EmployeeLayout>
  );
}
