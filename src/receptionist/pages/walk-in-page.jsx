"use client";

import { BrandLoader } from "@/components/kit";
import { WalkInWizard } from "@/receptionist/components/walk-in-wizard";
import { useReceptionBootstrap } from "@/receptionist/hooks/use-reception-bootstrap";
import { useReceptionSession } from "@/receptionist/hooks/use-reception-session";
import { ReceptionLayout } from "@/receptionist/portal/reception-layout";
import { useSelector } from "react-redux";

export default function ReceptionWalkInPage() {
  const { loading, user } = useReceptionSession();
  const { realtimeConnected } = useSelector((state) => state.receptionBookings);
  useReceptionBootstrap({ enabled: Boolean(user) });

  if (loading) return <BrandLoader className="py-24" label="Loading walk-in…" />;
  if (!user) return null;

  return (
    <ReceptionLayout pageTitle="Walk-in" pageSubtitle="Customer · services · time · pay" realtimeConnected={realtimeConnected} user={user} hideFab>
      <WalkInWizard />
    </ReceptionLayout>
  );
}
