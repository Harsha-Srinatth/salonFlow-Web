"use client";

import { Button } from "@/components/ui/button";
import { LiveOpsBoard } from "@/receptionist/components/live-ops-board";
import { OpsStatStrip } from "@/receptionist/components/ops-stat-strip";
import { PaymentPanel } from "@/receptionist/components/payment-panel";
import { StylistAvailabilityStrip } from "@/receptionist/components/stylist-availability-strip";
import { useDelayAlerts } from "@/receptionist/hooks/use-delay-alerts";
import { useReceptionBootstrap } from "@/receptionist/hooks/use-reception-bootstrap";
import { useReceptionSession } from "@/receptionist/hooks/use-reception-session";
import { computeOpsMetrics } from "@/receptionist/lib/booking-utils";
import { ReceptionLayout } from "@/receptionist/portal/reception-layout";
import { staffLogout } from "@/lib/staff-auth-client";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

export default function ReceptionDashboardPage() {
  const navigate = useNavigate();
  const { loading, user } = useReceptionSession();
  const { bookings, queue, stylists, realtimeConnected } = useSelector((state) => state.receptionBookings);
  useReceptionBootstrap({ enabled: Boolean(user) });
  const alertBookings = useMemo(() => {
    const seen = new Set();
    return [...bookings, ...queue].filter((booking) => {
      if (!booking?.id || seen.has(booking.id)) return false;
      seen.add(booking.id);
      return true;
    });
  }, [bookings, queue]);
  const { isCriticalDelay } = useDelayAlerts(alertBookings);
  const metrics = useMemo(() => computeOpsMetrics(bookings, queue), [bookings, queue]);

  useEffect(() => {
    if (window.location.hash !== "#collect-payment") return;
    const timer = window.setTimeout(() => {
      document.getElementById("collect-payment")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <div className="mx-auto size-10 animate-pulse rounded-full bg-muted" />
          <p className="text-sm text-muted-foreground">Loading command center…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <ReceptionLayout
      pageTitle="Command Center"
      pageSubtitle={`Welcome back, ${user.name}`}
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
        <section id="collect-payment" className="scroll-mt-24">
          <PaymentPanel />
        </section>

        <OpsStatStrip metrics={metrics} />

        <StylistAvailabilityStrip stylists={stylists} queue={queue} />

        <section className="space-y-4">
          <div>
            <h2 className="font-serif text-xl font-bold">Live operations</h2>
            <p className="text-sm text-muted-foreground">Today&apos;s queue — upcoming and in service</p>
          </div>
          <LiveOpsBoard isCriticalDelay={isCriticalDelay} />
        </section>
      </motion.div>
    </ReceptionLayout>
  );
}
