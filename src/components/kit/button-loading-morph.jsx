import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { haptic, interaction, spring } from "@/components/motion/presets";
import { BrandDots } from "./brand-loader";
import { useRipple } from "./ripple";

export const BUTTON_VARIANTS = {
  primary: "bg-portal text-portal-foreground shadow-soft hover:shadow-glow",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-border bg-card/60 text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  danger: "bg-destructive text-destructive-foreground shadow-soft",
  gold: "bg-gold text-gold-foreground shadow-soft",
};
export const BUTTON_SIZES = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-5 text-sm gap-2 rounded-control",
  lg: "h-13 px-7 text-base gap-2.5 rounded-control",
};

const STATE_TONE = { success: "bg-success! text-success-foreground!", error: "bg-destructive! text-destructive-foreground!" };

/**
 * Async action button: label → springy dots → drawn checkmark (or a shake + retry icon on error).
 * All layers share one grid cell so the width never jumps. Pair with useAsyncAction().
 * @param {{ state?: "idle"|"loading"|"success"|"error", icon?: any, variant?: keyof BUTTON_VARIANTS, size?: "sm"|"md"|"lg",
 *   loadingLabel?: string, successLabel?: string, errorLabel?: string, fullWidth?: boolean }} props
 */
export function ButtonLoadingMorph({
  state = "idle",
  icon: Icon,
  children,
  loadingLabel = "Working…",
  successLabel = "Done",
  errorLabel = "Try again",
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled,
  className,
  type = "button",
  onPointerDown,
  ...rest
}) {
  const reduce = useReducedMotion();
  const { handlers, ripples } = useRipple();
  const busy = state === "loading";
  const layer = (s) => ({
    initial: false,
    animate: state === s ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.9 },
    transition: spring.snappy,
    "aria-hidden": state !== s,
    className: "col-start-1 row-start-1 inline-flex items-center justify-center gap-2",
  });

  return (
    <motion.button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      whileTap={disabled || busy || reduce ? undefined : interaction.press}
      animate={state === "error" && !reduce ? { x: [0, -6, 5, -3, 2, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      onPointerDown={(e) => {
        handlers.onPointerDown(e);
        onPointerDown?.(e);
      }}
      className={cn(
        "relative isolate inline-grid select-none place-items-center overflow-hidden font-semibold transition-[background-color,box-shadow,color] duration-300 disabled:cursor-not-allowed disabled:opacity-55",
        BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary,
        BUTTON_SIZES[size] ?? BUTTON_SIZES.md,
        STATE_TONE[state],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {ripples}
      <motion.span {...layer("idle")}>
        {Icon ? <Icon className="size-[1.1em] shrink-0" aria-hidden /> : null}
        {children}
      </motion.span>
      <motion.span {...layer("loading")}>
        <BrandDots />
        <span className="sr-only">{loadingLabel}</span>
      </motion.span>
      <motion.span {...layer("success")}>
        <svg viewBox="0 0 24 24" className="size-[1.25em]" aria-hidden>
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ pathLength: state === "success" ? 1 : 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} />
        </svg>
        {successLabel}
      </motion.span>
      <motion.span {...layer("error")}>
        <RotateCcw className="size-[1.1em]" aria-hidden />
        {errorLabel}
      </motion.span>
      <span className="sr-only" aria-live="polite">
        {state === "success" ? successLabel : state === "error" ? errorLabel : ""}
      </span>
    </motion.button>
  );
}

/**
 * Drives a ButtonLoadingMorph: `run(fn)` → loading → success (auto-resets) | error (auto-resets).
 * Returns the result of fn, or undefined if it threw (the error goes to onError).
 */
export function useAsyncAction({ successMs = 1400, errorMs = 1800, onError } = {}) {
  const [state, setState] = useState("idle");
  const timer = useRef(null);
  const alive = useRef(true);
  useEffect(() => () => {
    alive.current = false;
    clearTimeout(timer.current);
  }, []);
  const run = useCallback(
    async (fn) => {
      clearTimeout(timer.current);
      setState("loading");
      try {
        const result = await fn();
        if (!alive.current) return result;
        setState("success");
        haptic("success");
        timer.current = setTimeout(() => alive.current && setState("idle"), successMs);
        return result;
      } catch (error) {
        if (alive.current) {
          setState("error");
          haptic("error");
          timer.current = setTimeout(() => alive.current && setState("idle"), errorMs);
        }
        onError?.(error);
        return undefined;
      }
    },
    [successMs, errorMs, onError]
  );
  return { state, run, setState };
}

