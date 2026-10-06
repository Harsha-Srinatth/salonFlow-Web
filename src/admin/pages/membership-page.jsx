"use client";

import { AnimatePresence, motion } from "motion/react";
import { BorderBeam } from "border-beam";
import { AlertTriangle, ChevronLeft, ChevronRight, CreditCard, Crown, ExternalLink, Loader2, Plus, RefreshCw, Save, Search, ShieldCheck, Sparkles, Star, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/notify";
import { AdminLayout } from "../portal/admin-layout";
import { Button } from "@/components/ui/button";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { Switch } from "@/admin/components/service-editor-drawer";
import { StatCard } from "@/admin/components/stat-card";
import { StatusPill } from "@/admin/components/status-pill";
import { SegmentedControl } from "@/components/fx/segmented-control";
import { LoadingOrb } from "@/components/shared/loading-orb";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { cn } from "@/lib/utils";

async function authFetch(path, init) {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

const DURATIONS = [
  { value: 1, label: "1 month" },
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "1 year" },
];
const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "PAID", label: "Paid" },
  { value: "CREATED", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "EXPIRED", label: "Expired" },
  { value: "MISMATCH", label: "Needs review" },
  { value: "REFUNDED", label: "Refunded" },
];
const STATUS_VIEW = {
  PAID: { label: "Paid", tone: "success" },
  CREATED: { label: "Pending", tone: "warning" },
  FAILED: { label: "Failed", tone: "destructive" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  MISMATCH: { label: "Needs review", tone: "warning" },
  REFUNDED: { label: "Refunded", tone: "neutral" },
};
const inr = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const fmt = (value) => (value ? new Date(value).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "—");

function planToForm(plan) {
  return {
    name: plan?.name ?? "",
    tagline: plan?.tagline ?? "",
    priceAmount: `${plan?.priceAmount ?? 0}`,
    durationMonths: Number(plan?.durationMonths ?? 1),
    benefits: (plan?.benefits ?? []).length ? [...plan.benefits] : [""],
    isActive: plan?.isActive !== false,
  };
}

function PlanEditor({ segment, icon: Icon, saved, form, onChange, onSave, saving }) {
  const dirty = JSON.stringify(form) !== JSON.stringify(planToForm(saved));
  const price = Number(form.priceAmount);
  const priceChanged = saved && Number(saved.priceAmount) !== price;
  const period = DURATIONS.find((d) => d.value === form.durationMonths)?.label ?? "";
  const setBenefit = (i, value) => onChange({ ...form, benefits: form.benefits.map((b, idx) => (idx === i ? value : b)) });
  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="admin-shadow-sm flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight">{segment === "BASIC" ? "Basic plan" : "Premium plan"}</h2>
            <p className="text-xs text-muted-foreground">{form.isActive ? "On sale" : "Hidden from customers"}</p>
          </div>
        </div>
        <Switch checked={form.isActive} onChange={(isActive) => onChange({ ...form, isActive })} label={`${segment} plan on sale`} />
      </header>

      <div className="flex-1 space-y-5 p-5">
        {/* Price: the number customers actually pay through Razorpay */}
        <div className="rounded-xl bg-primary/5 p-4">
          <label htmlFor={`price-${segment}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Price customers pay
          </label>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-muted-foreground">₹</span>
            <input
              id={`price-${segment}`}
              inputMode="numeric"
              type="number"
              min="1"
              value={form.priceAmount}
              onChange={(e) => onChange({ ...form, priceAmount: e.target.value })}
              className="w-full min-w-0 bg-transparent font-display text-4xl font-bold tracking-tight outline-none"
            />
            <span className="shrink-0 text-sm text-muted-foreground">for {period}</span>
          </div>
          <AnimatePresence initial={false}>
            {priceChanged ? (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden pt-2 text-xs text-muted-foreground">
                New price applies to new payments. Members who already paid keep their current period.
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Membership period</p>
          <SegmentedControl fluid label="Membership period" options={DURATIONS} value={form.durationMonths} onChange={(durationMonths) => onChange({ ...form, durationMonths })} />
        </div>

        <div className="grid gap-3">
          <label className="space-y-1 text-sm font-medium">
            Plan name
            <input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Tagline
            <input value={form.tagline} onChange={(e) => onChange({ ...form, tagline: e.target.value })} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">What members get</p>
            <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...form, benefits: [...form.benefits, ""] })}>
              <Plus className="size-3.5" /> Add
            </Button>
          </div>
          <AnimatePresence initial={false}>
            {form.benefits.map((benefit, i) => (
              <motion.div key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-center gap-2 pb-2">
                  <input aria-label={`Benefit ${i + 1}`} value={benefit} placeholder="e.g. Member-only service discounts" onChange={(e) => setBenefit(i, e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove benefit ${i + 1}`} onClick={() => onChange({ ...form, benefits: form.benefits.filter((_, idx) => idx !== i) })}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
        <span className={cn("text-xs", dirty ? "font-medium text-warning" : "text-muted-foreground")}>{dirty ? "Unsaved changes" : "Saved"}</span>
        <div className="flex gap-2">
          {dirty ? (
            <Button type="button" variant="ghost" onClick={() => onChange(planToForm(saved))} disabled={saving}>
              Reset
            </Button>
          ) : null}
          <BorderBeam size="sm" active={dirty && !saving}>
            <Button type="button" onClick={onSave} disabled={!dirty || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Saving…" : "Save plan"}
            </Button>
          </BorderBeam>
        </div>
      </footer>
    </motion.div>
  );
}

function PaymentsTab({ razorpay }) {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState({ purchases: [], total: 0, limit: 25 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkingId, setCheckingId] = useState("");

  // Debounce the search box so typing does not fire a request per key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setOffset(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "25", offset: `${offset}` });
      if (status) params.set("status", status);
      if (query) params.set("search", query);
      setData(await authFetch(`/api/admin/membership/purchases?${params}`));
      setError("");
    } catch (e) {
      setError(e.message ?? "Could not load membership payments");
    } finally {
      setLoading(false);
    }
  }, [status, query, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  async function reconcile(id) {
    setCheckingId(id);
    try {
      const { result } = await authFetch(`/api/admin/membership/purchases/${id}/reconcile`, { method: "POST" });
      toast.success(result === "ACTIVATED" ? "Payment confirmed with Razorpay: membership activated" : result === "ALREADY_PAID" ? "Already confirmed" : `Checked with Razorpay: ${`${result}`.toLowerCase().replace(/_/g, " ")}`);
      await load();
    } catch (e) {
      toast.error(e.message ?? "Could not check with Razorpay");
    } finally {
      setCheckingId("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-full overflow-x-auto pb-1">
          <SegmentedControl label="Payment status" options={STATUS_FILTERS} value={status} onChange={(value) => { setStatus(value); setOffset(0); }} />
        </div>
        <div className="flex items-center gap-2">
          <BorderBeam className="w-full lg:w-72" radius="0.75rem">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone, email or Razorpay id" aria-label="Search membership payments" className="h-10 w-full rounded-xl border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground" />
            </div>
          </BorderBeam>
          <Button type="button" variant="outline" size="icon" aria-label="Refresh" onClick={() => void load()}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={() => void load()} />

      {loading && !data.purchases.length ? (
        <LoadingOrb compact label="Loading payments…" />
      ) : !data.purchases.length ? (
        <EmptyState icon={CreditCard} title="No membership payments" description={razorpay?.configured ? "Payments appear here as customers buy a plan." : "Connect Razorpay to let customers buy plans online."} />
      ) : (
        <motion.div layout className="space-y-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {data.purchases.map((p, index) => {
              const view = STATUS_VIEW[p.status] ?? { label: p.status, tone: "neutral" };
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32, delay: Math.min(index, 8) * 0.02 }}
                  className="admin-shadow-sm rounded-xl border border-border/70 bg-card p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <AvatarBadge name={p.customer.name || p.customer.email || "?"} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.customer.name || "Deleted customer"}</p>
                        <p className="truncate text-xs text-muted-foreground">{[p.customer.phone, p.customer.email].filter(Boolean).join(" · ") || "—"}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {p.planName} · {p.durationMonths === 12 ? "1 year" : `${p.durationMonths} month${p.durationMonths === 1 ? "" : "s"}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 md:justify-end">
                      <div className="text-right">
                        <p className="text-base font-bold tabular-nums">{inr(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">{p.paymentMethod ? `${p.paymentMethod.toUpperCase()} · ` : ""}{fmt(p.paidAt ?? p.createdAt)}</p>
                      </div>
                      <StatusPill status={view.label} tone={view.tone} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <div className="space-y-0.5">
                      {p.status === "PAID" ? <p>Valid {fmtDate(p.startsAt)} to {fmtDate(p.expiresAt)}</p> : null}
                      {p.failureReason && p.status !== "PAID" ? <p className="text-destructive">{p.failureReason}</p> : null}
                      <p className="font-mono">{p.razorpayPaymentId ?? p.razorpayOrderId ?? "No order created"}</p>
                    </div>
                    <div className="flex gap-2">
                      {p.status === "CREATED" || p.status === "MISMATCH" || p.status === "FAILED" ? (
                        <Button type="button" size="sm" variant="outline" disabled={checkingId === p.id} onClick={() => void reconcile(p.id)}>
                          {checkingId === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                          Check with Razorpay
                        </Button>
                      ) : null}
                      {p.razorpayUrl ? (
                        <Button asChild type="button" size="sm" variant="ghost">
                          <a href={p.razorpayUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-3.5" /> Open in Razorpay
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {data.total > data.limit ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {offset + 1}–{Math.min(offset + data.limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - data.limit))}>
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={offset + data.limit >= data.total} onClick={() => setOffset(offset + data.limit)}>
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminMembershipPage() {
  const [loading, setLoading] = useState(true);
  const [savingSegment, setSavingSegment] = useState("");
  const [loadError, setLoadError] = useState("");
  const [center, setCenter] = useState(null);
  const [tab, setTab] = useState("plans");
  const [forms, setForms] = useState({ BASIC: planToForm(null), PREMIUM: planToForm(null) });

  const loadCenter = useCallback(async () => {
    try {
      const data = await authFetch("/api/admin/membership");
      setCenter(data);
      const byId = (segment) => (data.paidPlans ?? []).find((plan) => plan.segment === segment);
      setForms({ BASIC: planToForm(byId("BASIC")), PREMIUM: planToForm(byId("PREMIUM")) });
      setLoadError("");
    } catch (error) {
      const message = error.message ?? "Could not load membership plans";
      toast.error(message);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCenter();
  }, [loadCenter]);

  const saved = useMemo(() => Object.fromEntries((center?.paidPlans ?? []).map((plan) => [plan.segment, plan])), [center]);

  async function savePlan(segment) {
    const form = forms[segment];
    setSavingSegment(segment);
    try {
      await authFetch(`/api/admin/membership/plans/${segment}`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          tagline: form.tagline,
          priceAmount: Number(form.priceAmount ?? 0),
          durationMonths: form.durationMonths,
          benefits: form.benefits.map((line) => line.trim()).filter(Boolean),
          isActive: form.isActive,
        }),
      });
      toast.success(`${segment === "BASIC" ? "Basic" : "Premium"} plan saved`);
      await loadCenter();
    } catch (error) {
      toast.error(error.message ?? "Could not save plan");
    } finally {
      setSavingSegment("");
    }
  }

  const counts = center?.customerCounts ?? { FREE: 0, BASIC: 0, PREMIUM: 0 };
  const stats = center?.stats;
  const razorpay = center?.razorpay;

  return (
    <AdminLayout
      pageTitle="Membership Plans"
      description="Set plan prices and track every membership payment made through Razorpay."
      actions={
        razorpay ? (
          <span className={cn("hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium sm:inline-flex", razorpay.configured ? "border-success/30 bg-success/10 text-success" : "border-warning/40 bg-warning/10 text-warning")}>
            <span className={cn("size-1.5 rounded-full", razorpay.configured ? "bg-success" : "bg-warning")} />
            {razorpay.configured ? `Razorpay ${razorpay.mode === "live" ? "live" : razorpay.mode === "test" ? "test mode" : "connected"}` : "Razorpay not connected"}
          </span>
        ) : null
      }
    >
      <div className="space-y-5">
        <ErrorBanner message={loadError} onRetry={() => void loadCenter()} />

        <AnimatePresence initial={false}>
          {razorpay && !razorpay.configured ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                <p>
                  <span className="font-semibold">Razorpay is not connected.</span> Customers cannot buy plans online until <code className="text-xs">RAZORPAY_KEY_ID</code> and <code className="text-xs">RAZORPAY_KEY_SECRET</code> are set on the server.
                </p>
              </div>
            </motion.div>
          ) : null}
          {razorpay?.configured && !razorpay.webhookConfigured ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No webhook secret is set (<code className="text-xs">RAZORPAY_WEBHOOK_SECRET</code>). Payments are still confirmed when the customer returns and by the background check, but a webhook makes activation instant if the customer closes the page early.
                </p>
              </div>
            </motion.div>
          ) : null}
          {stats?.needsReview ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <button type="button" onClick={() => setTab("payments")} className="flex w-full items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="font-semibold">{stats.needsReview} payment{stats.needsReview === 1 ? "" : "s"} need review.</span> Money was captured but did not match the plan price. Open Payments to check.
                </span>
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Free customers" value={counts.FREE ?? 0} tone="neutral" />
          <StatCard icon={Star} label="Basic members" value={counts.BASIC ?? 0} tone="primary" delay={60} trendLabel={stats?.expiringSoon ? `${stats.expiringSoon} expiring in 7 days` : undefined} />
          <StatCard icon={Crown} label="Premium members" value={counts.PREMIUM ?? 0} tone="accent" delay={120} />
          <StatCard icon={CreditCard} label="Membership revenue (30 days)" value={0} display={inr(stats?.revenue30d)} tone="success" delay={180} trendLabel={stats ? `${inr(stats.revenueTotal)} all time` : undefined} />
        </div>

        <SegmentedControl
          label="Membership view"
          options={[
            { value: "plans", label: "Plans & pricing", icon: Sparkles },
            { value: "payments", label: "Razorpay payments", icon: CreditCard },
          ]}
          value={tab}
          onChange={setTab}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {tab === "plans" ? (
              loading ? (
                <LoadingOrb compact label="Loading plans…" />
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <PlanEditor segment="BASIC" icon={Star} saved={saved.BASIC} form={forms.BASIC} onChange={(f) => setForms((c) => ({ ...c, BASIC: f }))} onSave={() => void savePlan("BASIC")} saving={savingSegment === "BASIC"} />
                    <PlanEditor segment="PREMIUM" icon={Crown} saved={saved.PREMIUM} form={forms.PREMIUM} onChange={(f) => setForms((c) => ({ ...c, PREMIUM: f }))} onSave={() => void savePlan("PREMIUM")} saving={savingSegment === "PREMIUM"} />
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">{center?.freePlan?.name ?? "Free"} plan (default)</p>
                      <p className="text-muted-foreground">{center?.freePlan?.tagline} Always active for new customers; it has no price.</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <PaymentsTab razorpay={razorpay} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
