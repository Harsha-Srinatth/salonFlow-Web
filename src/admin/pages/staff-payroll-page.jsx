"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toApiUrl } from "@/lib/api-base";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AdminLayout } from "../portal/admin-layout";

async function authHeaders() {
  const token = await getFirebaseIdToken().catch(() => null);
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export default function AdminStaffPayrollPage() {
  const { appUser } = useAuth();
  const [policy, setPolicy] = useState({ graceMinutes: 10, penaltyPerMinute: 0 });
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const totalCut = useMemo(() => items.reduce((sum, item) => sum + Number(item.totalPenalty ?? 0), 0), [items]);

  async function loadPolicy() {
    const headers = await authHeaders();
    const res = await fetch(toApiUrl("/api/admin/payroll/policy"), { credentials: "include", headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not load payroll policy");
    setPolicy(data.policy ?? { graceMinutes: 10, penaltyPerMinute: 0 });
  }

  async function loadReport(targetMonth) {
    const headers = await authHeaders();
    const res = await fetch(toApiUrl(`/api/admin/payroll/deductions?month=${targetMonth}`), { credentials: "include", headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not load deductions");
    setItems(data.items ?? []);
  }

  useEffect(() => {
    if (appUser?.role !== "ADMIN") return;
    void (async () => {
      setLoading(true);
      try {
        await Promise.all([loadPolicy(), loadReport(month)]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load payroll");
      } finally {
        setLoading(false);
      }
    })();
  }, [appUser?.role, month]);

  async function savePolicy() {
    try {
      const headers = await authHeaders();
      const res = await fetch(toApiUrl("/api/admin/payroll/policy"), {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({
          graceMinutes: Number(policy.graceMinutes ?? 10),
          penaltyPerMinute: Number(policy.penaltyPerMinute ?? 0),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save payroll policy");
      setPolicy(data.policy ?? policy);
      toast.success("Payroll policy updated");
      await loadReport(month);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save payroll policy");
    }
  }

  if (!appUser || appUser.role !== "ADMIN") return <div className="p-4">Admin only.</div>;

  return (
    <AdminLayout
      pageTitle="Stylist Payroll"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin-dashboard">Dashboard</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Delay Deduction Policy</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="graceMinutes">Grace minutes</Label>
              <Input
                id="graceMinutes"
                type="number"
                min="0"
                max="180"
                value={policy.graceMinutes}
                onChange={(e) => setPolicy((prev) => ({ ...prev, graceMinutes: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="penaltyPerMinute">Penalty per minute (Rs)</Label>
              <Input
                id="penaltyPerMinute"
                type="number"
                min="0"
                value={policy.penaltyPerMinute}
                onChange={(e) => setPolicy((prev) => ({ ...prev, penaltyPerMinute: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => void savePolicy()}>Save policy</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Monthly Stylist Deductions</CardTitle>
            <Input className="w-44" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            <p className="text-sm font-medium">Total cut for month: Rs {totalCut.toFixed(2)}</p>
            {!items.length ? <p className="text-sm text-muted-foreground">No deductions for selected month.</p> : null}
            {items.map((item) => (
              <div key={item.stylistId} className="rounded-md border p-3 text-sm flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.stylistName}</p>
                  <p className="text-muted-foreground">
                    Completed: {item.bookingsCount} | Overtime: {item.overtimeMinutes} mins
                  </p>
                </div>
                <p className="font-semibold text-destructive">- Rs {Number(item.totalPenalty).toFixed(2)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

