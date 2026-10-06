"use client";

import { Button } from "@/components/ui/button";
import { ScheduleBoard } from "@/receptionist/components/schedule-board";
import { useDelayAlerts } from "@/receptionist/hooks/use-delay-alerts";
import { useReceptionBootstrap } from "@/receptionist/hooks/use-reception-bootstrap";
import { useReceptionSession } from "@/receptionist/hooks/use-reception-session";
import { ReceptionLayout } from "@/receptionist/portal/reception-layout";
import { staffLogout } from "@/lib/staff-auth-client";
import { motion } from "motion/react";
import { LogOut } from "lucide-react";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/notify";
import { LoadingOrb } from "@/components/shared/loading-orb";

export default function ReceptionAppointmentsPage() {
  const navigate = useNavigate();
  const { loading, user } = useReceptionSession();
  const { bookings, loading: bookingsLoading, error, realtimeConnected } = useSelector(
    (state) => state.receptionBookings
  );
  useReceptionBootstrap({ enabled: Boolean(user) });
  const { isCriticalDelay } = useDelayAlerts(bookings);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  if (loading) {
    return (
      <LoadingOrb fullScreen label="Loading…" />
    );
  }

  if (!user) return null;

  return (
    <ReceptionLayout
      pageTitle="Today's schedule"
      pageSubtitle="All bookings for today, sorted by proximity"
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
        className="mx-auto max-w-4xl"
      >
        <ScheduleBoard bookings={bookings} isCriticalDelay={isCriticalDelay} loading={bookingsLoading} />
      </motion.div>
    </ReceptionLayout>
  );
}
