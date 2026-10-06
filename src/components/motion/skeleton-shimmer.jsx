import { cn } from "@/lib/utils";

/**
 * Base shimmer block. Size it with classes (h-4 w-32, size-12 rounded-full …).
 * The layouts below match real kit components so content doesn't jump when it arrives.
 */
export function SkeletonShimmer({ className, ...rest }) {
  return <div aria-hidden className={cn("kit-shimmer rounded-xl", className)} {...rest} />;
}

/** Wrapper that announces loading once for a group of skeletons. */
function SkeletonGroup({ label = "Loading", className, children }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <SkeletonGroup className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonShimmer key={i} className={cn("h-3.5", i === lines - 1 ? "w-3/5" : "w-full")} />
      ))}
    </SkeletonGroup>
  );
}

/** Matches <StatCard>. */
export function SkeletonStat({ className }) {
  return (
    <SkeletonGroup className={cn("rounded-card border border-border/60 bg-card p-4", className)}>
      <div className="flex items-center gap-3">
        <SkeletonShimmer className="size-10 rounded-2xl" />
        <SkeletonShimmer className="h-3 w-20" />
      </div>
      <SkeletonShimmer className="mt-4 h-7 w-28" />
      <SkeletonShimmer className="mt-3 h-8 w-full rounded-lg" />
    </SkeletonGroup>
  );
}

/** Matches a booking/list card: avatar, two lines, trailing chip. */
export function SkeletonListItem({ className }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3", className)}>
      <SkeletonShimmer className="size-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonShimmer className="h-3.5 w-2/5" />
        <SkeletonShimmer className="h-3 w-3/5" />
      </div>
      <SkeletonShimmer className="h-6 w-20 rounded-full" />
    </div>
  );
}

export function SkeletonList({ rows = 4, className, label }) {
  return (
    <SkeletonGroup label={label} className={cn("space-y-2.5", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </SkeletonGroup>
  );
}

/** Matches a media card (service/offer). */
export function SkeletonCard({ className }) {
  return (
    <SkeletonGroup className={cn("overflow-hidden rounded-card border border-border/60 bg-card", className)}>
      <SkeletonShimmer className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <SkeletonShimmer className="h-4 w-3/5" />
        <SkeletonShimmer className="h-3 w-2/5" />
        <div className="flex justify-between pt-2">
          <SkeletonShimmer className="h-5 w-16" />
          <SkeletonShimmer className="h-9 w-24 rounded-control" />
        </div>
      </div>
    </SkeletonGroup>
  );
}

/** Matches <ResponsiveTable> rows on desktop. */
export function SkeletonTable({ rows = 5, cols = 4, className }) {
  return (
    <SkeletonGroup className={cn("overflow-hidden rounded-card border border-border/60 bg-card", className)}>
      <div className="flex gap-4 border-b border-border/60 px-4 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <SkeletonShimmer key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }, (_, c) => (
            <SkeletonShimmer key={c} className={cn("h-3.5 flex-1", c === 0 && "max-w-40")} />
          ))}
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** Matches DateStrip + TimeSlotPicker while slots load. */
export function SkeletonSlots({ className }) {
  return (
    <SkeletonGroup label="Loading times" className={cn("space-y-4", className)}>
      <SkeletonShimmer className="h-3 w-24" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 9 }, (_, i) => (
          <SkeletonShimmer key={i} className="h-12 rounded-control" />
        ))}
      </div>
    </SkeletonGroup>
  );
}
