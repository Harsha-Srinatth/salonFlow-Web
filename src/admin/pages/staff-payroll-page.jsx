"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { SkeletonRows } from "@/admin/components/skeleton";
import { StatCard } from "@/admin/components/stat-card";
import { useRevealOnReady } from "@/admin/lib/motion";
import { toApiUrl } from "@/lib/api-base";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { AlertOctagon, Clock, Save, TrendingDown, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const listRef = useRevealOnReady([loading, items.length], { selector: ":scope > *" });

  const totalCut = useMemo(() => items.reduce((sum, item) => sum + Number(item.totalPenalty ?? 0), 0), [items]);
  const totalOvertimeMinutes = useMemo(() => items.reduce((sum, item) => sum + Number(item.overtimeMinutes ?? 0), 0), [items]);

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

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadPolicy(), loadReport(month)]);
      setLoadError("");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load payroll";
      toast.error(message);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (appUser?.role !== "ADMIN") return;
    void loadAll();
  }, [appUser?.role, month]);

  async function savePolicy() {
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  }

  if (!appUser || appUser.role !== "ADMIN") return <div className="p-4">Admin only.</div>;

  return (
    <AdminLayout
      pageTitle="Stylist Payroll"
      description="Delay penalties and monthly deductions per stylist."
    >
      <div className="space-y-6">
        <ErrorBanner message={loadError} onRetry={loadAll} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard icon={Wallet} label="Total cut this month" display={`Rs ${totalCut.toFixed(2)}`} tone="destructive" />
          <StatCard icon={Clock} label="Overtime minutes" value={totalOvertimeMinutes} tone="warning" delay={60} />
          <StatCard icon={TrendingDown} label="Stylists affected" value={items.length} tone="neutral" delay={120} />
        </div>

        <Card className="admin-shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertOctagon className="size-4 text-primary" />
              Delay Deduction Policy
            </CardTitle>
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
              <Button className="w-full md:w-auto" disabled={saving} onClick={() => void savePolicy()}>
                <Save className="size-4" />
                {saving ? "Saving…" : "Save policy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Monthly Stylist Deductions</CardTitle>
            <Input className="w-44" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <SkeletonRows count={3} />
            ) : !items.length ? (
              <EmptyState icon={Wallet} title="No deductions for this month" description="Stylists with delay penalties for the selected month will appear here." />
            ) : (
              <div ref={listRef} className="space-y-2.5">
                {items.map((item) => (
                  <div key={item.stylistId} className="admin-card-hover admin-shadow-sm flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3.5 text-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <AvatarBadge name={item.stylistName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.stylistName}</p>
                        <p className="text-xs text-muted-foreground">
                          Completed: {item.bookingsCount} | Overtime: {item.overtimeMinutes} mins
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 font-semibold text-destructive">- Rs {Number(item.totalPenalty).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
