"use client";

import { toApiUrl } from "@/lib/api-base";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { connectStaffBookingsSocket, disconnectStaffBookingsSocket } from "@/lib/realtime/admin-bookings-socket";
import { staffApiFetch } from "@/lib/staff-auth-client";
import { buildAppointmentCardModels } from "@/employee/lib/queue-utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function useEmployeeQueue({ user, enabled = true }) {
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [mutatingId, setMutatingId] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const loadQueue = useCallback(async () => {
    const res = await staffApiFetch(toApiUrl("/api/staff/queue"));
    const data = await res.json().catch(() => ({}));
    setQueue(data.queue ?? []);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
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
      if (mounted) setRealtimeConnected(true);
    })();
    return () => {
      mounted = false;
      setRealtimeConnected(false);
      disconnectStaffBookingsSocket();
    };
  }, [enabled, loadQueue, user]);

  const cards = useMemo(() => buildAppointmentCardModels(queue, nowMs), [nowMs, queue]);

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
      toast.success(penalty > 0 ? `Completed. Penalty: Rs ${penalty.toFixed(2)}` : "Service completed");
      await loadQueue();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete booking");
    } finally {
      setMutatingId(null);
    }
  }

  return {
    queue,
    cards,
    queueLoading,
    mutatingId,
    nowMs,
    realtimeConnected,
    loadQueue,
    startBooking,
    completeBooking,
  };
}
