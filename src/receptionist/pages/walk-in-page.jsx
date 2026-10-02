"use client";

import { Button } from "@/components/ui/button";
import { WalkInBookingForm } from "@/receptionist/components/walk-in-booking-form";
import { useReceptionBootstrap } from "@/receptionist/hooks/use-reception-bootstrap";
import { useReceptionSession } from "@/receptionist/hooks/use-reception-session";
import { ReceptionLayout } from "@/receptionist/portal/reception-layout";
import { staffLogout } from "@/lib/staff-auth-client";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { LoadingOrb } from "@/components/shared/loading-orb";

export default function ReceptionWalkInPage() {
  const navigate = useNavigate();
  const { loading, user } = useReceptionSession();
  const { realtimeConnected } = useSelector((state) => state.receptionBookings);
  useReceptionBootstrap({ enabled: Boolean(user) });

  if (loading) {
    return (
      <LoadingOrb fullScreen label="Loading walk-in booking…" />
    );
  }

  if (!user) return null;

  return (
    <ReceptionLayout
      pageTitle="Walk-in booking"
      pageSubtitle="Register customer, choose services, assign slot and stylist"
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
        className="mx-auto max-w-6xl"
      >
        <WalkInBookingForm layout="page" />
      </motion.div>
    </ReceptionLayout>
  );
}
