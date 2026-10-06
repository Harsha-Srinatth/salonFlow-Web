"use client";

import { AnimatePresence, motion } from "motion/react";
import { BorderBeam } from "border-beam";
import { Check, Coins, Gift, Loader2, Pencil, Plus, Save, Settings2, ShieldAlert, Sparkles, Trash2, Undo2, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "../portal/admin-layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { useConfirm } from "@/admin/components/confirm-dialog";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { SlideOver } from "@/admin/components/slide-over";
import { Switch } from "@/admin/components/service-editor-drawer";
import { StatCard } from "@/admin/components/stat-card";
import { StatusPill } from "@/admin/components/status-pill";
import { Stepper } from "@/admin/components/stepper";
import { SegmentedControl } from "@/components/fx/segmented-control";
import { LoadingOrb } from "@/components/shared/loading-orb";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { cn } from "@/lib/utils";

const GENDER_BADGE = {
  MEN: "bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300",
  WOMEN: "bg-pink-100 text-pink-900 dark:bg-pink-900/20 dark:text-pink-300",
  UNISEX: "bg-muted text-muted-foreground",
};

const EMPTY_CARD_FORM = { serviceId: "", rank: "1", probabilityPercent: "10", isActive: true };
const DEFAULT_SETTINGS = {
  referrerRewardPoints: "150",
  referredWelcomePoints: "75",
  firstBookingDiscountPercent: "10",
  coolingHours: "24",
  autoApproveMaxRisk: "29",
  autoRejectMinRisk: "70",
};
const REFERRAL_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "REWARDED", label: "Rewarded" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
];

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

const inr = (n) => `Rs ${Number(n || 0).toLocaleString("en-IN")}`;
const dateLabel = (value) => new Date(value).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

/** Risk score 0-100 split into the three zones the thresholds create. */
function RiskZones({ approveMax, rejectMin }) {
  const a = Math.min(100, Math.max(0, Number(approveMax) || 0));
  const r = Math.min(100, Math.max(a, Number(rejectMin) || 100));
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Auto-approve up to ${a}, review ${a + 1} to ${r - 1}, auto-reject from ${r}`}>
        <motion.div animate={{ width: `${a}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} className="bg-success" />
        <motion.div animate={{ width: `${Math.max(0, r - a)}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} className="bg-warning" />
        <motion.div animate={{ width: `${Math.max(0, 100 - r)}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} className="bg-destructive" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
        <span><span className="mr-1 inline-block size-2 rounded-full bg-success" />Paid out automatically: 0–{a}</span>
        <span className="text-center"><span className="mr-1 inline-block size-2 rounded-full bg-warning" />Held for review: {a + 1}–{Math.max(a + 1, r - 1)}</span>
        <span className="text-right"><span className="mr-1 inline-block size-2 rounded-full bg-destructive" />Rejected: {r}+</span>
      </div>
    </div>
  );
}

