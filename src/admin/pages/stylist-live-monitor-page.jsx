"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAdminBookings, selectAdminAppointments } from "@/store/admin-portal-slice";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { AdminLayout } from "../portal/admin-layout";

function formatMs(ms) {
  const abs = Math.max(0, Math.abs(ms));
  const mins = Math.floor(abs / 60000);
  const secs = Math.floor((abs % 60000) / 1000);
  return `${ms < 0 ? "-" : ""}${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function AdminStylistLiveMonitorPage() {
  const dispatch = useDispatch();
  const [nowMs, setNowMs] = useState(Date.now());
  const appointments = useSelector(selectAdminAppointments);
  const { realtimeConnected } = useSelector((state) => state.adminPortal);

  useEffect(() => {
    void dispatch(fetchAdminBookings({ limit: 200, offset: 0, sort: "proximity" }));
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [dispatch]);

  const activeCards = useMemo(() => {
    return appointments
      .filter((booking) => booking.status === "STARTED")
      .map((booking) => {
        const startedAt = new Date(booking.actualStartAt ?? booking.startsAt).getTime();
        const durationMs = Number(booking.durationMinutes ?? 0) * 60 * 1000;
        const remainingMs = durationMs - Math.max(0, nowMs - startedAt);
        const inRedZone = remainingMs <= 0 && remainingMs >= -(10 * 60 * 1000);
        const critical = remainingMs < -(10 * 60 * 1000);
        return { booking, remainingMs, inRedZone, critical };
      })
      .sort((a, b) => a.remainingMs - b.remainingMs);
  }, [appointments, nowMs]);

  return (
    <AdminLayout
      pageTitle="Stylist Live Monitor"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin-dashboard">Dashboard</Link>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Live started services</CardTitle>
          <p className="text-xs text-muted-foreground">
            Realtime: {realtimeConnected ? "Connected" : "Disconnected"} | Red zone starts after planned duration, critical after 10 minutes overtime.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!activeCards.length ? <p className="text-sm text-muted-foreground">No started services right now.</p> : null}
          {activeCards.map(({ booking, remainingMs, inRedZone, critical }) => (
            <div key={booking.id} className="rounded-md border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{booking.customer}</p>
                <p className="text-sm text-muted-foreground">{booking.service}</p>
                <p className="text-xs text-muted-foreground">Stylist: {booking.stylistName ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${critical ? "text-destructive" : inRedZone ? "text-red-500" : "text-emerald-600"}`}>
                  {formatMs(remainingMs)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {critical ? "Critical delay > 10m" : inRedZone ? "Red zone" : "On track"}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

