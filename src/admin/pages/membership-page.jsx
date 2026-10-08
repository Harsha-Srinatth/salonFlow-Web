"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ChevronLeft, ChevronRight, CreditCard, Crown, ExternalLink, Plus, RefreshCw, RotateCcw, Save, Search, ShieldCheck, Sparkles, Star, Tag, Trash2, Users, Webhook } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { notify as toast } from "@/lib/notify";
import { AdminLayout } from "../portal/admin-layout";
import { AnimatedTabBar, ButtonLoadingMorph, ErrorState, FloatingLabelInput, IconButton, ResponsiveTable, StatCard, StatusChip, TONE_CLASSES, useAsyncAction } from "@/components/kit";
import { SkeletonCard, spring } from "@/components/motion";
import { FilterTabs } from "@/admin/components/filter-tabs";
import { dateOf, dayTimeOf } from "@/admin/lib/safe-format";
import { formatMoney, formatPhone } from "@/lib/format";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { Switch } from "@/admin/components/switch";
import { getFirebaseIdToken } from "@/lib/auth/id-token";
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
// Razorpay purchase states → the shared StatusChip vocabulary (DESIGN.md §6a).
const STATUS_KEY = { PAID: "PAID", CREATED: "PENDING", FAILED: "FAILED", EXPIRED: "EXPIRED", MISMATCH: "NEEDS REVIEW", REFUNDED: "REFUNDED" };
// Plan amounts in this API are rupees (priceAmount, amount), not paise.
const inr = (n) => formatMoney(n);
const fmt = (value) => dayTimeOf(value);
const fmtDate = (value) => dateOf(value);

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