export default function AdminLoyaltyPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [referrals, setReferrals] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [decidingId, setDecidingId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState("Failed manual verification");
  const [referralFilter, setReferralFilter] = useState("ALL");
  const [summary, setSummary] = useState({ totalReferrals: 0, rewardedReferrals: 0, pendingReferrals: 0, coolingReferrals: 0, rejectedReferrals: 0, needsReviewCount: 0, totalPointsIssued: 0, walletLiability: 0, pendingLiability: 0 });
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_SETTINGS);
  const [services, setServices] = useState([]);
  const [cards, setCards] = useState([]);
  const [cardForm, setCardForm] = useState(EMPTY_CARD_FORM);
  const [cardOpen, setCardOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [savingCard, setSavingCard] = useState(false);

  const settingsDirty = JSON.stringify(settingsForm) !== JSON.stringify(savedSettings);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch("/api/admin/loyalty");
      setReferrals(data.referrals ?? []);
      setReviewQueue(data.reviewQueue ?? []);
      if (data.summary) setSummary(data.summary);
      const next = {
        referrerRewardPoints: String(data.settings?.referrerRewardPoints ?? 150),
        referredWelcomePoints: String(data.settings?.referredWelcomePoints ?? 75),
        firstBookingDiscountPercent: String(data.settings?.firstBookingDiscountPercent ?? 10),
        coolingHours: String(data.settings?.coolingHours ?? 24),
        autoApproveMaxRisk: String(data.settings?.autoApproveMaxRisk ?? 29),
        autoRejectMinRisk: String(data.settings?.autoRejectMinRisk ?? 70),
      };
      setSettingsForm(next);
      setSavedSettings(next);
      setLoadError("");
    } catch (error) {
      const message = error.message ?? "Could not load loyalty overview";
      toast.error(message);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCards = useCallback(async () => {
    try {
      const data = await authFetch("/api/admin/loyalty/cards");
      setCards(data.cards ?? []);
    } catch (error) {
      toast.error(error.message ?? "Could not load reward cards");
    }
  }, []);

  const loadServices = useCallback(async () => {
    try {
      const data = await authFetch("/api/admin/services");
      setServices((data.services ?? []).filter((service) => service.isActive !== false));
    } catch {
      // Non-critical for the rest of the page: the card form just won't have options yet.
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    void loadCards();
    void loadServices();
  }, [loadOverview, loadCards, loadServices]);

  function openNewCard() {
    setEditingCardId(null);
    setCardForm(EMPTY_CARD_FORM);
    setCardOpen(true);
  }

  function editCard(card) {
    setEditingCardId(card.id);
    setCardForm({ serviceId: card.serviceId, rank: String(card.rank), probabilityPercent: String(card.probabilityPercent), isActive: card.isActive });
    setCardOpen(true);
  }

  async function saveCard() {
    if (!cardForm.serviceId) {
      toast.error("Choose a service for this card");
      return;
    }
    setSavingCard(true);
    try {
      const path = editingCardId ? `/api/admin/loyalty/cards/${editingCardId}` : "/api/admin/loyalty/cards";
      await authFetch(path, {
        method: editingCardId ? "PATCH" : "POST",
        body: JSON.stringify({ serviceId: cardForm.serviceId, rank: Number(cardForm.rank), probabilityPercent: Number(cardForm.probabilityPercent), isActive: cardForm.isActive }),
      });
      toast.success(editingCardId ? "Reward card updated" : "Reward card added");
      setCardOpen(false);
      await loadCards();
    } catch (error) {
      toast.error(error.message ?? "Could not save reward card");
    } finally {
      setSavingCard(false);
    }
  }

  async function deleteCard(id) {
    if (!(await confirm({ title: "Remove this reward card?", description: "Customers will no longer be able to earn it.", confirmLabel: "Remove", hold: true }))) return;
    try {
      await authFetch(`/api/admin/loyalty/cards/${id}`, { method: "DELETE" });
      toast.success("Reward card removed");
      await loadCards();
    } catch (error) {
      toast.error(error.message ?? "Could not remove reward card");
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await authFetch("/api/admin/loyalty/settings", {
        method: "PATCH",
        body: JSON.stringify({
          referrerRewardPoints: Number(settingsForm.referrerRewardPoints),
          referredWelcomePoints: Number(settingsForm.referredWelcomePoints),
          firstBookingDiscountPercent: Number(settingsForm.firstBookingDiscountPercent),
          coolingHours: Number(settingsForm.coolingHours),
          autoApproveMaxRisk: Number(settingsForm.autoApproveMaxRisk),
          autoRejectMinRisk: Number(settingsForm.autoRejectMinRisk),
        }),
      });
      toast.success("Reward amounts saved");
      await loadOverview();
    } catch (error) {
      toast.error(error.message ?? "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  async function approveReferral(referralId) {
    setDecidingId(referralId);
    try {
      await authFetch(`/api/admin/loyalty/referrals/${referralId}/approve`, { method: "POST" });
      toast.success("Referral approved and credited");
      await loadOverview();
    } catch (error) {
      toast.error(error.message ?? "Could not update referral");
    } finally {
      setDecidingId(null);
    }
  }

  async function confirmReject() {
    if (!rejecting) return;
    setDecidingId(rejecting.id);
    try {
      await authFetch(`/api/admin/loyalty/referrals/${rejecting.id}/reject`, { method: "POST", body: JSON.stringify({ reason: rejectReason }) });
      toast.success("Referral rejected and credit reversed");
      setRejecting(null);
      await loadOverview();
    } catch (error) {
      toast.error(error.message ?? "Could not update referral");
    } finally {
      setDecidingId(null);
    }
  }

  const setting = (key) => (value) => setSettingsForm((current) => ({ ...current, [key]: value }));
  const shownReferrals = useMemo(() => referrals.filter((r) => referralFilter === "ALL" || (referralFilter === "PENDING" ? r.status !== "REWARDED" && r.status !== "REJECTED" : r.status === referralFilter)), [referrals, referralFilter]);
  const totalOdds = cards.filter((c) => c.isActive).reduce((sum, c) => sum + Number(c.probabilityPercent || 0), 0);

  const tabs = [
    { value: "overview", label: reviewQueue.length ? `Overview · ${reviewQueue.length} to review` : "Overview", icon: Sparkles },
    { value: "rules", label: "Rewards & rules", icon: Settings2 },
    { value: "vault", label: "Reward vault", icon: Gift },
    { value: "referrals", label: "Referrals", icon: Users },
  ];

  return (
    <AdminLayout pageTitle="Loyalty & Referrals" description="Referral codes, wallet rewards, and configurable payout amounts.">
      <div className="space-y-5 pb-20">
        <ErrorBanner message={loadError} onRetry={() => void loadOverview()} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Total referrals" value={summary.totalReferrals} tone="primary" />
          <StatCard icon={Sparkles} label="Rewarded" value={summary.rewardedReferrals} tone="success" delay={60} />
          <StatCard icon={Gift} label="Needs review" value={summary.needsReviewCount} tone="warning" delay={120} />
          <StatCard icon={Coins} label="Wallet liability" value={0} display={`${inr(summary.walletLiability)}${summary.pendingLiability ? ` (+${Number(summary.pendingLiability).toLocaleString("en-IN")} held)` : ""}`} tone="accent" delay={180} />
        </div>

        <div className="max-w-full overflow-x-auto pb-1">
          <SegmentedControl label="Loyalty sections" options={tabs} value={tab} onChange={setTab} />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-5">
            {tab === "overview" ? (
              loading && !referrals.length ? (
                <LoadingOrb compact label="Loading loyalty overview…" />
              ) : (
                <>
                  {reviewQueue.length ? (
                    <section className="admin-shadow-sm overflow-hidden rounded-2xl border border-warning/40 bg-card">
                      <header className="flex items-start gap-3 border-b border-warning/30 bg-warning/5 px-5 py-4">
                        <ShieldAlert className="mt-0.5 size-5 text-warning" />
                        <div>
                          <h2 className="font-display text-base font-semibold">Referrals held for review ({reviewQueue.length})</h2>
                          <p className="text-xs text-muted-foreground">These cleared their cooling period but tripped enough risk signals to need a person. Nothing is credited until you decide.</p>
                        </div>
                      </header>
                      <ul className="space-y-3 p-4">
                        <AnimatePresence initial={false}>
                          {reviewQueue.map((referral) => (
                            <motion.li key={referral.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }} className="space-y-3 rounded-xl border border-border/70 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <AvatarBadge name={referral.referrerName} />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                      {referral.referrerName} → {referral.referredName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{inr(referral.rewardPoints + referral.welcomePoints)} at stake</p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                  <div className="text-right">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Risk</p>
                                    <p className={cn("text-lg font-bold tabular-nums", referral.riskScore >= 50 ? "text-destructive" : "text-warning")}>{referral.riskScore}</p>
                                  </div>
                                  <Button size="sm" variant="outline" disabled={decidingId === referral.id} onClick={() => { setRejectReason("Failed manual verification"); setRejecting(referral); }}>
                                    Reject
                                  </Button>
                                  <Button size="sm" disabled={decidingId === referral.id} onClick={() => void approveReferral(referral.id)}>
                                    {decidingId === referral.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Approve &amp; pay
                                  </Button>
                                </div>
                              </div>
                              <ul className="flex flex-wrap gap-1.5">
                                {(referral.riskSignals ?? []).map((signal) => (
                                  <li key={signal.key} className="rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
                                    {signal.label}
                                  </li>
                                ))}
                              </ul>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    </section>
                  ) : (
                    <EmptyState icon={ShieldAlert} compact title="Nothing waiting for review" description="Referrals that need a person to decide will appear here." />
                  )}

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["Cooling period", summary.coolingReferrals, "Waiting before payout"],
                      ["Pending", summary.pendingReferrals, "Not converted yet"],
                      ["Rejected", summary.rejectedReferrals, "Blocked or reversed"],
                    ].map(([label, value, hint]) => (
                      <div key={label} className="admin-shadow-sm rounded-2xl border border-border/70 bg-card px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
                        <p className="text-xs text-muted-foreground">{hint}</p>
                      </div>
                    ))}
                  </div>
                </>
              )
            ) : null}

            {tab === "rules" ? (
              <section className="admin-shadow-sm overflow-hidden rounded-2xl border border-border/70 bg-card">
                <header className="border-b border-border/60 bg-muted/20 px-5 py-4">
                  <h2 className="font-display text-base font-semibold">Reward amounts</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">A referral reward is earned when the referred customer completes their first booking, then held for the cooling period while it is checked for abuse. Both sides can see it, but it is not spendable until it clears.</p>
                </header>
                <div className="space-y-6 p-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Stepper id="referrer" label="Referrer reward" hint="Credited to the person who shared their code." value={settingsForm.referrerRewardPoints} onChange={setting("referrerRewardPoints")} min={0} step={10} prefix="Rs" />
                    <Stepper id="welcome" label="Welcome bonus" hint="Credited to the new customer who signed up via referral." value={settingsForm.referredWelcomePoints} onChange={setting("referredWelcomePoints")} min={0} step={10} prefix="Rs" />
                  </div>
                  <div className="grid gap-5 border-t border-border/60 pt-5 sm:grid-cols-2">
                    <Stepper id="firstBooking" label="First booking discount" hint="Applied automatically on a brand-new customer's very first booking, on top of any running offers." value={settingsForm.firstBookingDiscountPercent} onChange={setting("firstBookingDiscountPercent")} min={0} max={100} step={0.5} suffix="%" />
                    <Stepper id="cooling" label="Cooling period" hint="Reward is shown but held before it becomes spendable. 0 pays out immediately." value={settingsForm.coolingHours} onChange={setting("coolingHours")} min={0} max={720} step={6} suffix="hours" />
                  </div>
                  <div className="space-y-4 border-t border-border/60 pt-5">
                    <div>
                      <p className="text-sm font-semibold">Referral verification</p>
                      <p className="text-xs text-muted-foreground">Every referral gets a risk score. The two limits decide what happens to it.</p>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Stepper id="approve" label="Auto-approve up to" hint="Risk score paid out with no review." value={settingsForm.autoApproveMaxRisk} onChange={setting("autoApproveMaxRisk")} min={0} max={100} step={1} />
                      <Stepper id="reject" label="Auto-reject from" hint="Anything between the two lands in the review queue." value={settingsForm.autoRejectMinRisk} onChange={setting("autoRejectMinRisk")} min={1} max={100} step={1} />
                    </div>
                    <RiskZones approveMax={settingsForm.autoApproveMaxRisk} rejectMin={settingsForm.autoRejectMinRisk} />
                  </div>
                </div>
              </section>
            ) : null}

            {tab === "vault" ? (
              <section className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="max-w-2xl text-sm text-muted-foreground">Each time a referral converts, the referrer draws one of these cards and wins that service free. Cards a customer can win are filtered by the service's own audience (Men / Women / Unisex), so add a mix to build separate pools.</p>
                  <BorderBeam size="sm">
                    <Button type="button" onClick={openNewCard}>
                      <Plus className="size-4" /> Add reward card
                    </Button>
                  </BorderBeam>
                </div>
                {cards.length ? <p className="text-xs text-muted-foreground">Active cards add up to <span className="font-semibold text-foreground">{totalOdds.toFixed(1)}%</span> odds.</p> : null}
                {!cards.length ? (
                  <EmptyState icon={Gift} title="No reward cards yet" description="Add services to build the reward vault your referrers draw from." actionLabel="Add reward card" onAction={openNewCard} />
                ) : (
                  <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                      {cards.map((card, index) => (
                        <motion.div key={card.id} layout initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 380, damping: 32, delay: Math.min(index, 8) * 0.03 }} whileHover={{ y: -3 }} className={cn("admin-shadow-sm rounded-2xl border border-border/70 bg-card p-4", !card.isActive && "opacity-70")}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">#{card.rank}</span>
                            <div className="flex gap-1">
                              <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${card.serviceName}`} onClick={() => editCard(card)}>
                                <Pencil className="size-4" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${card.serviceName}`} onClick={() => void deleteCard(card.id)}>
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <p className="mt-3 font-display text-base font-semibold leading-tight">{card.serviceName}</p>
                          <p className="text-xs text-muted-foreground">{inr(card.serviceBasePrice)} value</p>
                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Odds</span>
                              <span className="font-semibold text-foreground">{card.probabilityPercent}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${Math.min(100, card.probabilityPercent)}%` }} transition={{ type: "spring", stiffness: 110, damping: 20 }} />
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", GENDER_BADGE[card.serviceTargetGender] ?? GENDER_BADGE.UNISEX)}>{card.serviceTargetGender}</span>
                            {!card.isActive ? <StatusPill status="INACTIVE" /> : null}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </section>
            ) : null}

            {tab === "referrals" ? (
              <section className="space-y-4">
                <div className="max-w-full overflow-x-auto pb-1">
                  <SegmentedControl label="Referral status" options={REFERRAL_FILTERS} value={referralFilter} onChange={setReferralFilter} />
                </div>
                {loading && !referrals.length ? <LoadingOrb compact label="Loading referrals…" /> : null}
                {!loading && !shownReferrals.length ? <EmptyState icon={Gift} title="No referrals here" description={referrals.length ? "Try a different filter." : "Once customers start sharing their referral link, activity will show up here."} /> : null}
                <motion.div layout className="space-y-2.5">
                  <AnimatePresence initial={false} mode="popLayout">
                    {shownReferrals.map((referral, index) => (
                      <motion.div key={referral.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 32, delay: Math.min(index, 8) * 0.02 }} className="admin-shadow-sm flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <AvatarBadge name={referral.referrerName} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {referral.referrerName} <span className="text-muted-foreground">invited</span> {referral.referredName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {dateLabel(referral.createdAt)}
                              {referral.status === "REWARDED" ? ` · ${inr(referral.rewardPoints)} + ${inr(referral.welcomePoints)} issued` : ""}
                              {referral.status === "REJECTED" && referral.rejectedReason ? ` · ${referral.rejectedReason}` : ""}
                              {referral.riskScore ? ` · risk ${referral.riskScore}` : ""}
                            </p>
                          </div>
                        </div>
                        <StatusPill status={referral.needsReview ? "NEEDS REVIEW" : referral.status} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </section>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Settings save bar */}
      <AnimatePresence>
        {settingsDirty ? (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 34 }} className="fixed inset-x-3 bottom-4 z-30 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur">
            <span className="flex items-center gap-2 pl-1 text-sm font-medium">
              <span className="size-2 rounded-full bg-warning" /> Unsaved reward settings
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setSettingsForm(savedSettings)} disabled={saving}>
                <Undo2 className="size-4" /> Discard
              </Button>
              <BorderBeam size="sm" active={!saving}>
                <Button type="button" onClick={() => void saveSettings()} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {saving ? "Saving…" : "Save reward amounts"}
                </Button>
              </BorderBeam>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Reward card editor */}
      <SlideOver
        open={cardOpen}
        onOpenChange={setCardOpen}
        title={editingCardId ? "Edit reward card" : "Add reward card"}
        description="The service a referrer can win for free."
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCardOpen(false)} disabled={savingCard}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveCard()} disabled={savingCard}>
              {savingCard ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {savingCard ? "Saving…" : editingCardId ? "Save card" : "Add card"}
            </Button>
          </div>
        }
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Service</p>
            <Select value={cardForm.serviceId} onValueChange={(value) => setCardForm({ ...cardForm, serviceId: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} · Rs {Number(service.basePrice ?? 0).toFixed(0)} · {service.gender ?? "UNISEX"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Stepper id="card-rank" label="Rank" hint="1 is the top prize." value={cardForm.rank} onChange={(value) => setCardForm({ ...cardForm, rank: value })} min={1} max={5} />
            <Stepper id="card-odds" label="Probability" hint="Chance of drawing this card." value={cardForm.probabilityPercent} onChange={(value) => setCardForm({ ...cardForm, probabilityPercent: value })} min={0} max={100} step={0.5} suffix="%" />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Inactive cards cannot be drawn.</p>
            </div>
            <Switch checked={cardForm.isActive} onChange={(isActive) => setCardForm({ ...cardForm, isActive })} label="Card active" />
          </div>
        </div>
      </SlideOver>

      {/* Reject reason (replaces the browser prompt) */}
      <SlideOver
        open={Boolean(rejecting)}
        onOpenChange={(open) => !open && setRejecting(null)}
        title="Reject referral"
        description={rejecting ? `${rejecting.referrerName} → ${rejecting.referredName}. Any credit is reversed.` : ""}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRejecting(null)} disabled={Boolean(decidingId)}>
              <X className="size-4" /> Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={Boolean(decidingId) || !rejectReason.trim()} onClick={() => void confirmReject()}>
              {decidingId ? <Loader2 className="size-4 animate-spin" /> : null} Reject referral
            </Button>
          </div>
        }
      >
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-5">
          <label htmlFor="reject-reason" className="text-sm font-medium">
            Reason
          </label>
          <textarea id="reject-reason" rows={4} maxLength={300} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
          <div className="flex flex-wrap gap-1.5">
            {["Failed manual verification", "Duplicate account", "Self-referral", "Suspicious activity"].map((reason) => (
              <button key={reason} type="button" onClick={() => setRejectReason(reason)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted">
                {reason}
              </button>
            ))}
          </div>
        </div>
      </SlideOver>
      {confirmDialog}
    </AdminLayout>
  );
}
