"use client";
import { SkeletonCard, SkeletonList } from "@/components/motion";
import { cn } from "@/lib/utils";

/** Shimmer placeholders shaped like the admin's list rows and card grids. */
export function SkeletonRows({ count = 4, className }) {
  return <SkeletonList rows={count} className={className} />;
}

export function SkeletonCards({ count = 6, className }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
