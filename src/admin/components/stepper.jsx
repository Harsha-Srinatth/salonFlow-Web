"use client";
import { motion, useReducedMotion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { haptic, interaction, spring } from "@/components/motion";

/** Number input with springy −/+ buttons (44px). Values are strings so a half-typed number is never clobbered. */
export function Stepper({ id, label, hint, value, onChange, min = 0, max, step = 1, prefix, suffix }) {
  const reduce = useReducedMotion();
  const n = Number(value);
  const clamp = (v) => Math.min(max ?? Infinity, Math.max(min, v));
  const bump = (delta) => {
    haptic("tap");
    onChange(`${clamp((Number.isFinite(n) ? n : 0) + delta)}`);
  };
  const btn = "grid size-11 shrink-0 place-items-center rounded-xl text-ink-neutral transition-colors hover:bg-muted hover:text-foreground";
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-caption font-semibold text-ink-neutral">
        {label}
      </label>
      <div className="flex items-center rounded-control bg-card p-1 ring-1 ring-inset ring-border focus-within:ring-2 focus-within:ring-portal">
        <motion.button type="button" whileTap={reduce ? undefined : interaction.press} transition={spring.snappy} aria-label={`Decrease ${label}`} onClick={() => bump(-step)} className={btn}>
          <Minus className="size-4" aria-hidden />
        </motion.button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          {prefix ? <span className="text-sm text-ink-neutral">{prefix}</span> : null}
          <input id={id} type="number" inputMode="decimal" min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} className="w-20 bg-transparent text-center font-display text-lg font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
          {suffix ? <span className="text-sm text-ink-neutral">{suffix}</span> : null}
        </div>
        <motion.button type="button" whileTap={reduce ? undefined : interaction.press} transition={spring.snappy} aria-label={`Increase ${label}`} onClick={() => bump(step)} className={btn}>
          <Plus className="size-4" aria-hidden />
        </motion.button>
      </div>
      {hint ? <p className="text-caption text-ink-neutral">{hint}</p> : null}
    </div>
  );
}
