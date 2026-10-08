"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Ban, Check, Coins, Gift, Pencil, Plus, Save, Search, Settings2, ShieldAlert, ShieldCheck, Sparkles, Trash2, Trophy, Undo2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatedTabBar, ButtonLoadingMorph, ConfirmSheet, ErrorState, FloatingLabelInput, IconButton, StatCard, StatusChip, TONE_CLASSES, useAsyncAction } from "@/components/kit";
import { SkeletonList, interaction, spring } from "@/components/motion";
import { notify } from "@/lib/notify";
import { AdminLayout } from "../portal/admin-layout";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { useConfirm } from "@/admin/components/confirm-dialog";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { FilterTabs } from "@/admin/components/filter-tabs";
import { Panel } from "@/admin/components/panel";
import { SkeletonCards } from "@/admin/components/skeleton";
import { SlideOver } from "@/admin/components/slide-over";
import { Stepper } from "@/admin/components/stepper";
import { Switch } from "@/admin/components/switch";
import { ToneChip } from "@/admin/components/tone-chip";
import { dateOf } from "@/admin/lib/safe-format";
import { getFirebaseIdToken } from "@/lib/auth/id-token";
import { toApiUrl } from "@/lib/api-base";
import { formatMoney } from "@/lib/format";
import { iconForAudience } from "@/lib/service-icons";
import { cn } from "@/lib/utils";

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
const REJECT_REASONS = ["Failed manual verification", "Duplicate account", "Self-referral", "Suspicious activity"];

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

// Wallet points are rupees one-for-one in this product.
const inr = (n) => formatMoney(n);

