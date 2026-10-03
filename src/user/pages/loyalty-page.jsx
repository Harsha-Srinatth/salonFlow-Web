"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  Hourglass,
  Link2,
  Loader2,
  PartyPopper,
  Share2,
  Sparkles,
  Ticket,
  Trophy,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { notify } from "@/lib/notify";
import { UserLayout } from "../portal/user-layout";

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
const WAITING_TONE = "bg-accent/15 text-accent";
const PROGRESS_TONE = "bg-primary/10 text-primary";
const DONE_TONE = "bg-success/15 text-success";

/**
 * Every state a referral can be in, in the order it moves through them. The
 * customer sees plain language; the backend's `statusLabel` is used when present
 * so the two never drift apart.
 */
const REFERRAL_STATUS_META = {
  PENDING: { label: "Waiting", tone: WAITING_TONE },
  FIRST_ACTION_DONE: { label: "Visited", tone: PROGRESS_TONE },
  COOLING: { label: "Verifying", tone: PROGRESS_TONE },
  APPROVED: { label: "Approved", tone: PROGRESS_TONE },
  REWARDED: { label: "Rewarded", tone: DONE_TONE },
  REJECTED: { label: "Rejected", tone: NEUTRAL_TONE },
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
      notify.success("Saved");
    } catch (error) {
      notify.error("Couldn't save", { description: error.message });
    } finally {
      setSavingGender(false);
    }
  }

  useEffect(() => {
    if (!appUser || appUser.role !== "USER") return;
    void fetchLoyaltyOverview()
      .then(setOverview)
      .catch((error) => notify.error("Couldn't load rewards", { description: error.message }))
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
      notify.success("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Couldn't copy the link");
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
      notify.success(`You won ${result.card.serviceName}`);
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
      notify.error("Couldn't draw a reward", { description: error.message });
    } finally {
      setDrawing(false);
    }
  }

  if (loading || pageLoading) {
    return (
      <UserLayout pageTitle="Refer & Earn">
        <div className="max-w-4xl space-y-4">
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
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

  const drawLabel = drawing
    ? "Revealing"
    : vault.needsGender
      ? "Add gender to draw"
      : vault.pendingDraws.length
        ? "Draw reward"
        : "No draws yet";

  return (
    <UserLayout pageTitle="Refer & Earn" width="lg">
      <div className="space-y-4">
        {/* Wallet + invite */}
        <section className="space-y-6 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium opacity-80">
                <Wallet className="size-4" /> Wallet
              </p>
              <p className="font-display text-5xl font-bold">
                ₹<span ref={balanceRef}>0</span>
              </p>
              {overview?.pendingCredit > 0 ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
                  <Hourglass className="size-3.5" />₹{Number(overview.pendingCredit).toLocaleString()} verifying
                </p>
              ) : null}
            </div>
            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
              {[
                { icon: Users, value: overview?.totalReferred ?? 0, label: "Invited" },
                { icon: Hourglass, value: overview?.totalPending ?? 0, label: "Pending" },
                { icon: Trophy, value: overview?.totalRewarded ?? 0, label: "Rewarded" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="rounded-2xl bg-primary-foreground/10 p-3 text-center sm:min-w-[84px]">
                  <Icon className="mx-auto size-4 opacity-80" />
                  <p className="mt-1 font-display text-xl font-bold tabular-nums">{value}</p>
                  <p className="text-[11px] opacity-80">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl bg-primary-foreground/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Gift className="size-4" /> Invite a friend
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-card px-3 py-2.5 font-mono text-sm text-foreground">
                <Link2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{referralLink}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleCopyLink()}
                  className="h-11 flex-1 rounded-full sm:flex-none"
                >
                  {copied ? <Check className="text-success" /> : <Copy />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleShare()}
                  className="h-11 flex-1 rounded-full bg-card text-primary customer:hover:bg-card! sm:flex-none"
                >
                  <Share2 /> Share
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Reward vault */}
        <section className="space-y-5 rounded-3xl bg-card p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Gift className="size-6" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold">Reward vault</h2>
              <p className="text-sm text-muted-foreground">1 friend's first visit = 1 free-service draw</p>
            </div>
          </div>

          {vault.needsGender ? (
            <div className="space-y-3 rounded-2xl bg-accent/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <UserRound className="size-4 text-accent" /> Pick your gender to unlock all cards
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "MALE", label: "Male" },
                  { value: "FEMALE", label: "Female" },
                  { value: "OTHER", label: "Other" },
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant="secondary"
                    className="rounded-full"
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
            <p className="flex items-center gap-2 rounded-2xl bg-success/10 p-3 text-sm font-semibold text-success">
              <PartyPopper className="size-5 shrink-0" />
              {vault.pendingDraws.length} draw{vault.pendingDraws.length > 1 ? "s" : ""} ready
            </p>
          ) : null}

          {vault.cards.length ? (
            <div ref={cardFanRef} className="flex flex-wrap items-end justify-center gap-3 py-4">
              {vault.cards.map((card, index) => {
                const isRevealed = revealedCard?.id === card.id;
                const rotation = CARD_ROTATIONS[index] ?? 0;
                return (
                  <div
                    key={card.id}
                    data-reward-card={card.id}
                    style={{ transform: `rotate(${rotation}deg)` }}
                    className={cn(
                      "flex h-40 w-28 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl bg-secondary p-3 text-center shadow-md sm:h-44 sm:w-32",
                      isRevealed && "bg-accent/15 shadow-lg ring-2 ring-accent"
                    )}
                  >
                    <Ticket className={cn("size-6", isRevealed ? "text-accent" : "text-muted-foreground/60")} />
                    <p className="line-clamp-3 text-[11px] font-semibold leading-tight">{card.serviceName}</p>
                    <p className="text-[10px] text-muted-foreground">₹{card.serviceBasePrice.toFixed(0)}</p>
                    {isRevealed ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">FREE</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Hourglass className="size-4" /> Cards coming soon
            </p>
          )}

          <Button
            type="button"
            className="mx-auto flex h-12 rounded-full px-10"
            disabled={!vault.pendingDraws.length || !vault.cards.length || drawing || vault.needsGender}
            onClick={() => void handleWithdrawReward()}
          >
            {drawing ? <Loader2 className="animate-spin" /> : <Gift />}
            {drawLabel}
          </Button>
        </section>

        {vault.wins.length ? (
          <section className="rounded-3xl bg-card p-5 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <Ticket className="size-5 text-accent" /> My vouchers
            </h2>
            <ul className="space-y-2">
              {vault.wins.map((win) => (
                <li key={win.id} className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
                  {win.status === "USED" ? (
                    <CheckCircle2 className="size-5 shrink-0 text-muted-foreground" />
                  ) : (
                    <Gift className="size-5 shrink-0 text-accent" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{win.serviceName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(win.wonAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                      win.status === "USED" ? "bg-muted text-muted-foreground" : "bg-accent/15 text-accent"
                    )}
                  >
                    {win.status === "USED" ? "Used" : "Ready"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div ref={listRef} className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl bg-card p-5 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <Users className="size-5 text-primary" /> Referrals
            </h2>
            {!overview?.referrals?.length ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Sparkles className="size-8" />
                No referrals yet
              </div>
            ) : (
              <ul className="space-y-2">
                {overview.referrals.map((referral) => {
                  const meta = REFERRAL_STATUS_META[referral.status] ?? REFERRAL_STATUS_META.PENDING;
                  const countdown = referral.status === "COOLING" ? formatCoolingCountdown(referral.coolingUntil) : null;
                  return (
                    <li key={referral.id} data-loyalty-row className="flex items-center justify-between gap-3 rounded-2xl bg-secondary p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{referral.referredName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(referral.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          {countdown ? ` · ${countdown}` : ""}
                        </p>
                      </div>
                      <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold", meta.tone)}>
                        {meta.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-3xl bg-card p-5 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <Wallet className="size-5 text-primary" /> Wallet activity
            </h2>
            {!overview?.transactions?.length ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Wallet className="size-8" />
                Nothing yet
              </div>
            ) : (
              <ul className="space-y-2">
                {overview.transactions.map((tx) => (
                  <li key={tx.id} data-loyalty-row className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
                    {tx.type === "CREDIT" ? (
                      <ArrowUpCircle className="size-5 shrink-0 text-success" />
                    ) : (
                      <ArrowDownCircle className="size-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{tx.description || tx.source}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <p className={cn("shrink-0 text-sm font-bold", tx.type === "CREDIT" && "text-success")}>
                      {tx.type === "CREDIT" ? "+" : "-"}₹{tx.amount}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </UserLayout>
  );
}
