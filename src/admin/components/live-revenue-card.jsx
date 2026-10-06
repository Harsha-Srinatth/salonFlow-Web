"use client";
import { motion } from "motion/react";
import { Activity, Flame, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveLine } from "@/components/charts/live-line";
import { LiveLineChart } from "@/components/charts/live-line-chart";
import { LiveXAxis } from "@/components/charts/live-x-axis";
import { LiveYAxis } from "@/components/charts/live-y-axis";
import { apiJson } from "@/lib/api-json";
import { cn } from "@/lib/utils";

const POLL_MS = 10_000;
const WINDOWS = [
  { label: "1h", seconds: 3600 },
  { label: "4h", seconds: 4 * 3600 },
  { label: "12h", seconds: 12 * 3600 },
];
const inr = (n) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;
const hourLabel = (h) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
const hourLong = (h) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;

/**
 * Live salon revenue for the admin dashboard: today's running net revenue on a sliding live chart
 * (refreshed every 10 s) plus an hour-by-hour average that shows the peak hours.
 */
export function LiveRevenueCard() {
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState("");
  const [windowSeconds, setWindowSeconds] = useState(WINDOWS[1].seconds);
  const [paused, setPaused] = useState(false);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const skew = useRef(0);

  const load = useCallback(async (signal) => {
    try {
      const data = await apiJson("/api/admin/reports/revenue-live", { auth: true, signal });
      skew.current = data.now - Math.floor(Date.now() / 1000);
      setFeed(data);
      setError("");
    } catch (err) {
      if (!err.cancelled) setError(err.message);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = setInterval(() => !document.hidden && void load(controller.signal), POLL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => setNowSec(Math.floor(Date.now() / 1000) + skew.current), 1000);
    return () => clearInterval(tick);
  }, []);

  const total = feed?.todayTotal ?? 0;

  // Revenue only changes when a payment lands, so draw it as steps: hold the previous value right
  // up to each payment, then jump. The final point keeps the line running to "now".
  const data = useMemo(() => {
    const points = [];
    let previous = 0;
    for (const point of feed?.today ?? []) {
      points.push({ time: point.time - 1, value: previous }, point);
      previous = point.value;
    }
    const start = (points[0]?.time ?? nowSec) - 60;
    return [{ time: Math.min(start, nowSec - windowSeconds), value: 0 }, ...points, { time: nowSec, value: previous }].sort((a, b) => a.time - b.time);
  }, [feed, nowSec, windowSeconds]);

  const hourly = feed?.hourly ?? [];
  const maxAvg = Math.max(1, ...hourly.map((h) => h.avgNet));
  const peaks = feed?.peakHours ?? [];
  const nowHour = useMemo(() => {
    try {
      return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: feed?.timezone }).format(new Date(nowSec * 1000)));
    } catch {
      return new Date().getHours();
    }
  }, [feed?.timezone, nowSec]);

  return (
    <Card className="admin-shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            Live revenue
            <span className="admin-live-dot relative inline-flex size-1.5 rounded-full bg-emerald-500 text-emerald-500" />
          </CardTitle>
          <CardDescription>Net income today, updating as payments come in.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex rounded-full bg-muted p-0.5" role="radiogroup" aria-label="Chart window">
            {WINDOWS.map((w) => (
              <button
                key={w.label}
                type="button"
                role="radio"
                aria-checked={windowSeconds === w.seconds}
                onClick={() => setWindowSeconds(w.seconds)}
                className={cn("relative rounded-full px-3 py-1 text-xs font-semibold transition-colors", windowSeconds === w.seconds ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {windowSeconds === w.seconds ? <motion.span layoutId="live-window" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 500, damping: 36 }} /> : null}
                <span className="relative">{w.label}</span>
              </button>
            ))}
          </div>
          <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => setPaused((p) => !p)} aria-label={paused ? "Resume live chart" : "Pause live chart"} className="grid size-8 place-items-center rounded-full border bg-card text-muted-foreground hover:text-foreground">
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </motion.button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="bklit-chart">
          <p className="text-3xl font-bold tracking-tight">{inr(total)}</p>
          {error && !feed ? <p className="py-10 text-center text-sm text-muted-foreground">Could not load live revenue: {error}</p> : null}
          {feed ? (
            <LiveLineChart data={data} value={total} window={windowSeconds} paused={paused} style={{ height: 260 }} margin={{ top: 20, right: 24, bottom: 28, left: 56 }}>
              <LiveLine
                dataKey="value"
                stroke="var(--chart-1)"
                formatValue={inr}
                momentumColors={{ up: "var(--chart-1)", down: "var(--chart-5)", flat: "var(--chart-2)" }}
              />
              <LiveXAxis numTicks={5} formatTime={(t) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} />
              <LiveYAxis formatValue={inr} allowDecimals={false} />
            </LiveLineChart>
          ) : !error ? (
            <div className="h-[260px] animate-pulse rounded-xl bg-muted/40" />
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Flame className="size-4 text-accent" />
              Busiest hours
              <span className="text-xs font-normal text-muted-foreground">avg per day, last {feed?.days ?? 28} days</span>
            </p>
            {peaks.length ? <p className="text-xs font-medium text-muted-foreground">Peak: {peaks.map(hourLong).join(", ")}</p> : null}
          </div>
          <div className="flex h-24 items-end gap-1" role="img" aria-label="Average revenue by hour of day">
            {hourly.map((h) => {
              const peak = peaks.includes(h.hour);
              return (
                <div key={h.hour} className="group relative flex h-full flex-1 flex-col justify-end" title={`${hourLong(h.hour)}: ${inr(h.avgNet)} avg, ${h.payments} payments`}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(h.avgNet > 0 ? 6 : 2, (h.avgNet / maxAvg) * 100)}%` }}
                    transition={{ type: "spring", stiffness: 160, damping: 22, delay: h.hour * 0.012 }}
                    className={cn("w-full rounded-t-sm", peak ? "bg-accent" : h.avgNet > 0 ? "bg-primary/70" : "bg-muted", h.hour === nowHour && "ring-2 ring-foreground/40")}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1 text-[10px] text-muted-foreground">
            {hourly.map((h) => (
              <span key={h.hour} className="flex-1 text-center">
                {h.hour % 3 === 0 ? hourLabel(h.hour) : ""}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