/** Risk score 0–100 split into the three zones the thresholds create. */
function RiskZones({ approveMax, rejectMin }) {
  const a = Math.min(100, Math.max(0, Number(approveMax) || 0));
  const r = Math.min(100, Math.max(a, Number(rejectMin) || 100));
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Auto-approve up to ${a}, review ${a + 1} to ${r - 1}, auto-reject from ${r}`}>
        <div style={{ flexGrow: a }} className="bg-success" />
        <div style={{ flexGrow: Math.max(0, r - a) }} className="bg-warning" />
        <div style={{ flexGrow: Math.max(0, 100 - r) }} className="bg-destructive" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-semibold text-ink-neutral">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3.5 text-ink-success" aria-hidden />0–{a}</span>
        <span className="flex items-center justify-center gap-1"><ShieldAlert className="size-3.5 text-ink-warning" aria-hidden />{a + 1}–{Math.max(a + 1, r - 1)}</span>
        <span className="flex items-center justify-end gap-1"><Ban className="size-3.5 text-ink-destructive" aria-hidden />{r}+</span>
      </div>
    </div>
  );
}

export default function AdminLoyaltyPage() {
  const reduce = useReducedMotion();
  const { ask, confirmSheet } = useConfirm();
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [referrals, setReferrals] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [decidingId, setDecidingId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [referralFilter, setReferralFilter] = useState("ALL");
  const [summary, setSummary] = useState({ totalReferrals: 0, rewardedReferrals: 0, pendingReferrals: 0, coolingReferrals: 0, rejectedReferrals: 0, needsReviewCount: 0, totalPointsIssued: 0, walletLiability: 0, pendingLiability: 0 });
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_SETTINGS);
  const [services, setServices] = useState([]);
  const [cards, setCards] = useState([]);
  const [cardForm, setCardForm] = useState(EMPTY_CARD_FORM);
  const [cardOpen, setCardOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [serviceQuery, setServiceQuery] = useState("");
  const saveSettingsAction = useAsyncAction({ successMs: 900 });
  const saveCardAction = useAsyncAction({ successMs: 700 });

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
      setLoadError(error.message ?? "Could not load loyalty overview");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCards = useCallback(async () => {
    try {
      const data = await authFetch("/api/admin/loyalty/cards");
      setCards(data.cards ?? []);
    } catch (error) {
      notify.error(error.message ?? "Could not load reward cards");
    }
  }, []);

  const loadServices = useCallback(async () => {
    try {
      const data = await authFetch("/api/admin/services");
      setServices((data.services ?? []).filter((service) => service.isActive !== false));
    } catch {
      // Non-critical: the card form just has no options yet.
    }
  }, []);

  useEffect(() => {
    loadOverview().catch(() => {});
    void loadCards();
    void loadServices();
  }, [loadOverview, loadCards, loadServices]);

  function openNewCard() {
    setEditingCardId(null);
    setCardForm(EMPTY_CARD_FORM);
    setServiceQuery("");
    setCardOpen(true);
  }

  function editCard(card) {
    setEditingCardId(card.id);
    setCardForm({ serviceId: card.serviceId, rank: String(card.rank), probabilityPercent: String(card.probabilityPercent), isActive: card.isActive });
    setServiceQuery("");
    setCardOpen(true);
  }

  async function saveCard() {
    if (!cardForm.serviceId) {
      notify.warning("Pick a service for this card");
      throw new Error("no service");
    }
    try {
      const path = editingCardId ? `/api/admin/loyalty/cards/${editingCardId}` : "/api/admin/loyalty/cards";
      await authFetch(path, {
        method: editingCardId ? "PATCH" : "POST",
        body: JSON.stringify({ serviceId: cardForm.serviceId, rank: Number(cardForm.rank), probabilityPercent: Number(cardForm.probabilityPercent), isActive: cardForm.isActive }),
      });
      notify.success(editingCardId ? "Reward card updated" : "Reward card added");
      setTimeout(() => setCardOpen(false), 600);
      await loadCards();
    } catch (error) {
      notify.error(error.message ?? "Could not save reward card");
      throw error;
    }
  }

  function deleteCard(card) {
    ask({
      title: "Remove this reward?",
      description: `${card.serviceName} can no longer be won.`,
      confirmLabel: "Slide to remove",
      action: async () => {
        try {
          await authFetch(`/api/admin/loyalty/cards/${card.id}`, { method: "DELETE" });
          notify.success("Reward card removed");
          await loadCards();
        } catch (error) {
          notify.error(error.message ?? "Could not remove reward card");
          throw error;
        }
      },
    });
  }

  async function saveSettings() {
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
      notify.success("Reward rules saved");
      await loadOverview().catch(() => {});
    } catch (error) {
      notify.error(error.message ?? "Could not save settings");
      throw error;
    }
  }

  async function approveReferral(referralId) {
    setDecidingId(referralId);
    try {
      await authFetch(`/api/admin/loyalty/referrals/${referralId}/approve`, { method: "POST" });
      notify.reward("Referral approved", { description: "Credited to both wallets" });
      await loadOverview().catch(() => {});
    } catch (error) {
      notify.error(error.message ?? "Could not update referral");
    } finally {
      setDecidingId(null);
    }
  }

  async function confirmReject() {
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      notify.warning("Add a reason first");
      throw new Error("no reason");
    }
    try {
      await authFetch(`/api/admin/loyalty/referrals/${rejecting.id}/reject`, { method: "POST", body: JSON.stringify({ reason: rejectReason }) });
      notify.success("Referral rejected", { description: "Any credit was reversed" });
      await loadOverview().catch(() => {});
    } catch (error) {
      notify.error(error.message ?? "Could not update referral");
      throw error;
    }
  }

  const setting = (key) => (value) => setSettingsForm((current) => ({ ...current, [key]: value }));
  const shownReferrals = useMemo(() => referrals.filter((r) => referralFilter === "ALL" || (referralFilter === "PENDING" ? r.status !== "REWARDED" && r.status !== "REJECTED" : r.status === referralFilter)), [referrals, referralFilter]);
  const totalOdds = cards.filter((c) => c.isActive).reduce((sum, c) => sum + Number(c.probabilityPercent || 0), 0);
  const shownServices = services.filter((s) => !serviceQuery.trim() || `${s.name} ${s.category ?? ""}`.toLowerCase().includes(serviceQuery.trim().toLowerCase()));
  const firstLoad = loading && !referrals.length && !loadError;

  const tabs = [
    { value: "overview", label: "Review", icon: ShieldAlert, badge: reviewQueue.length || undefined },
    { value: "rules", label: "Rules", icon: Settings2 },
    { value: "vault", label: "Vault", icon: Gift },
    { value: "referrals", label: "Referrals", icon: Users },
  ];

  return (
    <AdminLayout pageTitle="Loyalty" description="Referrals, rewards, wallet">
      <div className={cn("space-y-5", settingsDirty && "pb-28")}>
        <ErrorBanner message={referrals.length ? loadError : ""} onRetry={loadOverview} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Users} label="Referrals" value={summary.totalReferrals} tone="primary" loading={firstLoad} />
          <StatCard icon={Trophy} label="Rewarded" value={summary.rewardedReferrals} tone="gold" loading={firstLoad} />
          <StatCard icon={ShieldAlert} label="To review" value={summary.needsReviewCount} tone={summary.needsReviewCount ? "warning" : "neutral"} loading={firstLoad} />
          <StatCard icon={Coins} label="Wallet owed" value={Number(summary.walletLiability) || 0} format={inr} tone="info" loading={firstLoad} />
        </div>

        <AnimatedTabBar label="Loyalty sections" items={tabs} value={tab} onChange={setTab} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={spring.soft} className="space-y-5">
            {tab === "overview" ? (
              loadError && !referrals.length ? (
                <ErrorState title="Couldn't load referrals" description={loadError} onRetry={loadOverview} />
              ) : firstLoad ? (
                <SkeletonList rows={3} />
              ) : (
                <>
                  {reviewQueue.length ? (
                    <Panel title={`Held for review · ${reviewQueue.length}`} icon={ShieldAlert} subtitle="Nothing is credited until you decide" bodyClassName="space-y-3 p-3 sm:p-4">
                      <AnimatePresence initial={false}>
                        {reviewQueue.map((referral) => (
                          <motion.div key={referral.id} layout={!reduce} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: reduce ? 0 : 24 }} transition={spring.soft} className="space-y-3 rounded-2xl bg-muted/40 p-3 ring-1 ring-inset ring-border/60">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <AvatarBadge name={referral.referrerName} />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">
                                    {referral.referrerName} → {referral.referredName}
                                  </p>
                                  <p className="text-caption text-ink-neutral">{inr(Number(referral.rewardPoints) + Number(referral.welcomePoints))} at stake</p>
                                </div>
                              </div>
                              <span className={cn("inline-flex h-8 items-center gap-1 rounded-full px-3 font-display text-sm font-bold tabular-nums ring-1 ring-inset", referral.riskScore >= 50 ? TONE_CLASSES.destructive : TONE_CLASSES.warning)}>
                                Risk {referral.riskScore}
                              </span>
                            </div>
                            {(referral.riskSignals ?? []).length ? (
                              <ul className="flex flex-wrap gap-1.5">
                                {referral.riskSignals.map((signal) => (
                                  <li key={signal.key}>
                                    <ToneChip tone="warning" size="sm">
                                      {signal.label}
                                    </ToneChip>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                              <ButtonLoadingMorph variant="outline" icon={Ban} disabled={decidingId === referral.id} onClick={() => { setRejectReason(REJECT_REASONS[0]); setRejecting(referral); }}>
                                Reject
                              </ButtonLoadingMorph>
                              <ButtonLoadingMorph icon={Check} state={decidingId === referral.id ? "loading" : "idle"} loadingLabel="Paying…" onClick={() => void approveReferral(referral.id)}>
                                Approve
                              </ButtonLoadingMorph>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </Panel>
                  ) : (
                    <EmptyState compact illustration="sparkle" title="Nothing to review" description="Risky referrals land here." />
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard icon={Sparkles} label="Cooling" value={summary.coolingReferrals} tone="info" />
                    <StatCard icon={Users} label="Pending" value={summary.pendingReferrals} tone="warning" />
                    <StatCard icon={Ban} label="Rejected" value={summary.rejectedReferrals} tone="destructive" />
                  </div>
                </>
              )
            ) : null}

            {tab === "rules" ? (
              <Panel title="Reward rules" icon={Settings2} subtitle="Earned on the friend's first visit, held while checked" bodyClassName="space-y-6 p-4 sm:p-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Stepper id="referrer" label="Referrer reward" value={settingsForm.referrerRewardPoints} onChange={setting("referrerRewardPoints")} min={0} step={10} prefix="₹" />
                  <Stepper id="welcome" label="Welcome bonus" value={settingsForm.referredWelcomePoints} onChange={setting("referredWelcomePoints")} min={0} step={10} prefix="₹" />
                  <Stepper id="firstBooking" label="First booking off" hint="Stacks with running offers" value={settingsForm.firstBookingDiscountPercent} onChange={setting("firstBookingDiscountPercent")} min={0} max={100} step={0.5} suffix="%" />
                  <Stepper id="cooling" label="Cooling period" hint="0 pays out instantly" value={settingsForm.coolingHours} onChange={setting("coolingHours")} min={0} max={720} step={6} suffix="h" />
                </div>
                <div className="space-y-4 border-t border-border/60 pt-5">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="size-4 text-portal" aria-hidden /> Risk limits
                  </p>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Stepper id="approve" label="Auto-approve up to" value={settingsForm.autoApproveMaxRisk} onChange={setting("autoApproveMaxRisk")} min={0} max={100} step={1} />
                    <Stepper id="reject" label="Auto-reject from" value={settingsForm.autoRejectMinRisk} onChange={setting("autoRejectMinRisk")} min={1} max={100} step={1} />
                  </div>
                  <RiskZones approveMax={settingsForm.autoApproveMaxRisk} rejectMin={settingsForm.autoRejectMinRisk} />
                </div>
              </Panel>
            ) : null}

            {tab === "vault" ? (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-caption text-ink-neutral">
                    Each conversion draws one card. Active odds total <b className="text-foreground tabular-nums">{totalOdds.toFixed(1)}%</b>.
                  </p>
                  <ButtonLoadingMorph icon={Plus} onClick={openNewCard}>
                    Add reward
                  </ButtonLoadingMorph>
                </div>
                {!cards.length ? (
                  loading ? (
                    <SkeletonCards count={3} />
                  ) : (
                    <EmptyState illustration="gift" title="Vault is empty" description="Add services referrers can win." actionLabel="Add reward" actionIcon={Plus} onAction={openNewCard} />
                  )
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                      {cards.map((card, index) => {
                        const AudienceIcon = iconForAudience(card.serviceTargetGender);
                        return (
                          <motion.div key={card.id} layout={!reduce} initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} whileHover={reduce ? undefined : interaction.cardHover} transition={{ ...spring.soft, delay: Math.min(index, 10) * 0.04 }} className={cn("rounded-card border border-border/60 bg-card p-4 shadow-soft", !card.isActive && "opacity-75")}>
                            <div className="flex items-start justify-between gap-2">
                              <span className="grid size-11 place-items-center rounded-2xl bg-gold/16 font-display text-sm font-bold text-ink-warning ring-1 ring-inset ring-gold/35">#{card.rank}</span>
                              <div className="flex">
                                <IconButton icon={Pencil} label={`Edit ${card.serviceName}`} onClick={() => editCard(card)} />
                                <IconButton icon={Trash2} label={`Remove ${card.serviceName}`} className="text-ink-destructive" onClick={() => deleteCard(card)} />
                              </div>
                            </div>
                            <p className="mt-3 font-display text-headline font-semibold">{card.serviceName}</p>
                            <p className="text-caption text-ink-neutral">{inr(card.serviceBasePrice)} value</p>
                            <div className="mt-3">
                              <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-ink-neutral">
                                <span>Odds</span>
                                <span className="text-foreground tabular-nums">{card.probabilityPercent}%</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <motion.div className="h-full origin-left rounded-full bg-portal" initial={{ scaleX: 0 }} whileInView={{ scaleX: Math.min(100, card.probabilityPercent) / 100 }} viewport={{ once: true }} transition={spring.gentle} />
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1.5">
                              <ToneChip icon={AudienceIcon} size="sm">
                                {`${card.serviceTargetGender ?? "UNISEX"}`.charAt(0) + `${card.serviceTargetGender ?? "UNISEX"}`.slice(1).toLowerCase()}
                              </ToneChip>
                              {!card.isActive ? <StatusChip status="INACTIVE" size="sm" /> : null}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </section>
            ) : null}

            {tab === "referrals" ? (
              <section className="space-y-4">
                <FilterTabs label="Referral status" options={REFERRAL_FILTERS} value={referralFilter} onChange={setReferralFilter} />
                {firstLoad ? <SkeletonList rows={4} /> : null}
                {!loading && !shownReferrals.length ? <EmptyState illustration="gift" title="No referrals here" description={referrals.length ? "Try another filter." : "They appear when customers share links."} /> : null}
                <ul className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {shownReferrals.map((referral, index) => (
                      <motion.li key={referral.id} layout={!reduce} initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ...spring.soft, delay: Math.min(index, 10) * 0.03 }} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <AvatarBadge name={referral.referrerName} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {referral.referrerName} <span className="font-normal text-ink-neutral">→</span> {referral.referredName}
                            </p>
                            <p className="truncate text-caption text-ink-neutral">
                              {dateOf(referral.createdAt)}
                              {referral.status === "REWARDED" ? ` · ${inr(referral.rewardPoints)} + ${inr(referral.welcomePoints)}` : ""}
                              {referral.status === "REJECTED" && referral.rejectedReason ? ` · ${referral.rejectedReason}` : ""}
                              {referral.riskScore ? ` · risk ${referral.riskScore}` : ""}
                            </p>
                          </div>
                        </div>
                        <StatusChip status={referral.needsReview ? "NEEDS REVIEW" : referral.status} size="sm" className="self-start sm:self-auto" />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Unsaved rules bar: sits above the phone tab bar */}
      <AnimatePresence>
        {settingsDirty ? (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={spring.sheet} className="glass-strong fixed inset-x-3 bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+0.75rem)] z-sticky mx-auto flex max-w-xl items-center justify-between gap-2 rounded-sheet p-2.5 pl-4 shadow-float lg:bottom-6 lg:left-[calc(var(--sidebar-w)+1rem)]">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="size-2 rounded-full bg-warning" aria-hidden /> Unsaved
            </span>
            <div className="flex gap-2">
              <ButtonLoadingMorph variant="ghost" icon={Undo2} onClick={() => setSettingsForm(savedSettings)}>
                Discard
              </ButtonLoadingMorph>
              <ButtonLoadingMorph icon={Save} state={saveSettingsAction.state} loadingLabel="Saving…" successLabel="Saved" onClick={() => saveSettingsAction.run(saveSettings)}>
                Save
              </ButtonLoadingMorph>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Reward card editor */}
      <SlideOver
        open={cardOpen}
        onOpenChange={setCardOpen}
        title={editingCardId ? "Edit reward" : "Add reward"}
        description="A service a referrer can win free"
        icon={Gift}
        size="md"
        footer={
          <ButtonLoadingMorph icon={Save} state={saveCardAction.state} loadingLabel="Saving…" successLabel="Saved" onClick={() => saveCardAction.run(saveCard)}>
            {editingCardId ? "Save" : "Add"}
          </ButtonLoadingMorph>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="relative block">
              <span className="sr-only">Find a service</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-neutral" aria-hidden />
              <input value={serviceQuery} onChange={(e) => setServiceQuery(e.target.value)} placeholder="Find a service" className="h-11 w-full rounded-control bg-muted/60 pr-3 pl-10 text-sm outline-none placeholder:text-ink-neutral focus-visible:ring-2 focus-visible:ring-portal" />
            </label>
            <ul role="radiogroup" aria-label="Service" className="admin-scrollbar max-h-56 space-y-1 overflow-y-auto rounded-2xl bg-muted/40 p-1.5 ring-1 ring-inset ring-border/60" data-vaul-no-drag>
              {shownServices.map((service) => {
                const on = cardForm.serviceId === service.id;
                const Icon = iconForAudience(service.gender);
                return (
                  <li key={service.id}>
                    <button type="button" role="radio" aria-checked={on} onClick={() => setCardForm({ ...cardForm, serviceId: service.id })} className={cn("flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors", on ? "bg-portal text-portal-foreground" : "hover:bg-muted")}>
                      {on ? <Check className="size-4 shrink-0" aria-hidden /> : <Icon className="size-4 shrink-0 text-ink-neutral" aria-hidden />}
                      <span className="min-w-0 flex-1 truncate font-semibold">{service.name}</span>
                      <span className={cn("shrink-0 text-caption tabular-nums", on ? "opacity-90" : "text-ink-neutral")}>{inr(service.basePrice)}</span>
                    </button>
                  </li>
                );
              })}
              {!shownServices.length ? <li className="py-4 text-center text-caption text-ink-neutral">No match</li> : null}
            </ul>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Stepper id="card-rank" label="Rank" hint="1 is the top prize" value={cardForm.rank} onChange={(value) => setCardForm({ ...cardForm, rank: value })} min={1} max={5} />
            <Stepper id="card-odds" label="Odds" value={cardForm.probabilityPercent} onChange={(value) => setCardForm({ ...cardForm, probabilityPercent: value })} min={0} max={100} step={0.5} suffix="%" />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3">
            <span className="text-sm font-semibold">Can be drawn</span>
            <Switch checked={cardForm.isActive} onChange={(isActive) => setCardForm({ ...cardForm, isActive })} label="Card active" />
          </div>
        </div>
      </SlideOver>

      {/* Reject (destructive: reverses credit) */}
      <ConfirmSheet
        open={Boolean(rejecting)}
        onOpenChange={(open) => !open && setRejecting(null)}
        kind="destructive"
        icon={Ban}
        title="Reject referral?"
        description={rejecting ? `${rejecting.referrerName} → ${rejecting.referredName}. Credit is reversed.` : undefined}
        confirmLabel="Slide to reject"
        onConfirm={confirmReject}
      >
        <div className="space-y-3">
          <FloatingLabelInput as="textarea" label="Reason" maxLength={300} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <div className="flex flex-wrap gap-1.5">
            {REJECT_REASONS.map((reason) => (
              <button key={reason} type="button" onClick={() => setRejectReason(reason)} className={cn("tap h-9 rounded-full px-3 text-caption font-semibold ring-1 ring-inset transition-colors", rejectReason === reason ? "bg-portal/12 text-portal ring-portal/30" : "bg-card ring-border hover:bg-muted")}>
                {reason}
              </button>
            ))}
          </div>
        </div>
      </ConfirmSheet>
      {confirmSheet}
    </AdminLayout>
  );
}
