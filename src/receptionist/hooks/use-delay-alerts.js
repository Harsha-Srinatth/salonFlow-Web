"use client";

import { isCriticalDelay } from "@/receptionist/lib/booking-utils";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/notify";

export function useDelayAlerts(bookings = []) {
  const [nowMs, setNowMs] = useState(Date.now());
  const alertedRef = useRef(new Set());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const criticalStarted = bookings.filter((booking) => isCriticalDelay(booking, nowMs));
    const criticalIds = new Set(criticalStarted.map((booking) => booking.id));

    for (const id of alertedRef.current) {
      if (!criticalIds.has(id)) alertedRef.current.delete(id);
    }

    for (const booking of criticalStarted) {
      if (alertedRef.current.has(booking.id)) continue;
      alertedRef.current.add(booking.id);
      toast.error(`Over time: ${booking.customer}`, { description: `${booking.service} · 10+ min past planned` });
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.35);
        // Closing immediately would tear down the context before the scheduled
        // tone actually renders, so the alert sound never plays. Wait for it to
        // finish, then close so contexts don't pile up over a long shift (Safari
        // in particular caps the number of concurrent AudioContexts).
        window.setTimeout(() => {
          context.close().catch(() => {});
        }, 400);
      } catch {
        // Browser may block autoplay
      }
    }
  }, [bookings, nowMs]);

  return { nowMs, isCriticalDelay: (booking) => isCriticalDelay(booking, nowMs) };
}
