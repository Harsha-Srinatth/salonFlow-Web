import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "@/lib/api-json";

const POLL_MS = 10_000;

/**
 * Today's live revenue feed (GET /api/admin/reports/revenue-live), polled every 10 s while the tab
 * is visible. Shape: { now, todayTotal, today: [{ time, value }], hourly: [{ hour, avgNet, payments }],
 * peakHours: number[], days, timezone }. `skew` lines the browser clock up with the server's.
 */
export function useLiveRevenue() {
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState("");
  const skew = useRef(0);

  const load = useCallback(async (signal) => {
    try {
      const data = await apiJson("/api/admin/reports/revenue-live", { auth: true, signal });
      skew.current = (Number(data?.now) || Math.floor(Date.now() / 1000)) - Math.floor(Date.now() / 1000);
      setFeed(data);
      setError("");
    } catch (err) {
      if (!err?.cancelled) setError(err?.message ?? "Could not load live revenue");
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

  return { feed, error, skew, reload: () => load() };
}
