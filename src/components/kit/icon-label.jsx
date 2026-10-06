import { cn } from "@/lib/utils";
import { TONE_CLASSES } from "./status-meta";

/**
 * Icon in a soft tile + a short label (and optional sub-label). The default way to show a fact.
 * @param {{ icon: any, label: React.ReactNode, sub?: React.ReactNode, tone?: keyof TONE_CLASSES, layout?: "row"|"stack", size?: "sm"|"md" }} props
 */
export function IconLabel({ icon: Icon, label, sub, tone = "primary", layout = "row", size = "md", className }) {
  const tile = size === "sm" ? "size-8 rounded-xl [&_svg]:size-4" : "size-10 rounded-2xl [&_svg]:size-5";
  return (
    <div className={cn("flex min-w-0 gap-3", layout === "stack" ? "flex-col items-center text-center" : "items-center", className)}>
      <span className={cn("grid shrink-0 place-items-center ring-1 ring-inset", TONE_CLASSES[tone] ?? TONE_CLASSES.primary, tile)}>{Icon ? <Icon aria-hidden /> : null}</span>
      <span className="min-w-0">
        <span className={cn("block truncate font-semibold", size === "sm" ? "text-caption" : "text-sm")}>{label}</span>
        {sub ? <span className="block truncate text-caption text-ink-neutral">{sub}</span> : null}
      </span>
    </div>
  );
}
