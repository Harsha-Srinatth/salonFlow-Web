"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { saveCustomerGender } from "@/lib/customer-profile";
import { toApiUrl } from "@/lib/api-base";
import { animate, stagger } from "animejs";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  CheckCircle2,
  Copy,
  Gift,
  PartyPopper,
  Share2,
  Sparkles,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { UserLayout } from "../portal/user-layout";
import { LoadingOrb } from "@/components/shared/loading-orb";

async function authGet(path) {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl(path), {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

async function fetchLoyaltyOverview() {
  return authGet("/api/customer/loyalty");
}

async function fetchRewardVault() {
  return authGet("/api/customer/loyalty/vault");
}

async function drawRewardCard(referralId) {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl("/api/customer/loyalty/vault/draw"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ referralId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Could not draw a reward");
  return data;
}

const CARD_ROTATIONS = [-14, -7, 0, 7, 14];

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

const NEUTRAL_TONE = "bg-muted text-muted-foreground";
const WAITING_TONE = "bg-amber-100 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300";
const PROGRESS_TONE = "bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300";
const DONE_TONE = "bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-300";

/**
 * Every state a referral can be in, in the order it moves through them. The
 * customer sees plain language; the backend's `statusLabel` is used when present
 * so the two never drift apart.
 */
const REFERRAL_STATUS_META = {
  PENDING: { label: "Awaiting first visit", tone: WAITING_TONE },
  FIRST_ACTION_DONE: { label: "First visit done", tone: PROGRESS_TONE },
  COOLING: { label: "Verifying", tone: PROGRESS_TONE },
  APPROVED: { label: "Approved", tone: PROGRESS_TONE },
  REWARDED: { label: "Reward earned", tone: DONE_TONE },
  REJECTED: { label: "Not verified", tone: NEUTRAL_TONE },
};

function formatCoolingCountdown(coolingUntil) {
  if (!coolingUntil) return null;
  const remainingMs = new Date(coolingUntil).getTime() - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "any moment now";
  const hours = Math.floor(remainingMs / 3600000);
  const minutes = Math.round((remainingMs % 3600000) / 60000);
  if (hours >= 1) return `in about ${hours}h ${minutes}m`;
  return `in about ${Math.max(1, minutes)} min`;
}

export default function UserLoyaltyPage() {
  const { appUser, loading, refresh } = useAuth();
  const [overview, setOverview] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [vault, setVault] = useState({ cards: [], pendingDraws: [], wins: [], needsGender: false });
  const [savingGender, setSavingGender] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [revealedCard, setRevealedCard] = useState(null);
  const balanceRef = useRef(null);
  const listRef = useRef(null);
  const cardFanRef = useRef(null);
  const prevBalance = useRef(0);

  async function loadVault() {
    try {
      const data = await fetchRewardVault();
      setVault({
        cards: data.cards ?? [],
        pendingDraws: data.pendingDraws ?? [],
        wins: data.wins ?? [],
        needsGender: Boolean(data.needsGender),
      });
    } catch {
      // Vault is a bonus layer on top of the core wallet/referral view — a failed load shouldn't block the page.
    }
  }

  async function handleSetGender(value) {
    setSavingGender(true);
    try {
      await saveCustomerGender(value);
      await refresh();
      await loadVault();
      toast.success("Saved — your reward cards now match your services");
    } catch (error) {
      toast.error(error.message ?? "Could not save your gender");
    } finally {
      setSavingGender(false);
    }
  }

  useEffect(() => {
    if (!appUser || appUser.role !== "USER") return;
    void fetchLoyaltyOverview()
      .then(setOverview)
      .catch((error) => toast.error(error.message ?? "Could not load your rewards"))
      .finally(() => setPageLoading(false));
    void loadVault();
  }, [appUser]);

  useEffect(() => {
    if (!balanceRef.current || !overview) return;
    const target = Number(overview.walletBalance ?? 0);
    if (prefersReducedMotion()) {
      balanceRef.current.textContent = target.toLocaleString();
      prevBalance.current = target;
      return;
    }
    const from = { n: prevBalance.current };
    animate(from, {
      n: target,
      duration: 900,
      ease: "outExpo",
      onUpdate: () => {
        if (balanceRef.current) balanceRef.current.textContent = Math.round(from.n).toLocaleString();
      },
    });
    prevBalance.current = target;
  }, [overview]);

  useEffect(() => {
    if (!listRef.current || !overview || prefersReducedMotion()) return;
    const rows = listRef.current.querySelectorAll("[data-loyalty-row]");
    if (!rows.length) return;
    animate(rows, {
      opacity: [0, 1],
      translateY: [12, 0],
      delay: stagger(50),
      duration: 420,
      ease: "outQuart",
    });
  }, [overview]);

  const referralLink = overview?.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth/signup?ref=${overview.referralCode}`
    : "";

  async function handleCopyLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link — copy it manually");
    }
  }

  async function handleShare() {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me at Sahasra Salon",
          text: "Book your next salon visit with my referral link and we both earn rewards!",
          url: referralLink,
        });
        return;
      } catch {
        // User cancelled the native share sheet — fall through to copy.
      }
    }
    void handleCopyLink();
  }

  async function handleWithdrawReward() {
    const nextDraw = vault.pendingDraws[0];
    if (!nextDraw || drawing) return;
    setDrawing(true);
    setRevealedCard(null);
    const cardEls = cardFanRef.current ? Array.from(cardFanRef.current.querySelectorAll("[data-reward-card]")) : [];
    const reduceMotion = prefersReducedMotion();
    if (cardEls.length && !reduceMotion) {
      animate(cardEls, {
        translateY: [0, -10, 0, -6, 0],
        rotate: (_el, i) => [`${CARD_ROTATIONS[i] ?? 0}deg`, `${(CARD_ROTATIONS[i] ?? 0) * 1.6}deg`, `${CARD_ROTATIONS[i] ?? 0}deg`],
        duration: 900,
        loop: 2,
        ease: "inOutSine",
      });
    }
    try {
      const [result] = await Promise.all([
        drawRewardCard(nextDraw.referralId),
        new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 0 : 1300)),
      ]);
      setRevealedCard(result.card);
      await loadVault();
      toast.success(`You won: ${result.card.serviceName}!`);
      window.requestAnimationFrame(() => {
        const winEl = cardFanRef.current?.querySelector(`[data-reward-card="${result.card.id}"]`);
        if (winEl && !reduceMotion) {
          animate(winEl, {
            scale: [1, 1.25, 1.1],
            duration: 520,
            ease: "outElastic(1, .6)",
          });
        }
      });
    } catch (error) {
      toast.error(error.message ?? "Could not draw a reward right now");
    } finally {
      setDrawing(false);
    }
  }

  if (loading) {
    return (
      <UserLayout pageTitle="Refer & Earn">
        <LoadingOrb label="Loading…" className="h-96" />
      </UserLayout>
    );
  }

  if (!appUser || appUser.role !== "USER") {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <p>Sign in as a customer to view your rewards.</p>
        <Button asChild>
          <Link to="/auth/login">Customer login</Link>
        </Button>
      </div>
    );
  }

  return (
    <UserLayout pageTitle="Refer & Earn">
      {pageLoading ? (
        <LoadingOrb label="Loading your rewards…" className="h-96" />
      ) : (
        <div className="space-y-6 max-w-4xl">
          {/* Hero: wallet balance + referral link */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-6 sm:p-8 overflow-hidden relative">
            <div className="absolute -right-16 -top-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary mb-1">
                    <Wallet className="w-4 h-4" />
                    Wallet balance
                  </p>
                  <p className="text-4xl sm:text-5xl font-bold text-foreground">
                    ₹<span ref={balanceRef}>0</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Applied automatically at checkout when you choose to use it</p>
                  {overview?.pendingCredit > 0 ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
                      ₹{Number(overview.pendingCredit).toLocaleString()} being verified — not spendable yet
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{overview?.totalReferred ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Friends invited</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-warning">{overview?.totalPending ?? 0}</p>
                    <p className="text-xs text-muted-foreground">In progress</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-success">{overview?.totalRewarded ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Rewarded</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Gift className="w-4 h-4 text-accent" />
                  Invite friends, you both earn
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm">
                    <span className="truncate">{referralLink}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => void handleCopyLink()} className="flex-1 sm:flex-none">
                      {copied ? <Check className="mr-1.5 w-4 h-4 text-success" /> : <Copy className="mr-1.5 w-4 h-4" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button type="button" onClick={() => void handleShare()} className="flex-1 sm:flex-none">
                      <Share2 className="mr-1.5 w-4 h-4" />
                      Share
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your code: <span className="font-mono font-semibold text-foreground">{overview?.referralCode}</span> — your
                  friend gets a welcome bonus, and you earn wallet credit once they complete their first visit.
                </p>
              </div>
            </div>
          </div>

          {/* Reward Vault: gamified free-service draw, unlocked per converted referral */}
          <div className="rounded-2xl border border-accent/20 bg-gradient-to-b from-accent/5 to-transparent p-6 sm:p-8 space-y-6">
            <div className="flex flex-col items-center text-center gap-1">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Unlock Your Reward Vault</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Every friend who joins through your link and completes their first visit earns you a free-service
                draw from the vault.
              </p>
            </div>

            {vault.needsGender ? (
              <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-center">
                <p className="text-sm font-semibold text-foreground">One quick thing before you draw</p>
                <p className="text-xs text-muted-foreground">
                  Your account doesn't have a gender saved, so you're only being shown unisex cards. Tell us and the
                  full set of cards you can actually book unlocks.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { value: "MALE", label: "Male" },
                    { value: "FEMALE", label: "Female" },
                    { value: "OTHER", label: "Other" },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingGender}
                      onClick={() => void handleSetGender(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {vault.pendingDraws.length > 0 ? (
              <div className="mx-auto flex max-w-lg flex-col items-center gap-1 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-center">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-success">
                  <PartyPopper className="w-4 h-4" />
                  {vault.pendingDraws.length} referral{vault.pendingDraws.length > 1 ? "s" : ""} successfully signed up!
                </p>
                <p className="text-xs text-muted-foreground">Withdraw your reward below.</p>
              </div>
            ) : null}

            {vault.cards.length ? (
              <div ref={cardFanRef} className="flex flex-wrap items-end justify-center gap-3 py-6">
                {vault.cards.map((card, index) => {
                  const isRevealed = revealedCard?.id === card.id;
                  const rotation = CARD_ROTATIONS[index] ?? 0;
                  return (
                    <div
                      key={card.id}
                      data-reward-card={card.id}
                      style={{ transform: `rotate(${rotation}deg)` }}
                      className={`flex h-40 w-28 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 bg-card p-3 text-center shadow-md transition-shadow sm:h-44 sm:w-32 ${
                        isRevealed ? "border-accent shadow-accent/30 shadow-lg" : "border-border/70"
                      }`}
                    >
                      <Ticket className={`w-5 h-5 ${isRevealed ? "text-accent" : "text-muted-foreground/50"}`} />
                      <p className="text-[11px] font-semibold leading-tight text-foreground line-clamp-3">{card.serviceName}</p>
                      <p className="text-[10px] text-muted-foreground">Rs {card.serviceBasePrice.toFixed(0)} value</p>
                      {isRevealed ? (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                          FREE!
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-6">
                Reward cards are being set up — check back soon for free-service draws.
              </p>
            )}

            <div className="flex justify-center">
              <Button
                type="button"
                size="lg"
                className="px-10"
                disabled={!vault.pendingDraws.length || !vault.cards.length || drawing || vault.needsGender}
                onClick={() => void handleWithdrawReward()}
              >
                <Gift className="mr-2 w-5 h-5" />
                {drawing
                  ? "Revealing..."
                  : vault.needsGender
                    ? "Add your gender to draw"
                    : vault.pendingDraws.length
                      ? "Withdraw Reward"
                      : "No rewards available yet"}
              </Button>
            </div>
            {vault.cards.length ? (
              <p className="text-center text-xs text-muted-foreground">
                Odds shown are configured by the salon; higher-value services are rarer.
              </p>
            ) : null}
          </div>

          {vault.wins.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Ticket className="w-5 h-5 text-accent" />
                  Your free-service wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {vault.wins.map((win) => (
                    <div key={win.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5">
                      {win.status === "USED" ? (
                        <CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0" />
                      ) : (
                        <Gift className="w-5 h-5 text-accent shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{win.serviceName}</p>
                        <p className="text-xs text-muted-foreground">
                          Won {new Date(win.wonAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                          win.status === "USED"
                            ? "bg-muted text-muted-foreground"
                            : "bg-accent/15 text-accent"
                        }`}
                      >
                        {win.status === "USED" ? "Used" : "Ready to redeem"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Unused rewards apply automatically as a free service option when you book that exact service.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div ref={listRef} className="grid gap-6 lg:grid-cols-2">
            {/* Referrals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-primary" />
                  Your referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!overview?.referrals?.length ? (
                  <div className="text-center py-10">
                    <Sparkles className="mx-auto w-10 h-10 text-muted-foreground/20 mb-2" />
                    <p className="text-sm font-medium text-foreground">No referrals yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Share your link above to start earning</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {overview.referrals.map((referral) => {
                      const meta = REFERRAL_STATUS_META[referral.status] ?? REFERRAL_STATUS_META.PENDING;
                      const countdown =
                        referral.status === "COOLING" ? formatCoolingCountdown(referral.coolingUntil) : null;
                      return (
                        <div
                          key={referral.id}
                          data-loyalty-row
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{referral.referredName}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(referral.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                              {referral.statusLabel ? ` · ${referral.statusLabel}` : ""}
                              {countdown ? ` · lands ${countdown}` : ""}
                            </p>
                            {referral.status === "REJECTED" && referral.rejectedReason ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Contact the salon if you think this is a mistake.
                              </p>
                            ) : null}
                          </div>
                          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${meta.tone}`}>
                            {meta.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Wallet history */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="w-5 h-5 text-primary" />
                  Wallet activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!overview?.transactions?.length ? (
                  <div className="text-center py-10">
                    <Wallet className="mx-auto w-10 h-10 text-muted-foreground/20 mb-2" />
                    <p className="text-sm font-medium text-foreground">No wallet activity yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Rewards you earn will show up here</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {overview.transactions.map((tx) => (
                      <div key={tx.id} data-loyalty-row className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5">
                        {tx.type === "CREDIT" ? (
                          <ArrowUpCircle className="w-5 h-5 text-success shrink-0" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">{tx.description || tx.source}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <p className={`shrink-0 text-sm font-bold ${tx.type === "CREDIT" ? "text-success" : "text-foreground"}`}>
                          {tx.type === "CREDIT" ? "+" : "-"}₹{tx.amount}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
