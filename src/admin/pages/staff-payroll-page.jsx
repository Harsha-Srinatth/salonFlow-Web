"use client";

import { AnimatePresence, motion } from "motion/react";
import { BorderBeam } from "border-beam";
import { AlertOctagon, ChevronLeft, ChevronRight, Clock, Loader2, Save, Timer, TrendingDown, Undo2, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { StatCard } from "@/admin/components/stat-card";
import { Stepper } from "@/admin/components/stepper";
import { LoadingOrb } from "@/components/shared/loading-orb";
import { toApiUrl } from "@/lib/api-base";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";
import { AdminLayout } from "../portal/admin-layout";

async function authHeaders() {
  const token = await getFirebaseIdToken().catch(() => null);
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const DEFAULT_POLICY = { graceMinutes: 10, penaltyPerMinute: 0 };
const inr = (n) => `Rs ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
}
const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString([], { month: "long", year: "numeric" });
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
};

export default function AdminStaffPayrollPage() {
  const { appUser } = useAuth();
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [savedPolicy, setSavedPolicy] = useState(DEFAULT_POLICY);
  const [month, setMonth] = useState(currentMonth);
  const [direction, setDirection] = useState(1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const totalCut = useMemo(() => items.reduce((sum, item) => sum + Number(item.totalPenalty ?? 0), 0), [items]);
  const totalOvertimeMinutes = useMemo(() => items.reduce((sum, item) => sum + Number(item.overtimeMinutes ?? 0), 0), [items]);
  const maxPenalty = Math.max(1, ...items.map((i) => Number(i.totalPenalty ?? 0)));
  const ranked = useMemo(() => [...items].sort((a, b) => Number(b.totalPenalty ?? 0) - Number(a.totalPenalty ?? 0)), [items]);
  const dirty = Number(policy.graceMinutes) !== Number(savedPolicy.graceMinutes) || Number(policy.penaltyPerMinute) !== Number(savedPolicy.penaltyPerMinute);

  // "What would a 25-minute overrun cost?" so the policy numbers are not abstract.
  const exampleLate = 25;
  const exampleCost = Math.max(0, exampleLate - Number(policy.graceMinutes || 0)) * Number(policy.penaltyPerMinute || 0);

  const loadPolicy = useCallback(async () => {
    const headers = await authHeaders();
    const res = await fetch(toApiUrl("/api/admin/payroll/policy"), { credentials: "include", headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not load payroll policy");
    const next = data.policy ?? DEFAULT_POLICY;
    setPolicy(next);
    setSavedPolicy(next);
  }, []);

  const loadReport = useCallback(async (targetMonth) => {
    const headers = await authHeaders();
    const res = await fetch(toApiUrl(`/api/admin/payroll/deductions?month=${targetMonth}`), { credentials: "include", headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not load deductions");
    setItems(data.items ?? []);
  }, []);

  const loadAll = useCallback(async () => {
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
  }, [loadPolicy, loadReport, month]);

  useEffect(() => {
    if (appUser?.role !== "ADMIN") return;
    void loadAll();
    // Policy is reloaded with the month; unsaved policy edits are not clobbered because load only runs on month change.
  }, [appUser?.role, month]); // eslint-disable-line react-hooks/exhaustive-deps

  async function savePolicy() {
    setSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(toApiUrl("/api/admin/payroll/policy"), {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({ graceMinutes: Number(policy.graceMinutes ?? 10), penaltyPerMinute: Number(policy.penaltyPerMinute ?? 0) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save payroll policy");
      const next = data.policy ?? policy;
      setPolicy(next);
      setSavedPolicy(next);
      toast.success("Payroll policy updated");
      await loadReport(month);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save payroll policy");
    } finally {
      setSaving(false);
    }
  }

  function go(delta) {
    setDirection(delta);
    setMonth((m) => shiftMonth(m, delta));
  }

  if (!appUser || appUser.role !== "ADMIN") return <div className="p-4">Admin only.</div>;

  const isCurrent = month === currentMonth();

  return (
    <AdminLayout pageTitle="Stylist Payroll" description="Delay penalties and monthly deductions per stylist.">
      <div className="space-y-6">
        <ErrorBanner message={loadError} onRetry={() => void loadAll()} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard icon={Wallet} label={`Total cut · ${monthLabel(month)}`} display={inr(totalCut)} tone="destructive" />
          <StatCard icon={Clock} label="Overtime minutes" value={totalOvertimeMinutes} tone="warning" delay={60} />
          <StatCard icon={TrendingDown} label="Stylists affected" value={items.length} tone="neutral" delay={120} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          {/* Policy */}
          <section className="admin-shadow-sm h-fit rounded-2xl border border-border/70 bg-card">
            <header className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <AlertOctagon className="size-[18px]" />
              </span>
              <div>
                <h2 className="font-display text-base font-semibold leading-tight">Delay deduction policy</h2>
                <p className="text-xs text-muted-foreground">Applied when a service runs past its planned time.</p>
              </div>
            </header>
            <div className="space-y-5 p-5">
              <Stepper id="graceMinutes" label="Grace period" hint="Minutes of overrun with no penalty." value={policy.graceMinutes} onChange={(v) => setPolicy((p) => ({ ...p, graceMinutes: v }))} min={0} max={180} suffix="min" />
              <Stepper id="penaltyPerMinute" label="Penalty per minute" hint="Charged for every minute beyond the grace period." value={policy.penaltyPerMinute} onChange={(v) => setPolicy((p) => ({ ...p, penaltyPerMinute: v }))} min={0} step={1} prefix="Rs" />
              <div className="flex items-start gap-2.5 rounded-xl bg-primary/5 p-3 text-sm">
                <Timer className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  A service that overruns by <span className="font-semibold text-foreground">{exampleLate} min</span> costs the stylist{" "}
                  <motion.span key={exampleCost} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="inline-block font-semibold text-foreground">
                    {inr(exampleCost)}
                  </motion.span>
                  .
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={cn("text-xs", dirty ? "font-medium text-warning" : "text-muted-foreground")}>{dirty ? "Unsaved changes" : "Saved"}</span>
                <div className="flex gap-2">
                  {dirty ? (
                    <Button type="button" variant="ghost" onClick={() => setPolicy(savedPolicy)} disabled={saving}>
                      <Undo2 className="size-4" /> Reset
                    </Button>
                  ) : null}
                  <BorderBeam size="sm" active={dirty && !saving}>
                    <Button disabled={!dirty || saving} onClick={() => void savePolicy()}>
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      {saving ? "Saving…" : "Save policy"}
                    </Button>
                  </BorderBeam>
                </div>
              </div>
            </div>
          </section>

          {/* Deductions */}
          <section className="admin-shadow-sm rounded-2xl border border-border/70 bg-card">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
              <div>
                <h2 className="font-display text-base font-semibold leading-tight">Monthly stylist deductions</h2>
                <p className="text-xs text-muted-foreground">Ranked by amount cut.</p>
              </div>
              <div className="flex items-center gap-1 rounded-full border bg-background p-1">
                <Button type="button" size="icon" variant="ghost" className="size-8 rounded-full" aria-label="Previous month" onClick={() => go(-1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="relative h-8 w-36 overflow-hidden text-center">
                  <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                    <motion.span
                      key={month}
                      custom={direction}
                      variants={{ enter: (d) => ({ opacity: 0, x: 24 * d }), center: { opacity: 1, x: 0 }, exit: (d) => ({ opacity: 0, x: -24 * d }) }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.18 }}
                      className="absolute inset-0 flex items-center justify-center text-sm font-semibold"
                    >
                      {monthLabel(month)}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <Button type="button" size="icon" variant="ghost" className="size-8 rounded-full" aria-label="Next month" disabled={isCurrent} onClick={() => go(1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </header>
            <div className="p-5">
              {loading && !items.length ? (
                <LoadingOrb compact label="Loading deductions…" />
              ) : !ranked.length ? (
                <EmptyState icon={Wallet} title="No deductions for this month" description="Stylists with delay penalties for the selected month will appear here." />
              ) : (
                <motion.ul layout className="space-y-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {ranked.map((item, index) => {
                      const penalty = Number(item.totalPenalty ?? 0);
                      return (
                        <motion.li
                          key={item.stylistId}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 380, damping: 32, delay: Math.min(index, 8) * 0.03 }}
                          className="rounded-xl border border-border/70 p-3.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="w-5 text-center text-xs font-bold text-muted-foreground">{index + 1}</span>
                              <AvatarBadge name={item.stylistName} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{item.stylistName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.bookingsCount} completed · {item.overtimeMinutes} min overtime
                                </p>
                              </div>
                            </div>
                            <p className="shrink-0 font-semibold tabular-nums text-destructive">- {inr(penalty)}</p>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                            <motion.div className="h-full rounded-full bg-destructive/70" initial={{ width: 0 }} animate={{ width: `${(penalty / maxPenalty) * 100}%` }} transition={{ type: "spring", stiffness: 110, damping: 20, delay: 0.1 }} />
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </motion.ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
