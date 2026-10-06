"use client";
import { BrandLoader, BrandDots } from "@/components/kit/brand-loader";
import { cn } from "@/lib/utils";

/**
 * Legacy name kept so every existing call site keeps working; renders the design-kit BrandLoader.
 * `state` (from the old thinking-orb) is accepted and ignored. New code: use BrandLoader directly.
 */
export function LoadingOrb({ label = "Loading…", size = 64, fullScreen = false, compact = false, className }) {
  return (
    <BrandLoader
      label={label}
      size={size >= 96 ? "xl" : size >= 64 ? "lg" : size >= 40 ? "md" : "sm"}
      fullScreen={fullScreen}
      className={cn(!fullScreen && (compact ? "min-h-40 py-6" : "min-h-[40vh] p-6"), className)}
    />
  );
}

/** Inline loader for buttons and text (was a 20px orb). Inherits currentColor. */
export function InlineOrb({ className }) {
  return (
    <span role="status" className={cn("inline-flex shrink-0 items-center", className)}>
      <BrandDots size={5} />
      <span className="sr-only">Loading</span>
    </span>
  );
}