function PlanEditor({ segment, icon: Icon, saved, form, onChange, onSave }) {
  const reduce = useReducedMotion();
  const save = useAsyncAction({ successMs: 900 });
  const dirty = JSON.stringify(form) !== JSON.stringify(planToForm(saved));
  const price = Number(form.priceAmount);
  const priceChanged = saved && Number(saved.priceAmount) !== price;
  const setBenefit = (i, value) => onChange({ ...form, benefits: form.benefits.map((b, idx) => (idx === i ? value : b)) });
  return (
    <motion.section initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="flex flex-col overflow-hidden rounded-card border border-border/60 bg-card shadow-soft">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gold/16 text-ink-warning ring-1 ring-inset ring-gold/35">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-headline font-semibold">{segment === "BASIC" ? "Basic" : "Premium"}</h2>
            <p className="text-caption text-ink-neutral">{form.isActive ? "On sale" : "Hidden"}</p>
          </div>
        </div>
        <Switch checked={form.isActive} onChange={(isActive) => onChange({ ...form, isActive })} label={`${segment} plan on sale`} />
      </header>

      <div className="flex-1 space-y-5 p-4 sm:p-5">
        <div className="rounded-2xl bg-portal/8 p-4 ring-1 ring-inset ring-portal/20 focus-within:ring-2 focus-within:ring-portal">
          <label htmlFor={`price-${segment}`} className="text-micro font-semibold uppercase text-ink-neutral">
            Price · Razorpay charge
          </label>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-ink-neutral">₹</span>
            <input id={`price-${segment}`} inputMode="numeric" type="number" min="1" value={form.priceAmount} onChange={(e) => onChange({ ...form, priceAmount: e.target.value })} className="w-full min-w-0 bg-transparent font-display text-4xl font-bold tracking-tight tabular-nums outline-none" />
          </div>
          <AnimatePresence initial={false}>
            {priceChanged ? (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-2 text-caption text-ink-neutral">
                New payments only. Current members keep their period.
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatedTabBar fullWidth size="sm" label="Membership period" items={DURATIONS.map((d) => ({ value: `${d.value}`, label: d.value === 12 ? "1 yr" : `${d.value} mo` }))} value={`${form.durationMonths}`} onChange={(v) => onChange({ ...form, durationMonths: Number(v) })} />

        <div className="grid gap-3">
          <FloatingLabelInput label="Plan name" icon={Tag} value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} />
          <FloatingLabelInput label="Tagline" icon={Sparkles} value={form.tagline} onChange={(e) => onChange({ ...form, tagline: e.target.value })} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-caption font-semibold text-ink-neutral">Benefits · {form.benefits.filter((b) => b.trim()).length}</p>
            <ButtonLoadingMorph size="sm" variant="outline" icon={Plus} onClick={() => onChange({ ...form, benefits: [...form.benefits, ""] })}>
              Add
            </ButtonLoadingMorph>
          </div>
          <AnimatePresence initial={false}>
            {form.benefits.map((benefit, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1">
                <FloatingLabelInput label={`Benefit ${i + 1}`} value={benefit} onChange={(e) => setBenefit(i, e.target.value)} />
                <IconButton icon={Trash2} label={`Remove benefit ${i + 1}`} className="text-ink-destructive" onClick={() => onChange({ ...form, benefits: form.benefits.filter((_, idx) => idx !== i) })} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3 sm:px-5">
        <span className={cn("text-caption font-semibold", dirty ? "text-ink-warning" : "text-ink-neutral")}>{dirty ? "Unsaved" : "Saved"}</span>
        <div className="flex gap-2">
          {dirty ? (
            <ButtonLoadingMorph variant="ghost" icon={RotateCcw} onClick={() => onChange(planToForm(saved))}>
              Reset
            </ButtonLoadingMorph>
          ) : null}
          <ButtonLoadingMorph icon={Save} state={save.state} disabled={!dirty && save.state === "idle"} loadingLabel="Saving…" successLabel="Saved" onClick={() => save.run(onSave)}>
            Save
          </ButtonLoadingMorph>
        </div>
      </footer>
    </motion.section>
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
      throw e;
    } finally {
      setLoading(false);
    }
  }, [status, query, offset]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function reconcile(id) {
    setCheckingId(id);
    try {
      const { result } = await authFetch(`/api/admin/membership/purchases/${id}/reconcile`, { method: "POST" });
      toast.success(result === "ACTIVATED" ? "Confirmed · membership activated" : result === "ALREADY_PAID" ? "Already confirmed" : `Razorpay: ${`${result}`.toLowerCase().replace(/_/g, " ")}`);
      await load().catch(() => {});
    } catch (e) {
      toast.error(e.message ?? "Could not check with Razorpay");
    } finally {
      setCheckingId("");
    }
  }

  const columns = [
    {
      key: "customer",
      header: "Customer",
      primary: true,
      cell: (p) => (
        <span className="flex min-w-0 items-center gap-3">
          <AvatarBadge name={p.customer?.name || p.customer?.email || "?"} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{p.customer?.name || "Deleted customer"}</span>
            <span className="block truncate text-caption text-ink-neutral">{[p.customer?.phone ? formatPhone(p.customer.phone) : "", p.customer?.email].filter(Boolean).join(" · ") || "—"}</span>
          </span>
        </span>
      ),
    },
    { key: "plan", header: "Plan", secondary: true, cell: (p) => `${p.planName} · ${p.durationMonths === 12 ? "1 year" : `${p.durationMonths} mo`}` },
    { key: "amount", header: "Amount", align: "right", cell: (p) => <span className="font-semibold tabular-nums">{inr(p.amount)}</span> },
    { key: "when", header: "When", cell: (p) => <span className="whitespace-nowrap text-caption">{fmt(p.paidAt ?? p.createdAt)}</span> },
    {
      key: "ref",
      header: "Razorpay",
      hideOnMobile: true,
      cell: (p) => (
        <span className="block max-w-40 truncate font-mono text-[11px] text-ink-neutral" title={p.failureReason ?? undefined}>
          {p.razorpayPaymentId ?? p.razorpayOrderId ?? "No order"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      trailing: true,
      cell: (p) => (
        <span className="flex items-center justify-end gap-1">
          <StatusChip status={STATUS_KEY[p.status] ?? p.status} size="sm" />
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs label="Payment status" options={STATUS_FILTERS} value={status} onChange={(value) => { setStatus(value); setOffset(0); }} className="min-w-0" />
        <div className="flex items-center gap-2">
          <label className="relative block min-w-0 flex-1 lg:w-72">
            <span className="sr-only">Search membership payments</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-neutral" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone, email, Razorpay id" className="h-11 w-full rounded-control bg-card pr-3 pl-10 text-sm shadow-soft ring-1 ring-inset ring-border/60 outline-none placeholder:text-ink-neutral focus-visible:ring-2 focus-visible:ring-portal" />
          </label>
          <IconButton icon={RefreshCw} label="Refresh" variant="soft" onClick={() => load().catch(() => {})} />
        </div>
      </div>

      {error && !data.purchases.length ? (
        <ErrorState title="Couldn't load payments" description={error} onRetry={load} />
      ) : (
        <ResponsiveTable
          caption="Membership payments"
          columns={columns}
          rows={data.purchases}
          loading={loading}
          empty={<EmptyState illustration="bag" icon={CreditCard} title="No payments yet" description={razorpay?.configured ? "Plan purchases land here." : "Connect Razorpay to sell plans."} />}
        />
      )}

      {data.purchases.some((p) => ["CREATED", "MISMATCH", "FAILED"].includes(p.status) || p.razorpayUrl) ? (
        <div className="space-y-2">
          <p className="text-caption font-semibold text-ink-neutral">Actions</p>
          <ul className="grid gap-2 md:grid-cols-2">
            {data.purchases
              .filter((p) => ["CREATED", "MISMATCH", "FAILED"].includes(p.status) || p.razorpayUrl)
              .map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-card p-3 shadow-soft ring-1 ring-inset ring-border/60">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{p.customer?.name || "Customer"} · {inr(p.amount)}</span>
                    {p.failureReason && p.status !== "PAID" ? <span className="block truncate text-caption text-ink-destructive">{p.failureReason}</span> : p.status === "PAID" ? <span className="block text-caption text-ink-neutral">Valid {fmtDate(p.startsAt)} – {fmtDate(p.expiresAt)}</span> : null}
                  </span>
                  <span className="flex gap-1.5">
                    {["CREATED", "MISMATCH", "FAILED"].includes(p.status) ? (
                      <ButtonLoadingMorph size="sm" variant="outline" icon={ShieldCheck} state={checkingId === p.id ? "loading" : "idle"} loadingLabel="Checking…" onClick={() => void reconcile(p.id)}>
                        Verify
                      </ButtonLoadingMorph>
                    ) : null}
                    {p.razorpayUrl ? (
                      <a href={p.razorpayUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-portal hover:bg-portal/10">
                        <ExternalLink className="size-4" aria-hidden /> Razorpay
                      </a>
                    ) : null}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {data.total > data.limit ? (
        <div className="flex items-center justify-between">
          <p className="text-caption text-ink-neutral tabular-nums">
            {offset + 1}–{Math.min(offset + data.limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <IconButton icon={ChevronLeft} label="Previous page" variant="outline" disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - data.limit))} />
            <IconButton icon={ChevronRight} label="Next page" variant="outline" disabled={offset + data.limit >= data.total} onClick={() => setOffset(offset + data.limit)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminMembershipPage() {
  const [loading, setLoading] = useState(true);
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
      setLoadError(error.message ?? "Could not load membership plans");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCenter().catch(() => {});
  }, [loadCenter]);

  const saved = useMemo(() => Object.fromEntries((center?.paidPlans ?? []).map((plan) => [plan.segment, plan])), [center]);

  async function savePlan(segment) {
    const form = forms[segment];
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
      throw error;
    }
  }

  const counts = center?.customerCounts ?? { FREE: 0, BASIC: 0, PREMIUM: 0 };
  const stats = center?.stats;
  const razorpay = center?.razorpay;

  const firstLoad = loading && !center;

  return (
    <AdminLayout
      pageTitle="Memberships"
      description="Razorpay plans and payments"
      actions={
        razorpay ? (
          <span className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-caption font-semibold ring-1 ring-inset", razorpay.configured ? TONE_CLASSES.success : TONE_CLASSES.warning)}>
            <CreditCard className="size-3.5" aria-hidden />
            {razorpay.configured ? (razorpay.mode === "live" ? "Razorpay live" : razorpay.mode === "test" ? "Razorpay test" : "Razorpay on") : "Razorpay off"}
          </span>
        ) : null
      }
    >
      <div className="space-y-5">
        <ErrorBanner message={center ? loadError : ""} onRetry={loadCenter} />

        <AnimatePresence initial={false}>
          {razorpay && !razorpay.configured ? (
            <motion.p key="rz" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("flex items-start gap-2 rounded-2xl p-3 text-sm ring-1 ring-inset", TONE_CLASSES.warning)}>
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <b>Razorpay not connected.</b> Set <code className="text-xs">RAZORPAY_KEY_ID</code> and <code className="text-xs">RAZORPAY_KEY_SECRET</code> on the server.
              </span>
            </motion.p>
          ) : null}
          {razorpay?.configured && !razorpay.webhookConfigured ? (
            <motion.p key="wh" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("flex items-start gap-2 rounded-2xl p-3 text-sm ring-1 ring-inset", TONE_CLASSES.neutral)}>
              <Webhook className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                No webhook secret (<code className="text-xs">RAZORPAY_WEBHOOK_SECRET</code>). Payments still confirm, just not instantly if the customer closes the page.
              </span>
            </motion.p>
          ) : null}
          {stats?.needsReview ? (
            <motion.button key="rv" type="button" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => setTab("payments")} className={cn("flex w-full items-start gap-2 rounded-2xl p-3 text-left text-sm ring-1 ring-inset", TONE_CLASSES.destructive)}>
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <b>{stats.needsReview} to review.</b> Captured amount didn't match the plan price.
              </span>
            </motion.button>
          ) : null}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard icon={Users} label="Free" value={counts.FREE ?? 0} tone="neutral" loading={firstLoad} />
          <StatCard icon={Star} label="Basic" value={counts.BASIC ?? 0} tone="gold" loading={firstLoad} />
          <StatCard icon={Crown} label="Premium" value={counts.PREMIUM ?? 0} tone="gold" loading={firstLoad} />
          <StatCard icon={CreditCard} label="Revenue · 30d" value={Number(stats?.revenue30d ?? 0)} format={inr} tone="success" loading={firstLoad} />
        </div>

        <AnimatedTabBar
          label="Membership view"
          items={[
            { value: "plans", label: "Plans", icon: Sparkles },
            { value: "payments", label: "Payments", icon: CreditCard, badge: stats?.needsReview || undefined },
          ]}
          value={tab}
          onChange={setTab}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={spring.soft}>
            {tab === "plans" ? (
              loadError && !center ? (
                <ErrorState title="Couldn't load plans" description={loadError} onRetry={loadCenter} />
              ) : firstLoad ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <PlanEditor segment="BASIC" icon={Star} saved={saved.BASIC} form={forms.BASIC} onChange={(f) => setForms((c) => ({ ...c, BASIC: f }))} onSave={() => savePlan("BASIC")} />
                    <PlanEditor segment="PREMIUM" icon={Crown} saved={saved.PREMIUM} form={forms.PREMIUM} onChange={(f) => setForms((c) => ({ ...c, PREMIUM: f }))} onSave={() => savePlan("PREMIUM")} />
                  </div>
                  <div className="flex items-start gap-3 rounded-card border border-dashed border-border bg-card/60 p-4 text-sm">
                    <Users className="mt-0.5 size-4 shrink-0 text-portal" aria-hidden />
                    <div>
                      <p className="font-semibold">{center?.freePlan?.name ?? "Free"} · default</p>
                      <p className="text-caption text-ink-neutral">{center?.freePlan?.tagline} Always on, no price.</p>
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
