import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { haptic, spring } from "@/components/motion/presets";

/**
 * One-time-code input: per-digit boxes that pop as you type, auto-advance, backspace goes back,
 * paste fills all, SMS autofill via autocomplete="one-time-code". Calls onComplete when full.
 * @param {{ value: string, onChange: (v:string)=>void, onComplete?: (v:string)=>void, length?: number,
 *   error?: boolean|string, success?: boolean, disabled?: boolean, autoFocus?: boolean, label?: string }} props
 */
export function OtpInput({ value = "", onChange, onComplete, length = 6, error, success = false, disabled = false, autoFocus = true, label = "Verification code", className }) {
  const reduce = useReducedMotion();
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus && !disabled) refs.current[Math.min(value.length, length - 1)]?.focus();
  }, []);

  const setAt = (i, chars) => {
    const clean = chars.replace(/\D/g, "");
    if (!clean) return;
    const next = (value.slice(0, i) + clean + value.slice(i + clean.length)).slice(0, length);
    onChange?.(next);
    haptic("tap");
    const focusIdx = Math.min(i + clean.length, length - 1);
    refs.current[focusIdx]?.focus();
    if (next.length === length && !next.includes(" ")) onComplete?.(next);
  };

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        role="group"
        aria-label={label}
        animate={error && !reduce ? { x: [0, -8, 7, -4, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.42 }}
        className="flex justify-center gap-2 sm:gap-2.5"
      >
        {digits.map((d, i) => (
          <motion.input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={i === 0 ? length : 1}
            aria-label={`Digit ${i + 1} of ${length}`}
            disabled={disabled}
            value={d}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setAt(i, e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              setAt(0, e.clipboardData.getData("text"));
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                e.preventDefault();
                if (d) onChange?.(value.slice(0, i) + value.slice(i + 1));
                else if (i > 0) {
                  onChange?.(value.slice(0, i - 1) + value.slice(i));
                  refs.current[i - 1]?.focus();
                }
              } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              else if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
            }}
            animate={d && !reduce ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={success && !reduce ? { ...spring.bouncy, delay: i * 0.05 } : spring.bouncy}
            className={cn(
              "h-14 w-11 rounded-2xl bg-card text-center font-display text-2xl font-bold tabular-nums caret-portal outline-none ring-1 ring-inset transition-[box-shadow,background-color] sm:h-15 sm:w-12",
              error ? "ring-destructive/70 text-ink-destructive" : success ? "bg-success/12 text-ink-success ring-success/60" : d ? "ring-portal/60" : "ring-border",
              "focus:ring-2 focus:ring-portal focus:shadow-[0_0_0_4px_hsl(var(--portal-accent)/0.14)]",
              "disabled:opacity-50"
            )}
          />
        ))}
      </motion.div>
      {typeof error === "string" && error ? (
        <p role="alert" className="mt-2 text-center text-caption font-medium text-ink-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
