"use client";
import { Activity, Flame, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatedTabBar, ErrorState, IconButton } from "@/components/kit";
import { AnimatedCounter, SkeletonShimmer } from "@/components/motion";
import { AdminBarChart } from "@/components/kit-extra/admin-bar-chart";
import { LiveLine } from "@/components/charts/live-line";
import { LiveLineChart } from "@/components/charts/live-line-chart";
import { LiveXAxis } from "@/components/charts/live-x-axis";
import { LiveYAxis } from "@/components/charts/live-y-axis";
import { formatMoney } from "@/lib/format";
import { salonTimeLabel } from "@/lib/salon-date";
import { useMediaQuery } from "@/lib/use-media-query";
import { Panel } from "./panel";

const WINDOWS = [
  { value: "3600", label: "1h" },
  { value: "14400", label: "4h" },
  { value: "43200", label: "12h" },
];
const money = (n) => formatMoney(n);
/** Axis labels: ₹950, ₹6.4k, ₹1.2L. */
const axisMoney = (n) => {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1e5) return `₹${+(n / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${+(n / 1e3).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
};
const hourShort = (h) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
const hourLong = (h) => `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`;

/**
 * Today's running net revenue on a sliding live chart plus the average revenue per hour of day
 * (peak hours highlighted). Data comes from `useLiveRevenue()` in the parent so the KPI cards and
 * this card share one poll.
 */
export function LiveRevenueCard({ feed, error, skew, onRetry }) {
  const [windowSeconds, setWindowSeconds] = useState(WINDOWS[1].value);
  const [paused, setPaused] = useState(false);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const compact = !useMediaQuery("(min-width: 640px)");

  useEffect(() => {
    const tick = setInterval(() => setNowSec(Math.floor(Date.now() / 1000) + (skew?.current ?? 0)), 1000);
    return () => clearInterval(tick);
  }, [skew]);

  const total = Number(feed?.todayTotal ?? 0);
  const win = Number(windowSeconds);

  // Revenue only changes when a payment lands, so draw steps: hold the previous value up to each
  // payment, then jump. The final point keeps the line running to "now".
  const data = useMemo(() => {
    const points = [];
    let previous = 0;
    for (const point of feed?.today ?? []) {
      points.push({ time: point.time - 1, value: previous }, point);
      previous = point.value;
    }
    const start = (points[0]?.time ?? nowSec) - 60;
    return [{ time: Math.min(start, nowSec - win), value: 0 }, ...points, { time: nowSec, value: previous }].sort((a, b) => a.time - b.time);
  }, [feed, nowSec, win]);

  const peaks = feed?.peakHours ?? [];
  const nowHour = useMemo(() => {
    try {
      return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: feed?.timezone }).format(new Date(nowSec * 1000))) % 24;
    } catch {
      return new Date().getHours();
    }
  }, [feed?.timezone, nowSec]);
  const hourly = useMemo(
    () =>
      (feed?.hourly ?? []).map((h) => ({
        key: `${h.hour}`,
        label: hourLong(h.hour),
        tick: hourShort(h.hour),
        value: Number(h.avgNet) || 0,
        highlight: peaks.includes(h.hour),
        current: h.hour === nowHour,
        hint: `${h.payments ?? 0} payments`,
      })),
    [feed?.hourly, peaks, nowHour]
  );

  return (
    <Panel
      title="Live revenue"
      icon={Activity}
      subtitle="Net today, updates as payments land"
      bodyClassName="space-y-6 p-4 sm:p-5"
      action={
        <>
          <AnimatedTabBar size="sm" label="Chart window" items={WINDOWS} value={windowSeconds} onChange={setWindowSeconds} className="hidden sm:inline-flex" />
          <IconButton icon={paused ? Play : Pause} label={paused ? "Resume live chart" : "Pause live chart"} variant="soft" size="sm" onClick={() => setPaused((p) => !p)} />
        </>
      }
    >
      {error && !feed ? (
        <ErrorState compact title="Live revenue unavailable" description={error} onRetry={onRetry} />
      ) : (
        <div className="bklit-chart">
          <AnimatedCounter value={total} format={money} className="font-display text-display-lg leading-none font-bold tracking-tight" />
          {feed ? (
            <LiveLineChart data={data} value={total} window={win} paused={paused} style={{ height: compact ? 200 : 260 }} margin={{ top: 20, right: compact ? 56 : 72, bottom: 28, left: compact ? 44 : 56 }}>
              <LiveLine dataKey="value" stroke="var(--chart-1)" formatValue={money} momentumColors={{ up: "var(--chart-1)", down: "var(--chart-5)", flat: "var(--chart-3)" }} />
              <LiveXAxis numTicks={compact ? 3 : 5} formatTime={(t) => salonTimeLabel(new Date(t).toISOString())} />
              <LiveYAxis formatValue={axisMoney} allowDecimals={false} />
            </LiveLineChart>
          ) : (
            <SkeletonShimmer className="mt-4 h-[200px] w-full rounded-2xl sm:h-[260px]" />
          )}
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Flame className="size-4 text-portal" aria-hidden /> Busiest hours
            <span className="text-caption font-normal text-ink-neutral">avg / day · {feed?.days ?? 28}d</span>
          </p>
          {peaks.length ? <p className="text-caption font-semibold text-ink-neutral">Peak {peaks.map(hourLong).join(", ")}</p> : null}
        </div>
        {feed ? (
          hourly.length ? (
            <AdminBarChart data={hourly} format={money} aggregate="sum" height={compact ? 130 : 150} ariaLabel="Average revenue by hour of day" />
          ) : (
            <p className="py-6 text-center text-caption text-ink-neutral">No payments in this period yet</p>
          )
        ) : !error ? (
          <SkeletonShimmer className="h-[130px] w-full rounded-2xl sm:h-[150px]" />
        ) : null}
      </div>
    </Panel>
  );
}
