"use client";

import { toApiUrl } from "@/lib/api-base";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { connectStaffBookingsSocket, disconnectStaffBookingsSocket } from "@/lib/realtime/admin-bookings-socket";
import { staffApiFetch } from "@/lib/staff-auth-client";
import { buildAppointmentCardModels } from "@/employee/lib/queue-utils";
import { formatMoney } from "@/lib/format";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/notify";

/** Provided by `EmployeeFrame` so every stylist tab shares one queue and one socket. */
export const EmployeeQueueContext = createContext(null);

/**
 * The stylist's queue plus a live clock and card models. Inside `EmployeeFrame` it reads the
 * frame's shared queue (no refetch, no socket reconnect per tab); elsewhere it loads its own.
 */
export function useEmployeeQueue({ user, enabled = true }) {
  const shared = useContext(EmployeeQueueContext);
  const own = useEmployeeQueueSource({ user, enabled: enabled && !shared });
  const source = shared ?? own;
  const [nowMs, setNowMs] = useState(Date.now());

  // Lives in the page (not the frame) so the 1s tick never re-renders the shell.
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const cards = useMemo(() => buildAppointmentCardModels(source.queue, nowMs), [nowMs, source.queue]);
  return { ...source, nowMs, cards };
}

/** Queue state, actions and the realtime socket. Call once per portal (EmployeeFrame does). */
export function useEmployeeQueueSource({ user, enabled = true }) {
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState(null);
  const [mutatingId, setMutatingId] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const res = await staffApiFetch(toApiUrl("/api/staff/queue"));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not load your bookings");
      setQueue(data.queue ?? []);
      setQueueError(null);
    } catch (e) {
      setQueueError(e instanceof Error ? e.message : "Could not load your bookings");
    }
  }, []);

  useEffect(() => {
    if (!enabled || !user) return;
    let mounted = true;
    setQueueLoading(true);
    void loadQueue().finally(() => {
      if (mounted) setQueueLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [enabled, loadQueue, user]);

  useEffect(() => {
    if (!enabled || !user) return;
    let mounted = true;
    void (async () => {
      const token = await getFirebaseIdToken().catch(() => null);
      await connectStaffBookingsSocket({
        token,
        // Real connection state (not just "connect() was called"), so the reconnect banner is honest.
        onConnect: () => mounted && setRealtimeConnected(true),
        onDisconnect: () => mounted && setRealtimeConnected(false),
        onBookingUpdated: (booking) => {
          if (!mounted || !booking?.id) return;
          void loadQueue();
          setQueue((current) => {
            const index = current.findIndex((item) => item.id === booking.id);
            if (index >= 0) {
              const next = [...current];
              if (["COMPLETED", "CANCELLED", "NO-SHOW"].includes(booking.status)) {
                next.splice(index, 1);
                return next;
              }
              next[index] = booking;
              return next;
            }
            if (booking.stylistId === user.id && !["COMPLETED", "CANCELLED", "NO-SHOW"].includes(booking.status ?? "")) {
              return [...current, booking];
            }
            return current;
          });
        },
        onServiceCatalogUpdated: () => {},
      });
    })();
    return () => {
      mounted = false;
      setRealtimeConnected(false);
      disconnectStaffBookingsSocket();
    };
  }, [enabled, loadQueue, user]);

  /** Resolves on success; throws (after a toast) on failure so buttons can show their error state. */
  async function startBooking(bookingId) {
    setMutatingId(bookingId);
    try {
      const res = await staffApiFetch(toApiUrl(`/api/staff/bookings/${bookingId}/start`), { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not start booking");
      toast.success("Service started");
      await loadQueue();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start booking");
      throw e;
    } finally {
      setMutatingId(null);
    }
  }

  async function completeBooking(bookingId) {
    setMutatingId(bookingId);
    try {
      const res = await staffApiFetch(toApiUrl(`/api/staff/bookings/${bookingId}/complete`), { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not complete booking");
      const penalty = Number(data?.booking?.penaltyAmount ?? 0);
      if (penalty > 0) toast.warning("Completed with penalty", { description: formatMoney(penalty, { decimals: true }) });
      else toast.success("Service completed");
      await loadQueue();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete booking");
      throw e;
    } finally {
      setMutatingId(null);
    }
  }

  return useMemo(
    () => ({ queue, queueLoading, queueError, mutatingId, realtimeConnected, loadQueue, startBooking, completeBooking }),
    // startBooking/completeBooking only close over loadQueue and stable setters.
    [queue, queueLoading, queueError, mutatingId, realtimeConnected, loadQueue]
  );
}
