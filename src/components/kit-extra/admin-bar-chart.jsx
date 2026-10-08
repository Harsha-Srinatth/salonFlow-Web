import { useParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";

const NARROW = 420;

/** Merge neighbouring bars so a phone shows ≤ `max` columns. */
function bin(data, max, aggregate) {
  if (data.length <= max) return data;
  const size = Math.ceil(data.length / max);
  const out = [];
  for (let i = 0; i < data.length; i += size) {
    const group = data.slice(i, i + size);
    const total = group.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    out.push({
      key: group.map((d) => d.key).join("+"),
      label: group.length > 1 ? `${group[0].label}–${group[group.length - 1].label}` : group[0].label,
      tick: group[0].tick ?? group[0].label,
      value: aggregate === "avg" ? total / group.length : total,
      highlight: group.some((d) => d.highlight),
      current: group.some((d) => d.current),
    });
  }
  return out;
}

/**
 * Admin bar chart (visx scales). Bars render at full height straight away (no grow-in). Hover, tap or arrow keys show a
 * tooltip; there is also a screen-reader list of every value. Below 420px wide, neighbouring bars
 * are merged (sum or avg) and ticks thin out, so it stays readable at 360px.
 *
 * Colours: portal accent for bars, a stronger accent for `highlight` (peaks) and a ring for
 * `current` (e.g. this hour). No gold, in either theme.
 *
 * @param {{ data: { key: string, label: string, tick?: string, value: number, highlight?: boolean, current?: boolean, hint?: string }[],
 *   format?: (n:number)=>string, height?: number, ariaLabel: string, aggregate?: "sum"|"avg", mobileMaxBars?: number,
 *   tickEvery?: number, className?: string }} props
 */
export function AdminBarChart({ data = [], format = (n) => `${Math.round(n)}`, height = 160, ariaLabel, aggregate = "sum", mobileMaxBars = 12, tickEvery, className }) {
  const reduce = useReducedMotion();
  const tipId = useId();
  const { parentRef, width } = useParentSize({ debounceTime: 80 });
  const [active, setActive] = useState(null);
  const narrow = width > 0 && width < NARROW;
  const bars = useMemo(() => (narrow ? bin(data, mobileMaxBars, aggregate) : data), [data, narrow, mobileMaxBars, aggregate]);
  const axisH = 20;
  const innerH = Math.max(40, height - axisH);

  const x = useMemo(() => scaleBand({ domain: bars.map((d) => d.key), range: [0, Math.max(1, width)], padding: narrow ? 0.28 : 0.22 }), [bars, width, narrow]);
  const max = Math.max(1, ...bars.map((d) => Number(d.value) || 0));
  const y = useMemo(() => scaleLinear({ domain: [0, max], range: [innerH, 6], nice: true }), [max, innerH]);
  const every = tickEvery ?? Math.max(1, Math.ceil(bars.length / (narrow ? 4 : 8)));
  const current = active != null ? bars[active] : null;

  const onKeyDown = (e) => {
    if (!bars.length) return;
    const map = { ArrowRight: 1, ArrowLeft: -1 };
    if (e.key in map) {
      e.preventDefault();
      setActive((i) => Math.min(bars.length - 1, Math.max(0, (i ?? -1) + map[e.key])));
    } else if (e.key === "Escape") setActive(null);
  };

  return (
    <div className={cn("relative w-full select-none", className)}>
      <div
        ref={parentRef}
        role="group"
        tabIndex={0}
        aria-label={`${ariaLabel}. Use the arrow keys to read each bar.`}
        aria-describedby={current ? tipId : undefined}
        onKeyDown={onKeyDown}
        onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
        onBlur={() => setActive(null)}
        className="relative rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-portal"
        style={{ height }}
      >
        {width > 0 ? (
          <svg width={width} height={height} className="block overflow-visible text-ink-neutral" aria-hidden>
            {/* Baseline + two quiet guides */}
            {[0.5, 1].map((t) => (
              <line key={t} x1={0} x2={width} y1={y(max * t)} y2={y(max * t)} stroke="hsl(var(--border))" strokeDasharray="3 5" strokeWidth={1} />
            ))}
            <line x1={0} x2={width} y1={innerH} y2={innerH} stroke="hsl(var(--border))" strokeWidth={1} />
            {bars.map((d, i) => {
              const bx = x(d.key) ?? 0;
              const bw = x.bandwidth();
              const value = Number(d.value) || 0;
              const top = value > 0 ? Math.min(y(value), innerH - 3) : innerH - 2;
              const on = active === i;
              const fill = d.highlight ? "hsl(var(--portal-accent))" : value > 0 ? "hsl(var(--portal-accent) / 0.45)" : "hsl(var(--muted))";
              return (
                <g key={d.key}>
                  <rect
                    x={bx}
                    y={top}
                    width={bw}
                    height={innerH - top}
                    rx={Math.min(6, bw / 2)}
                    fill={fill}
                    stroke={d.current ? "hsl(var(--foreground) / 0.55)" : "none"}
                    strokeWidth={d.current ? 1.5 : 0}
                    opacity={on || active == null ? 1 : 0.55}
                    className="transition-opacity duration-200"
                  />
                  {/* Full-height hit area: easy to tap on a phone. */}
                  <rect x={bx - (x.step() - bw) / 2} y={0} width={x.step()} height={innerH} fill="transparent" onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)} onPointerDown={() => setActive((cur) => (cur === i ? null : i))} />
                  {i % every === 0 ? (
                    <text x={bx + bw / 2} y={height - 4} textAnchor="middle" className="fill-current text-[10px] font-medium">
                      {d.tick ?? d.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        ) : null}

        <AnimatePresence>
          {current && width > 0 ? (
            <motion.div
              key="tip"
              id={tipId}
              role="status"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring.snappy}
              className="glass-strong pointer-events-none absolute top-0 z-raised min-w-28 -translate-x-1/2 rounded-xl px-3 py-2 text-caption shadow-float"
              style={{ left: Math.min(Math.max((x(current.key) ?? 0) + x.bandwidth() / 2, 60), width - 60) }}
            >
              <span className="block font-semibold text-ink-neutral">{current.label}</span>
              <span className="block font-display text-base font-bold tabular-nums text-foreground">{format(Number(current.value) || 0)}</span>
              {current.hint ? <span className="block text-ink-neutral">{current.hint}</span> : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <ul className="sr-only">
        {bars.map((d) => (
          <li key={d.key}>
            {d.label}: {format(Number(d.value) || 0)}
          </li>
        ))}
      </ul>
    </div>
  );
}
