import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { ease } from "./presets";

const defaultFormat = (n) => Math.round(n).toLocaleString("en-IN");

/**
 * Counts up to `value` when first visible, then animates between later values. Writes textContent
 * directly (no re-render per frame). Pass `format` for currency: format={formatMoney}.
 * @param {{ value: number, from?: number, duration?: number, format?: (n:number)=>string, className?: string }} props
 */
export function AnimatedCounter({ value, from = 0, duration = 1.1, format = defaultFormat, className, ...rest }) {
  const ref = useRef(null);
  const last = useRef(from);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return undefined;
    if (reduce) {
      el.textContent = format(target);
      last.current = target;
      return undefined;
    }
    const controls = animate(last.current, target, {
      duration,
      ease: ease.outExpo,
      onUpdate: (n) => {
        el.textContent = format(n);
      },
    });
    last.current = target;
    return () => controls.stop();
  }, [target, inView, reduce, duration, format]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums lining-nums" }} aria-label={format(target)} {...rest}>
      {format(from)}
    </span>
  );
}
