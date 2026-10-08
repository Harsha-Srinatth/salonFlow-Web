"use client";

import { BrandLoader } from "@/components/kit";
import { StaffProfileCard } from "@/components/kit-extra/staff-profile-card";
import { useReceptionSession } from "@/receptionist/hooks/use-reception-session";
import { ReceptionLayout, ReceptionSignOutButton } from "@/receptionist/portal/reception-layout";
import { ConciergeBell } from "lucide-react";

export default function ReceptionProfilePage() {
  const { loading, user } = useReceptionSession();

  if (loading) return <BrandLoader className="py-24" label="Loading profile…" />;
  if (!user) return null;

  return (
    <ReceptionLayout pageTitle="Profile" pageSubtitle="Your desk account" user={user} hideFab>
      <StaffProfileCard user={user} roleLabel="Receptionist" roleIcon={ConciergeBell} signOut={<ReceptionSignOutButton />} />
    </ReceptionLayout>
  );
}
