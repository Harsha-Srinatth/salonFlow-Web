import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/components/motion/presets";

/**
 * Add/remove control for a cart item: a round "+" that turns into a filled check. Acts as a
 * checkbox for assistive tech. The state flips instantly; only a short press feedback animates.
 * @param {{ added: boolean, onChange: (next:boolean)=>void, label: string, size?: "sm"|"md", showText?: boolean, className?: string }} props
 */
export function UserCartToggle({ added, onChange, label, size = "md", showText = false, className }) {
  const dim = size === "sm" ? "h-9 min-w-9" : "h-11 min-w-11";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={added}
      aria-label={added ? `Remove ${label}` : `Add ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        haptic(added ? "tap" : "success");
        onChange(!added);
      }}
      className={cn(
        "tap relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-0 text-sm font-semibold transition-colors duration-100 active:scale-95",
        dim,
        showText && "px-3.5",
        added ? "bg-portal text-portal-foreground" : "bg-card text-portal shadow-soft ring-1 ring-inset ring-portal/40",
        className
      )}
    >
      {added ? <Check className="size-5" strokeWidth={3} aria-hidden /> : <Plus className="size-5" strokeWidth={2.6} aria-hidden />}
      {showText ? <span>{added ? "Added" : "Add"}</span> : null}
    </button>
  );
}
