"use client";
import { StatusChip, TONE_CLASSES } from "@/components/kit";
import { cn } from "@/lib/utils";

/**
 * A chip for admin-only labels that are NOT lifecycle statuses (feedback type, live-floor timing,
 * VIP, Razorpay mode). Same shape and inks as <StatusChip>; real statuses must use StatusChip.
 * @param {{ tone?: keyof TONE_CLASSES, icon?: any, children: React.ReactNode, size?: "sm"|"md", className?: string }} props
 */
export function ToneChip({ tone = "neutral", icon: Icon, size = "md", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset",
        size === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-xs",
        TONE_CLASSES[tone] ?? TONE_CLASSES.neutral,
        className
      )}
    >
      {Icon ? <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden strokeWidth={2.4} /> : null}
      {children}
    </span>
  );
}

export { StatusChip };
