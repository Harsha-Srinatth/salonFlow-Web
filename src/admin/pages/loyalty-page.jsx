"use client";

import { AdminLayout } from "../portal/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { SkeletonRows } from "@/admin/components/skeleton";
import { StatCard } from "@/admin/components/stat-card";
import { StatusPill } from "@/admin/components/status-pill";
import { useRevealOnReady } from "@/admin/lib/motion";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { Coins, Gift, Pencil, Plus, Save, ShieldAlert, Sparkles, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const GENDER_BADGE = {
  MEN: "bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300",
  WOMEN: "bg-pink-100 text-pink-900 dark:bg-pink-900/20 dark:text-pink-300",
  UNISEX: "bg-muted text-muted-foreground",
};

const EMPTY_CARD_FORM = { serviceId: "", rank: "1", probabilityPercent: "10", isActive: true };

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

export default function AdminLoyaltyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [referrals, setReferrals] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [decidingId, setDecidingId] = useState(null);
  const [summary, setSummary] = useState({
    totalReferrals: 0,
    rewardedReferrals: 0,
    pendingReferrals: 0,
    coolingReferrals: 0,
    rejectedReferrals: 0,
    needsReviewCount: 0,
    totalPointsIssued: 0,
    walletLiability: 0,
    pendingLiability: 0,
  });
  const [settingsForm, setSettingsForm] = useState({
    referrerRewardPoints: "150",
    referredWelcomePoints: "75",
    firstBookingDiscountPercent: "10",
    coolingHours: "24",
    autoApproveMaxRisk: "29",
    autoRejectMinRisk: "70",
  });
  const [services, setServices] = useState([]);
  const [cards, setCards] = useState([]);
  const [cardForm, setCardForm] = useState(EMPTY_CARD_FORM);
  const [editingCardId, setEditingCardId] = useState(null);
  const [savingCard, setSavingCard] = useState(false);
  const listRef = useRevealOnReady([loading, referrals.length], { selector: ":scope > *" });
  const cardsListRef = useRevealOnReady([cards.length], { selector: ":scope > *" });

  async function loadOverview() {
    setLoading(true);
    try {
      const data = await authFetch("/api/admin/loyalty");
      setReferrals(data.referrals ?? []);
      setReviewQueue(data.reviewQueue ?? []);
      setSummary(data.summary ?? summary);
      setSettingsForm({
        referrerRewardPoints: String(data.settings?.referrerRewardPoints ?? 150),
        referredWelcomePoints: String(data.settings?.referredWelcomePoints ?? 75),
        firstBookingDiscountPercent: String(data.settings?.firstBookingDiscountPercent ?? 10),
        coolingHours: String(data.settings?.coolingHours ?? 24),
        autoApproveMaxRisk: String(data.settings?.autoApproveMaxRisk ?? 29),
        autoRejectMinRisk: String(data.settings?.autoRejectMinRisk ?? 70),
      });
      setLoadError("");
    } catch (error) {
      const message = error.message ?? "Could not load loyalty overview";
      toast.error(message);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCards() {
    try {
      const data = await authFetch("/api/admin/loyalty/cards");
      setCards(data.cards ?? []);
    } catch (error) {
      toast.error(error.message ?? "Could not load reward cards");
    }
  }

  async function loadServices() {
    try {
      const data = await authFetch("/api/admin/services");
      setServices((data.services ?? []).filter((service) => service.isActive !== false));
    } catch {
      // Non-critical for the rest of the page — the card form just won't have options yet.
    }
  }

  useEffect(() => {
    void loadOverview();
    void loadCards();
    void loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function editCard(card) {
    setEditingCardId(card.id);
    setCardForm({
      serviceId: card.serviceId,
      rank: String(card.rank),
      probabilityPercent: String(card.probabilityPercent),
      isActive: card.isActive,
    });
  }

  function cancelEditCard() {
    setEditingCardId(null);
    setCardForm(EMPTY_CARD_FORM);
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
        body: JSON.stringify({
          serviceId: cardForm.serviceId,
          rank: Number(cardForm.rank),
          probabilityPercent: Number(cardForm.probabilityPercent),
          isActive: cardForm.isActive,
        }),
      });
      toast.success(editingCardId ? "Reward card updated" : "Reward card added");
      cancelEditCard();
      await loadCards();
    } catch (error) {
      toast.error(error.message ?? "Could not save reward card");
    } finally {
      setSavingCard(false);
    }
  }

  async function deleteCard(id) {
    if (!window.confirm("Remove this reward card?")) return;
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

  async function decideReferral(referralId, decision) {
    setDecidingId(referralId);
    try {
      if (decision === "reject") {
        const reason = window.prompt("Why is this referral being rejected?", "Failed manual verification");
        if (reason === null) return;
        await authFetch(`/api/admin/loyalty/referrals/${referralId}/reject`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        });
        toast.success("Referral rejected and credit reversed");
      } else {
        await authFetch(`/api/admin/loyalty/referrals/${referralId}/approve`, { method: "POST" });
        toast.success("Referral approved and credited");
      }
      await loadOverview();
    } catch (error) {
      toast.error(error.message ?? "Could not update referral");
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <AdminLayout
      pageTitle="Loyalty & Referrals"
      description="Referral codes, wallet rewards, and configurable payout amounts."
    >
      <div className="space-y-4">
        <ErrorBanner message={loadError} onRetry={loadOverview} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Total referrals" value={summary.totalReferrals} tone="primary" />
          <StatCard icon={Sparkles} label="Rewarded" value={summary.rewardedReferrals} tone="success" delay={60} />
          <StatCard icon={Gift} label="Needs review" value={summary.needsReviewCount} tone="warning" delay={120} />
          <StatCard
            icon={Coins}
            label="Wallet liability"
            value={summary.walletLiability}
            display={`Rs ${summary.walletLiability.toLocaleString()}${
              summary.pendingLiability ? ` (+${summary.pendingLiability.toLocaleString()} held)` : ""
            }`}
            tone="accent"
            delay={180}
          />
        </div>

        {reviewQueue.length ? (
          <Card className="admin-shadow-sm border-warning/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="size-4 text-warning" />
                Referrals held for review ({reviewQueue.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                These cleared their cooling period but tripped enough risk signals to need a person. Nothing is
                credited until you decide.
              </p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {reviewQueue.map((referral) => (
                <div
                  key={referral.id}
                  className="admin-shadow-sm space-y-3 rounded-xl border border-border/70 bg-card p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <AvatarBadge name={referral.referrerName} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {referral.referrerName} → {referral.referredName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rs {referral.rewardPoints + referral.welcomePoints} at stake · risk score{" "}
                          {referral.riskScore}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={decidingId === referral.id}
                        onClick={() => void decideReferral(referral.id, "reject")}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={decidingId === referral.id}
                        onClick={() => void decideReferral(referral.id, "approve")}
                      >
                        Approve &amp; pay
                      </Button>
                    </div>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {(referral.riskSignals ?? []).map((signal) => (
                      <li
                        key={signal.key}
                        className="rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning"
                      >
                        {signal.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card className="admin-shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Save className="size-4 text-primary" />
              Reward amounts
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              A referral reward is earned when the referred customer completes their first booking, then held for
              the cooling period below while it is checked for abuse — both sides can see it, but it is not
              spendable until it clears. The first-booking discount is separate and applies instantly at checkout
              for anyone who has never booked before.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Referrer reward (Rs)</Label>
                <Input
                  type="number"
                  min="0"
                  value={settingsForm.referrerRewardPoints}
                  onChange={(e) => setSettingsForm({ ...settingsForm, referrerRewardPoints: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Credited to the person who shared their code</p>
              </div>
              <div className="space-y-1">
                <Label>Welcome bonus (Rs)</Label>
                <Input
                  type="number"
                  min="0"
                  value={settingsForm.referredWelcomePoints}
                  onChange={(e) => setSettingsForm({ ...settingsForm, referredWelcomePoints: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Credited to the new customer who signed up via referral</p>
              </div>
            </div>
            <div className="border-t border-border/60 pt-4">
              <div className="max-w-xs space-y-1">
                <Label>First booking discount (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={settingsForm.firstBookingDiscountPercent}
                  onChange={(e) => setSettingsForm({ ...settingsForm, firstBookingDiscountPercent: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Extra discount applied automatically on any brand-new customer's very first booking — on top of
                  any running offers.
                </p>
              </div>
            </div>
            <div className="border-t border-border/60 pt-4">
              <p className="mb-3 text-sm font-medium">Referral verification</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Cooling period (hours)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="720"
                    value={settingsForm.coolingHours}
                    onChange={(e) => setSettingsForm({ ...settingsForm, coolingHours: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Reward is shown but held before it becomes spendable. 0 pays out immediately.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Auto-approve up to</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settingsForm.autoApproveMaxRisk}
                    onChange={(e) => setSettingsForm({ ...settingsForm, autoApproveMaxRisk: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Risk score paid out with no review</p>
                </div>
                <div className="space-y-1">
                  <Label>Auto-reject from</Label>
                  <Input
                    type="number"
                    min="1"
                    value={settingsForm.autoRejectMinRisk}
                    onChange={(e) => setSettingsForm({ ...settingsForm, autoRejectMinRisk: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Anything between the two lands in the review queue above
                  </p>
                </div>
              </div>
            </div>
            <div>
              <Button type="button" onClick={() => void saveSettings()} disabled={saving}>
                <Save className="size-4" />
                {saving ? "Saving..." : "Save reward amounts"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="size-4 text-accent" />
              Reward vault cards
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Each time a referral converts, the referrer draws one of these cards and wins that service free.
              Which cards a customer can win is automatically filtered by that service's own gender setting (Men /
              Women / Unisex) — add a mix of services to build separate pools for each.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <div className="space-y-1">
                <Label>Service</Label>
                <Select value={cardForm.serviceId} onValueChange={(value) => setCardForm({ ...cardForm, serviceId: value })}>
                  <SelectTrigger>
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
              <div className="space-y-1">
                <Label>Rank</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={cardForm.rank}
                  onChange={(e) => setCardForm({ ...cardForm, rank: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Probability (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={cardForm.probabilityPercent}
                  onChange={(e) => setCardForm({ ...cardForm, probabilityPercent: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="button" onClick={() => void saveCard()} disabled={savingCard}>
                  {editingCardId ? <Save className="size-4" /> : <Plus className="size-4" />}
                  {editingCardId ? "Save" : "Add"}
                </Button>
                {editingCardId ? (
                  <Button type="button" variant="outline" onClick={cancelEditCard}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>

            {!cards.length ? (
              <EmptyState
                icon={Gift}
                title="No reward cards yet"
                description="Add services above to build the reward vault your referrers draw from."
                compact
              />
            ) : (
              <div ref={cardsListRef} className="space-y-2">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        #{card.rank}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{card.serviceName}</p>
                        <p className="text-xs text-muted-foreground">Rs {card.serviceBasePrice.toFixed(0)} value</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${GENDER_BADGE[card.serviceTargetGender] ?? GENDER_BADGE.UNISEX}`}>
                        {card.serviceTargetGender}
                      </span>
                      <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                        {card.probabilityPercent}% odds
                      </span>
                      {!card.isActive ? <StatusPill status="INACTIVE" /> : null}
                      <Button type="button" size="icon" variant="ghost" onClick={() => editCard(card)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => void deleteCard(card.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="admin-shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" />
              Referrals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <SkeletonRows count={4} /> : null}
            {!loading && !referrals.length ? (
              <EmptyState
                icon={Gift}
                title="No referrals yet"
                description="Once customers start sharing their referral link, activity will show up here."
              />
            ) : null}
            <div ref={listRef} className="space-y-2.5">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="admin-card-hover admin-shadow-sm flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarBadge name={referral.referrerName} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {referral.referrerName} <span className="text-muted-foreground">invited</span> {referral.referredName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        {referral.status === "REWARDED"
                          ? ` · Rs ${referral.rewardPoints} + Rs ${referral.welcomePoints} issued`
                          : ""}
                        {referral.status === "REJECTED" && referral.rejectedReason
                          ? ` · ${referral.rejectedReason}`
                          : ""}
                        {referral.riskScore ? ` · risk ${referral.riskScore}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill status={referral.needsReview ? "NEEDS REVIEW" : referral.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
