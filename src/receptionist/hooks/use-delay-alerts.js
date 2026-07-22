"use client";

import { isCriticalDelay } from "@/receptionist/lib/booking-utils";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
      toast.error(`Delay alert: ${booking.customer} (${booking.service}) exceeded 10 minutes.`);
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
        void context.close();
      } catch {
        // Browser may block autoplay
      }
    }
  }, [bookings, nowMs]);

  return { nowMs, isCriticalDelay: (booking) => isCriticalDelay(booking, nowMs) };
}
