"use client";
import { BrandLoader, BrandDots } from "@/components/kit/brand-loader";
import { cn } from "@/lib/utils";

/** Shared loading indicator: the thinking orb with a small caption underneath. */
export function LoadingOrb({ label = "Loading…", size = 64, fullScreen = false, compact = false, className }) {
  return (
    <BrandLoader
      label={label}
      size={size >= 64 ? "lg" : size >= 32 ? "md" : "sm"}
      fullScreen={fullScreen}
      className={cn(!fullScreen && (compact ? "min-h-40 py-6" : "min-h-[40vh] p-6"), className)}
    />
  );
}

/** 20px orb for buttons and inline text. Inherits currentColor. */
export function InlineOrb({ className }) {
  return (
    <span role="status" className={cn("inline-flex shrink-0 items-center", className)}>
      <BrandDots />
      <span className="sr-only">Loading</span>
    </span>
  );
}
