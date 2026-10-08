"use client";
import { BrandLoader } from "@/components/kit";

export function EmployeeLoadingScreen({ message = "Loading your shift…" }) {
  return <BrandLoader fullScreen label={message} />;
}
