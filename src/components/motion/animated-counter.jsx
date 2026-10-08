import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { ease } from "./presets";

const defaultFormat = (n) => Math.round(n).toLocaleString("en-IN");

/**
 * Shows `value` straight away and animates briefly between later values (a total updating, a
 * wallet balance changing). It never counts up from zero on mount, so revisiting a tab doesn't
 * replay the numbers. Writes textContent directly (no re-render per frame).
 * Pass `format` for currency: format={formatMoney}. `from` is accepted for older call sites.
 * @param {{ value: number, from?: number, duration?: number, format?: (n:number)=>string, className?: string }} props
 */
// eslint-disable-next-line no-unused-vars
export function AnimatedCounter({ value, from, duration = 0.35, format = defaultFormat, className, ...rest }) {
  const ref = useRef(null);
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const last = useRef(target);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || last.current === target) return undefined;
    if (reduce) {
      el.textContent = format(target);
      last.current = target;
      return undefined;
    }
    const controls = animate(last.current, target, {
      duration: Math.min(duration, 0.5),
      ease: ease.outExpo,
      onUpdate: (n) => {
        el.textContent = format(n);
      },
    });
    last.current = target;
    return () => controls.stop();
  }, [target, reduce, duration, format]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums lining-nums" }} aria-label={format(target)} {...rest}>
      {format(last.current)}
    </span>
  );
}
