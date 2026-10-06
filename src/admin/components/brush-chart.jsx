"use client";
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { Area } from "@/components/charts/area";
import { ComposedChart } from "@/components/charts/composed-chart";
import { Grid } from "@/components/charts/grid";
import { Line } from "@/components/charts/line";
import { SeriesBar } from "@/components/charts/series-bar";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { cn } from "@/lib/utils";

const MIN_SPAN = 0.12;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const inr = (n) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;

/**
 * Bklit composed chart (daily collections as bars, net revenue after refunds as a line over a soft
 * area) with a brush strip underneath. Dragging the window or its handles (motion pan gestures)
 * zooms the chart to that date range. `data` = [{ date: Date, collected, net }] oldest first.
 */
export function BrushChart({ data, className }) {
  const stripRef = useRef(null);
  const [range, setRange] = useState([0, 1]);

  const visible = useMemo(() => {
    if (!data.length) return [];
    const from = Math.floor(range[0] * (data.length - 1));
    const to = Math.max(from + 2, Math.ceil(range[1] * (data.length - 1)) + 1);
    return data.slice(from, to);
  }, [data, range]);

  const totals = useMemo(() => visible.reduce((acc, d) => ({ collected: acc.collected + d.collected, net: acc.net + d.net }), { collected: 0, net: 0 }), [visible]);
  const strip = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.collected));
    return data.map((d, i) => ({ x: data.length === 1 ? 50 : (i / (data.length - 1)) * 100, h: (d.collected / max) * 100 }));
  }, [data]);

  function pan(kind, info) {
    const width = stripRef.current?.getBoundingClientRect().width || 1;
    const d = info.delta.x / width;
    setRange(([a, b]) => {
      if (kind === "move") {
        const span = b - a;
        const na = clamp(a + d, 0, 1 - span);
        return [na, na + span];
      }
      if (kind === "start") return [clamp(a + d, 0, b - MIN_SPAN), b];
      return [a, clamp(b + d, a + MIN_SPAN, 1)];
    });
  }

  if (data.length < 2) return null;
  const zoomed = range[0] > 0.001 || range[1] < 0.999;
  const fmt = (d) => d.date.toLocaleDateString([], { day: "numeric", month: "short" });

  return (
    <div className={cn("bklit-chart space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {fmt(visible[0])} – {fmt(visible[visible.length - 1])} · net
            </p>
            <p className="text-2xl font-bold tracking-tight">{inr(totals.net)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Collected</p>
            <p className="text-2xl font-bold tracking-tight text-muted-foreground">{inr(totals.collected)}</p>
          </div>
        </div>
        {zoomed ? (
          <button type="button" onClick={() => setRange([0, 1])} className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted">
            Reset zoom
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">Drag the window below to zoom</span>
        )}
      </div>

      <ComposedChart data={visible} xDataKey="date" aspectRatio="2.6 / 1" maxBarSize={28} barGap={0} margin={{ top: 16, right: 12, bottom: 28, left: 12 }}>
        <Grid horizontal />
        <Area dataKey="net" fill="var(--chart-2)" fillOpacity={0.22} />
        <SeriesBar dataKey="collected" fill="var(--chart-1)" radius={4} />
        <Line dataKey="net" stroke="var(--chart-2)" />
        <ChartTooltip showCrosshair={false} />
        <XAxis numTicks={6} />
      </ComposedChart>

      <div ref={stripRef} className="relative h-12 select-none overflow-hidden rounded-lg border bg-muted/30">
        <div className="absolute inset-x-0 bottom-0 top-1" aria-hidden>
          {strip.map((s, i) => (
            <span key={i} className="absolute bottom-0 w-[2px] -translate-x-1/2 rounded-t bg-primary/45" style={{ left: `${s.x}%`, height: `${Math.max(4, s.h)}%` }} />
          ))}
        </div>
        <div className="absolute inset-y-0 left-0 bg-background/70" style={{ width: `${range[0] * 100}%` }} />
        <div className="absolute inset-y-0 right-0 bg-background/70" style={{ width: `${(1 - range[1]) * 100}%` }} />
        <motion.div
          onPan={(_, info) => pan("move", info)}
          whileTap={{ backgroundColor: "hsl(var(--primary) / 0.14)" }}
          className="absolute inset-y-0 cursor-grab touch-none border-y-2 border-primary active:cursor-grabbing"
          style={{ left: `${range[0] * 100}%`, width: `${(range[1] - range[0]) * 100}%` }}
        />
        {["start", "end"].map((edge) => (
          <motion.span
            key={edge}
            onPan={(_, info) => pan(edge, info)}
            whileHover={{ scaleX: 1.3 }}
            whileTap={{ scaleX: 1.5 }}
            role="slider"
            aria-label={edge === "start" ? "Range start" : "Range end"}
            aria-valuenow={Math.round((edge === "start" ? range[0] : range[1]) * 100)}
            className={cn("absolute inset-y-0 grid w-3 cursor-ew-resize touch-none place-items-center bg-primary", edge === "start" ? "rounded-l-md" : "-translate-x-full rounded-r-md")}
            style={{ left: `${(edge === "start" ? range[0] : range[1]) * 100}%` }}
          >
            <span className="h-5 w-0.5 rounded-full bg-primary-foreground/80" />
          </motion.span>
        ))}
      </div>
    </div>
  );
}
