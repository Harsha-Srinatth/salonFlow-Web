"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertOctagon, ChevronLeft, ChevronRight, Clock, Save, Timer, TrendingDown, Undo2, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { notify as toast } from "@/lib/notify";
import { useAuth } from "@/components/auth/auth-provider";
import { ButtonLoadingMorph, ErrorState, IconButton, StatCard, useAsyncAction } from "@/components/kit";
import { SkeletonList, spring } from "@/components/motion";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { Panel } from "@/admin/components/panel";
import { EmptyState } from "@/admin/components/empty-state";
import { Stepper } from "@/admin/components/stepper";
import { formatMoney } from "@/lib/format";
import { formatIsoDate, monthStartIso, salonDateIso } from "@/lib/salon-date";
import { toApiUrl } from "@/lib/api-base";
import { getFirebaseIdToken } from "@/lib/auth/id-token";
import { cn } from "@/lib/utils";
import { AdminLayout } from "../portal/admin-layout";

async function authHeaders() {
  const token = await getFirebaseIdToken().catch(() => null);
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const DEFAULT_POLICY = { graceMinutes: 10, penaltyPerMinute: 0 };
const inr = (n) => formatMoney(n, { decimals: !Number.isInteger(Number(n || 0)) });

// Months are "YYYY-MM" in salon time.
const shiftMonth = (month, delta) => monthStartIso(`${month}-01`, delta).slice(0, 7);
const monthLabel = (month) => formatIsoDate(`${month}-01`, { month: "long", year: "numeric" });
const currentMonth = () => salonDateIso().slice(0, 7);


export default function AdminStaffPayrollPage() {
  const { appUser } = useAuth();
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [savedPolicy, setSavedPolicy] = useState(DEFAULT_POLICY);
  const [month, setMonth] = useState(currentMonth);
  const [direction, setDirection] = useState(1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const saveAction = useAsyncAction({ successMs: 900 });
  const saving = saveAction.state === "loading";
  const reduce = useReducedMotion();
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
      setLoadError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [loadPolicy, loadReport, month]);

  useEffect(() => {
    if (appUser?.role !== "ADMIN") return;
    loadAll().catch(() => {});
    // Policy is reloaded with the month; unsaved policy edits are not clobbered because load only runs on month change.
  }, [appUser?.role, month]); // eslint-disable-line react-hooks/exhaustive-deps

  async function savePolicy() {
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
      throw e;
    }
  }

  function go(delta) {
    setDirection(delta);
    setMonth((m) => shiftMonth(m, delta));
  }

  if (!appUser || appUser.role !== "ADMIN") return <AdminLayout pageTitle="Payroll"><EmptyState illustration="search" title="Admins only" /></AdminLayout>;

  const isCurrent = month === currentMonth();

  return (
    <AdminLayout pageTitle="Payroll" description="Overrun penalties per stylist">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Wallet} label="Total cut" value={totalCut} format={inr} tone="destructive" loading={loading && !items.length && !loadError} />
          <StatCard icon={Clock} label="Overtime min" value={totalOvertimeMinutes} tone="warning" loading={loading && !items.length && !loadError} />
          <StatCard icon={TrendingDown} label="Stylists" value={items.length} tone="neutral" loading={loading && !items.length && !loadError} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <Panel title="Delay policy" icon={AlertOctagon} subtitle="When a service overruns" className="h-fit" bodyClassName="space-y-5 p-4 sm:p-5">
            <Stepper id="graceMinutes" label="Grace period" value={policy.graceMinutes} onChange={(v) => setPolicy((p) => ({ ...p, graceMinutes: v }))} min={0} max={180} suffix="min" />
            <Stepper id="penaltyPerMinute" label="Per minute after" value={policy.penaltyPerMinute} onChange={(v) => setPolicy((p) => ({ ...p, penaltyPerMinute: v }))} min={0} step={1} prefix="₹" />
            <div className="flex items-center gap-3 rounded-2xl bg-portal/8 p-3 text-sm">
              <Timer className="size-4 shrink-0 text-portal" aria-hidden />
              <p>
                {exampleLate} min over costs{" "}
                <motion.span key={exampleCost} initial={reduce ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={spring.snappy} className="inline-block font-display font-bold tabular-nums">
                  {inr(exampleCost)}
                </motion.span>
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              {dirty ? (
                <ButtonLoadingMorph variant="ghost" icon={Undo2} disabled={saving} onClick={() => setPolicy(savedPolicy)}>
                  Reset
                </ButtonLoadingMorph>
              ) : null}
              <ButtonLoadingMorph icon={Save} state={saveAction.state} disabled={!dirty} loadingLabel="Saving…" successLabel="Saved" onClick={() => saveAction.run(savePolicy)}>
                Save
              </ButtonLoadingMorph>
            </div>
          </Panel>

          <Panel
            title="Deductions"
            icon={Wallet}
            subtitle="Ranked by amount"
            action={
              <div className="flex items-center gap-1 rounded-full bg-muted p-1">
                <IconButton icon={ChevronLeft} label="Previous month" size="sm" onClick={() => go(-1)} />
                <div className="relative h-8 w-28 overflow-hidden text-center sm:w-36">
                  <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                    <motion.span
                      key={month}
                      custom={direction}
                      variants={{ enter: (d) => ({ opacity: 0, x: reduce ? 0 : 24 * d }), center: { opacity: 1, x: 0 }, exit: (d) => ({ opacity: 0, x: reduce ? 0 : -24 * d }) }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={spring.snappy}
                      className="absolute inset-0 flex items-center justify-center text-caption font-semibold"
                    >
                      {monthLabel(month)}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <IconButton icon={ChevronRight} label="Next month" size="sm" disabled={isCurrent} onClick={() => go(1)} />
              </div>
            }
          >
            {loadError && !items.length ? (
              <ErrorState compact title="Couldn't load payroll" description={loadError} onRetry={loadAll} />
            ) : loading && !items.length ? (
              <SkeletonList rows={3} />
            ) : !ranked.length ? (
              <EmptyState compact illustration="sparkle" title="No deductions" description={`Nobody overran in ${monthLabel(month)}.`} className="bg-transparent" />
            ) : (
              <ul className="space-y-2.5">
                <AnimatePresence initial={false} mode="popLayout">
                  {ranked.map((item, index) => {
                    const penalty = Number(item.totalPenalty ?? 0);
                    return (
                      <motion.li key={item.stylistId} layout={!reduce} initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ...spring.soft, delay: Math.min(index, 10) * 0.04 }} className="rounded-2xl bg-muted/40 p-3.5 ring-1 ring-inset ring-border/60">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="w-5 text-center font-display text-sm font-bold text-ink-neutral">{index + 1}</span>
                            <AvatarBadge name={item.stylistName} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{item.stylistName}</p>
                              <p className="text-caption text-ink-neutral">
                                {item.bookingsCount} done · {item.overtimeMinutes} min over
                              </p>
                            </div>
                          </div>
                          <p className="shrink-0 font-display font-bold tabular-nums text-ink-destructive">−{inr(penalty)}</p>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                          <motion.div className="h-full origin-left rounded-full bg-destructive/70" initial={{ scaleX: 0 }} animate={{ scaleX: penalty / maxPenalty }} transition={{ ...spring.gentle, delay: 0.1 }} />
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </AdminLayout>
  );
}
