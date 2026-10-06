"use client";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Press and hold to confirm (after React Bits' Hold Button, via atom-v3). A fill sweeps across while
 * held; letting go early drains it and nothing happens. For irreversible actions where one click is
 * too easy. Works with the keyboard too: hold Space or Enter.
 */
export function HoldButton({ children, holdingLabel = "Keep holding…", onConfirm, duration = 1200, disabled, busy, className }) {
  const reduce = useReducedMotion();
  const controls = useAnimationControls();
  const timer = useRef(null);
  const [holding, setHolding] = useState(false);

  const start = () => {
    if (disabled || busy || timer.current) return;
    setHolding(true);
    controls.start({ scaleX: 1, transition: { duration: duration / 1000, ease: reduce ? "linear" : [0.4, 0, 0.6, 1] } });
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onConfirm?.();
    }, duration);
  };
  const cancel = () => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
    controls.start({ scaleX: 0, transition: { duration: 0.25, ease: "easeOut" } });
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") cancel();
      }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={typeof children === "string" ? `${children} (press and hold)` : undefined}
      className={cn("relative isolate inline-flex h-9 select-none items-center justify-center gap-2 overflow-hidden rounded-md px-4 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50", className)}
    >
      <motion.span aria-hidden initial={{ scaleX: 0 }} animate={controls} className="absolute inset-0 -z-[1] origin-left bg-black/25" />
      <span className="relative">{busy ? children : holding ? holdingLabel : children}</span>
    </button>
  );
}
