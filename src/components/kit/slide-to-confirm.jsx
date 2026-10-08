import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Check, ChevronsRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { haptic, spring } from "@/components/motion/presets";
import { BrandDots } from "./brand-loader";

const TONES = {
  primary: { track: "bg-portal/10", fill: "bg-portal", thumb: "bg-portal text-portal-foreground", text: "text-portal" },
  danger: { track: "bg-destructive/10", fill: "bg-destructive", thumb: "bg-destructive text-destructive-foreground", text: "text-ink-destructive" },
  gold: { track: "bg-gold/14", fill: "bg-gold", thumb: "bg-gold text-gold-foreground", text: "text-ink-warning" },
};
const THUMB = 52;
const PAD = 4;

/**
 * Deliberate confirmation for destructive and payment-collect actions (contract item c).
 * mode="slide": drag the thumb to the end (keyboard: focus the thumb, press Enter, or use arrow keys).
 * mode="hold": press and hold (pointer, Space or Enter) for `holdMs`.
 * onConfirm may return a promise: the thumb shows a loader, then a check.
 * @param {{ label?: string, confirmedLabel?: string, onConfirm: ()=>any, tone?: keyof TONES, icon?: any,
 *   mode?: "slide"|"hold", holdMs?: number, disabled?: boolean, resetAfter?: number|null, className?: string }} props
 */
export function SlideToConfirm({ label = "Slide to confirm", confirmedLabel = "Confirmed", onConfirm, tone = "primary", icon: Icon = ChevronsRight, mode = "slide", holdMs = 1200, disabled = false, resetAfter = 1800, className }) {
  const reduce = useReducedMotion();
  const trackRef = useRef(null);
  const [max, setMax] = useState(240);
  const [state, setState] = useState("idle"); // idle | loading | done
  const x = useMotionValue(0);
  const hold = useMotionValue(0);
  const t = TONES[tone] ?? TONES.primary;
  const progress = useTransform(mode === "slide" ? x : hold, (v) => (mode === "slide" ? (max ? v / max : 0) : v));
  const fillScale = useTransform(progress, (p) => (mode === "slide" ? (p * max + THUMB + PAD) / (max + THUMB + PAD * 2) : p));
  const labelOpacity = useTransform(progress, [0, 0.6], [1, 0]);
  const holdTween = useRef(null);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const measure = () => setMax(Math.max(0, el.clientWidth - THUMB - PAD * 2));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    animate(x, 0, spring.soft);
    animate(hold, 0, { duration: 0.3 });
  }, [x, hold]);

  const complete = useCallback(async () => {
    if (state !== "idle") return;
    haptic("success");
    setState("loading");
    animate(x, max, spring.snappy);
    animate(hold, 1, { duration: 0.15 });
    try {
      await onConfirm?.();
      if (!alive.current) return;
      setState("done");
      if (resetAfter != null) setTimeout(() => alive.current && reset(), resetAfter);
    } catch {
      if (!alive.current) return;
      haptic("error");
      reset();
    }
  }, [state, max, x, hold, onConfirm, resetAfter, reset]);

  const startHold = () => {
    if (disabled || state !== "idle") return;
    holdTween.current = animate(hold, 1, { duration: holdMs / 1000, ease: [0.4, 0, 0.6, 1], onComplete: complete });
  };
  const cancelHold = () => {
    if (state !== "idle") return;
    holdTween.current?.stop();
    animate(hold, 0, { duration: 0.25 });
  };

  const thumbContent =
    state === "loading" ? <BrandDots size={5} /> : state === "done" ? <Check className="size-5" strokeWidth={3} aria-hidden /> : <Icon className="size-5" aria-hidden />;
  const statusText = state === "done" ? confirmedLabel : label;

  return (
    <div
      ref={trackRef}
      className={cn("relative isolate h-15 w-full touch-none select-none overflow-hidden rounded-full ring-1 ring-inset ring-border/60", t.track, disabled && "opacity-50", className)}
      onPointerDown={mode === "hold" ? startHold : undefined}
      onPointerUp={mode === "hold" ? cancelHold : undefined}
      onPointerLeave={mode === "hold" ? cancelHold : undefined}
      onPointerCancel={mode === "hold" ? cancelHold : undefined}
      onContextMenu={(e) => mode === "hold" && e.preventDefault()}
    >
      <motion.div aria-hidden className={cn("absolute inset-0 origin-left rounded-full opacity-90", t.fill)} style={{ scaleX: fillScale }} />
      <motion.span
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 grid place-items-center pl-12 text-sm font-semibold", state === "idle" ? t.text : "text-white")}
        style={{ opacity: state === "idle" ? labelOpacity : 1 }}
      >
        <span className={cn(state === "idle" && !reduce && "shine shine-auto rounded-full px-2")}>{mode === "hold" && state === "idle" ? label.replace(/^slide/i, "Hold") : statusText}</span>
      </motion.span>
      <motion.button
        type="button"
        role={mode === "slide" ? "slider" : undefined}
        aria-label={mode === "slide" ? `${label}. Press Enter to confirm.` : `${label}. Press and hold Space or Enter.`}
        aria-valuemin={mode === "slide" ? 0 : undefined}
        aria-valuemax={mode === "slide" ? 100 : undefined}
        aria-valuenow={mode === "slide" ? (state === "idle" ? 0 : 100) : undefined}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        drag={mode === "slide" && state === "idle" && !disabled ? "x" : false}
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0.04}
        dragMomentum={false}
        onDragEnd={() => {
          if (x.get() >= max * 0.88) void complete();
          else animate(x, 0, spring.bouncy);
        }}
        onKeyDown={(e) => {
          if (disabled || state !== "idle" || e.repeat) return;
          if (mode === "hold" && (e.key === " " || e.key === "Enter")) {
            e.preventDefault();
            startHold();
          } else if (mode === "slide" && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            void complete();
          } else if (mode === "slide" && e.key === "ArrowRight") {
            const next = Math.min(max, x.get() + max / 4);
            animate(x, next, spring.snappy);
            if (next >= max) void complete();
          } else if (mode === "slide" && e.key === "ArrowLeft") {
            animate(x, Math.max(0, x.get() - max / 4), spring.snappy);
          }
        }}
        onKeyUp={(e) => mode === "hold" && (e.key === " " || e.key === "Enter") && cancelHold()}
        className={cn("absolute top-1 left-1 z-[1] grid size-13 cursor-grab place-items-center rounded-full shadow-lift active:cursor-grabbing", t.thumb)}
        style={{ x: mode === "slide" ? x : undefined }}
      >
        {thumbContent}
      </motion.button>
      <span className="sr-only" aria-live="polite">
        {state === "done" ? confirmedLabel : ""}
      </span>
    </div>
  );
}
