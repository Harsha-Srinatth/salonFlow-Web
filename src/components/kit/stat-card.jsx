import { motion, useReducedMotion } from "motion/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import { interaction, spring } from "@/components/motion/presets";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { SkeletonStat } from "@/components/motion/skeleton-shimmer";
import { TONE_CLASSES } from "./status-meta";

/** Tiny line chart that draws in on scroll. `data` is an array of numbers. */
export function Sparkline({ data = [], width = 120, height = 36, tone = "hsl(var(--portal-accent))", className }) {
  const reduce = useReducedMotion();
  const gid = useId();
  const { line, area } = useMemo(() => {
    if (data.length < 2) return { line: "", area: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)]);
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    return { line: d, area: `${d} L${width} ${height} L0 ${height} Z` };
  }, [data, width, height]);
  if (!line) return null;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={cn("h-9 w-full overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.28" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill={`url(#${gid})`} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }} />
      <motion.path d={line} fill="none" stroke={tone} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: reduce ? 1 : 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
    </svg>
  );
}

/**
 * KPI card: icon tile, label, animated value, optional delta and sparkline. Clickable when onClick/href.
 * @param {{ icon?: any, label: string, value: number, format?: (n:number)=>string, delta?: number, deltaLabel?: string,
 *   trend?: number[], tone?: keyof TONE_CLASSES, loading?: boolean, onClick?: ()=>void, className?: string }} props
 */
export function StatCard({ icon: Icon, label, value, format, delta, deltaLabel = "vs last week", trend, tone = "primary", loading = false, onClick, className }) {
  const reduce = useReducedMotion();
  if (loading) return <SkeletonStat className={className} />;
  const up = (delta ?? 0) >= 0;
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      whileHover={reduce ? undefined : interaction.cardHover}
      whileTap={onClick && !reduce ? interaction.press : undefined}
      transition={spring.soft}
      className={cn("relative flex w-full flex-col overflow-hidden rounded-card border border-border/60 bg-card p-4 text-left shadow-soft transition-shadow hover:shadow-lift", className)}
    >
      <div className="flex items-center gap-3">
        {Icon ? (
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl ring-1 ring-inset", TONE_CLASSES[tone] ?? TONE_CLASSES.primary)}>
            <Icon className="size-5" aria-hidden />
          </span>
        ) : null}
        <span className="truncate text-caption font-semibold text-ink-neutral">{label}</span>
      </div>
      <AnimatedCounter value={value} format={format} className="mt-3 font-display text-[1.75rem] leading-none font-bold tracking-tight" />
      {delta != null ? (
        <span className={cn("mt-2 inline-flex items-center gap-1 text-caption font-semibold", up ? "text-ink-success" : "text-ink-destructive")}>
          {up ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
          {up ? "+" : ""}
          {delta}% <span className="font-normal text-ink-neutral">{deltaLabel}</span>
        </span>
      ) : null}
      {trend?.length > 1 ? <Sparkline data={trend} className="mt-3" /> : null}
    </Comp>
  );
}
