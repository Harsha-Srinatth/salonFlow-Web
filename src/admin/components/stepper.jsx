"use client";
import { motion } from "motion/react";
import { Minus, Plus } from "lucide-react";

/** Number input with animated +/- buttons. Values are strings so a half-typed number is never clobbered. */
export function Stepper({ id, label, hint, value, onChange, min = 0, max, step = 1, prefix, suffix }) {
  const n = Number(value);
  const clamp = (v) => Math.min(max ?? Infinity, Math.max(min, v));
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center rounded-xl border bg-background p-1">
        <motion.button type="button" whileTap={{ scale: 0.88 }} aria-label={`Decrease ${label}`} onClick={() => onChange(`${clamp((Number.isFinite(n) ? n : 0) - step)}`)} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
          <Minus className="size-4" />
        </motion.button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          {prefix ? <span className="text-sm text-muted-foreground">{prefix}</span> : null}
          <input id={id} type="number" inputMode="decimal" min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} className="w-16 bg-transparent text-center text-lg font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
          {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
        </div>
        <motion.button type="button" whileTap={{ scale: 0.88 }} aria-label={`Increase ${label}`} onClick={() => onChange(`${clamp((Number.isFinite(n) ? n : 0) + step)}`)} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
          <Plus className="size-4" />
        </motion.button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
