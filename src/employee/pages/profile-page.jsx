"use client";

import { StaffProfileCard } from "@/components/kit-extra/staff-profile-card";
import { EmployeeLoadingScreen } from "@/employee/components/employee-loading-screen";
import { useEmployeeSession } from "@/employee/hooks/use-employee-session";
import { EmployeeLayout, EmployeeSignOutButton } from "@/employee/portal/employee-layout";
import { Scissors } from "lucide-react";

export default function EmployeeProfilePage() {
  const { loading, user } = useEmployeeSession();

  if (loading) return <EmployeeLoadingScreen message="Loading profile…" />;
  if (!user) return null;

  return (
    <EmployeeLayout pageTitle="Profile" pageSubtitle="Your stylist account" user={user}>
      <StaffProfileCard user={user} roleLabel="Stylist" roleIcon={Scissors} signOut={<EmployeeSignOutButton />} />
    </EmployeeLayout>
  );
}
