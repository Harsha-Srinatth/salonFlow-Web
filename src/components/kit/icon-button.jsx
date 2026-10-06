import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { interaction } from "@/components/motion/presets";

const VARIANTS = {
  ghost: "text-foreground hover:bg-muted",
  soft: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  solid: "bg-portal text-portal-foreground shadow-soft hover:shadow-glow",
  outline: "border border-border bg-card/60 text-foreground hover:bg-muted",
  glass: "glass-surface text-foreground",
  danger: "bg-destructive/12 text-ink-destructive hover:bg-destructive/20",
};
const SIZES = { sm: "size-9 rounded-xl [&_svg]:size-4", md: "size-11 rounded-2xl [&_svg]:size-5", lg: "size-13 rounded-2xl [&_svg]:size-6" };

/**
 * Icon-only button. `label` is required (it becomes aria-label and the tooltip). md = 44px target;
 * sm keeps a 44px hit area through the `tap` utility.
 * @param {{ icon: any, label: string, variant?: keyof VARIANTS, size?: "sm"|"md"|"lg", badge?: number|string|boolean, active?: boolean }} props
 */
export function IconButton({ icon: Icon, label, variant = "ghost", size = "md", badge, active, className, type = "button", ...rest }) {
  const reduce = useReducedMotion();
  if (import.meta.env.DEV && !label) console.warn("IconButton: `label` is required for accessibility.");
  return (
    <motion.button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active ?? undefined}
      whileTap={reduce ? undefined : interaction.press}
      className={cn(
        "relative inline-grid shrink-0 place-items-center transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "tap",
        VARIANTS[variant] ?? VARIANTS.ghost,
        SIZES[size] ?? SIZES.md,
        active && "bg-portal/12 text-portal",
        className
      )}
      {...rest}
    >
      {Icon ? <Icon aria-hidden /> : null}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.125rem] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-[1.125rem] text-destructive-foreground ring-2 ring-background" aria-hidden>
          {badge === true ? "" : badge}
        </span>
      ) : null}
    </motion.button>
  );
}
