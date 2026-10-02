"use client";
import { LoadingOrb } from "@/components/shared/loading-orb";

export function EmployeeLoadingScreen({ message = "Loading your shift…" }) {
  return <LoadingOrb fullScreen label={message} />;
}
