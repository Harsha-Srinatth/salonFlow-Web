"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Gift, Hourglass, PartyPopper, RefreshCw, Sparkles, Ticket, Trophy, UserRound, Users, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { ButtonLoadingMorph, EmptyState, ErrorState, IconButton, PullToRefresh, ReferralShareCard, RewardReveal, StatusChip, useAsyncAction } from "@/components/kit";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { SkeletonCard, SkeletonList, SkeletonShimmer } from "@/components/motion/skeleton-shimmer";
import { haptic, spring } from "@/components/motion/presets";
import { saveCustomerGender } from "@/lib/customer-profile";
import { formatMoney } from "@/lib/format";
import { formatIsoDate, salonDateOf } from "@/lib/salon-date";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { UserLayout } from "../portal/user-layout";
import { useInvite } from "../portal/user-frame-context";
import { useLoyalty } from "../lib/use-loyalty";
import { drawRewardCard, fetchRewardVault, peekUserResource, REWARD_VAULT_PATH } from "../lib/user-api";
import { SectionHeading } from "../components/section-heading";

const money = (n) => formatMoney(n);
const shortDate = (iso) => (iso ? formatIsoDate(salonDateOf(iso), { day: "numeric", month: "short" }) : "");
const FAN = [-14, -7, 0, 7, 14];

function coolingLabel(coolingUntil) {
  if (!coolingUntil) return null;
  const ms = new Date(coolingUntil).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "any moment now";
  const h = Math.floor(ms / 3600e3);
  const m = Math.round((ms % 3600e3) / 60e3);
  return h >= 1 ? `in ${h}h ${m}m` : `in ${Math.max(1, m)} min`;
}

/** Fanned deck of the possible prizes; shuffles while a draw is in flight. */
function CardFan({ cards, drawing }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto flex h-44 max-w-md items-end justify-center overflow-hidden px-6" aria-label={`${cards.length} possible rewards`}>
      {cards.slice(0, 5).map((card, i) => {
        const rot = FAN[i] ?? 0;
        return (
          <motion.div
            key={card.id}
            initial={reduce ? false : { opacity: 0, y: 30, rotate: 0 }}
            animate={
              drawing && !reduce
                ? { rotate: [rot, rot * 1.8, -rot, rot], y: [0, -14, -4, 0], opacity: 1, transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" } }
                : { opacity: 1, y: 0, rotate: rot, transition: { ...spring.soft, delay: i * 0.06 } }
            }
            style={{ transformOrigin: "50% 120%", zIndex: i }}
            className="-mx-4 flex h-36 w-[5.5rem] shrink-0 sm:-mx-5 sm:h-40 sm:w-32 flex-col items-center justify-center gap-1.5 rounded-2xl bg-card p-3 text-center shadow-lift ring-1 ring-inset ring-border/60 sm:w-32"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-gold/16 text-ink-warning">
              <Ticket className="size-5" aria-hidden />
            </span>
            <p className="line-clamp-3 text-micro leading-tight font-semibold">{card.serviceName}</p>
            <p className="text-micro text-ink-neutral">{money(card.serviceBasePrice)}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function VoucherCard({ win, index }) {
  const reduce = useReducedMotion();
  const used = win.status === "USED";
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.soft, delay: reduce ? 0 : Math.min(index, 8) * 0.06 }}
      className={cn(
        "relative isolate flex items-stretch overflow-hidden rounded-card ring-1 ring-inset",
        used ? "bg-muted/60 ring-border/60" : "relative bg-gold/8 ring-gold/40"
      )}
    >
      <div className={cn("grid w-16 shrink-0 place-items-center border-r-2 border-dashed", used ? "border-border text-ink-neutral" : "border-gold/40 text-ink-warning")}>
        <Ticket className="size-6" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 p-4">
        <p className={cn("truncate font-semibold", used && "text-ink-neutral line-through decoration-1")}>{win.serviceName}</p>
        <p className="text-caption text-ink-neutral">Won {shortDate(win.wonAt)}</p>
      </div>
      <div className="flex items-center pr-4">
        <span className={cn("rounded-full px-2.5 py-1 text-micro font-bold", used ? "bg-muted text-ink-neutral" : "bg-gold/20 text-ink-warning")}>{used ? "Used" : "Free · Ready"}</span>
      </div>
    </motion.li>
  );
}

export default function UserLoyaltyPage() {
  const { appUser, refresh } = useAuth();
  const isUser = appUser?.role === "USER";
  const openInvite = useInvite();
  const reduce = useReducedMotion();
  const { overview, loading, error, reload, referralCode, referralLink } = useLoyalty({ enabled: isUser });
  const [vault, setVault] = useState(() => {
    const seen = peekUserResource(REWARD_VAULT_PATH);
    return seen
      ? { cards: seen.cards ?? [], pendingDraws: seen.pendingDraws ?? [], wins: seen.wins ?? [], needsGender: Boolean(seen.needsGender), loaded: true }
      : { cards: [], pendingDraws: [], wins: [], needsGender: false, loaded: false };
  });
  const [savingGender, setSavingGender] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [prize, setPrize] = useState(null);
  const draw = useAsyncAction({ successMs: 600 });

  const loadVault = useCallback(async () => {
    try {
      const data = await fetchRewardVault();
      setVault({ cards: data.cards ?? [], pendingDraws: data.pendingDraws ?? [], wins: data.wins ?? [], needsGender: Boolean(data.needsGender), loaded: true });
    } catch {
      // The vault is a bonus layer on top of wallet/referrals: a failed load shouldn't block the page.
      setVault((v) => ({ ...v, loaded: true }));
    }
  }, []);

  useEffect(() => {
    if (isUser) void loadVault();
  }, [isUser, loadVault]);

  const reloadAll = useCallback(() => Promise.allSettled([reload(), loadVault()]), [reload, loadVault]);

  async function handleSetGender(value) {
    setSavingGender(true);
    try {
      await saveCustomerGender(value);
      await refresh();
      await loadVault();
      notify.success("Saved");
    } catch (err) {
      notify.error("Couldn't save", { description: err.message });
    } finally {
      setSavingGender(false);
    }
  }

  async function handleDraw() {
    const nextDraw = vault.pendingDraws[0];
    if (!nextDraw || drawing) return;
    setDrawing(true);
    setPrize(null);
    haptic("tap");
    try {
      const [result] = await Promise.all([drawRewardCard(nextDraw.referralId), new Promise((r) => setTimeout(r, reduce ? 0 : 1200))]);
      setPrize(result.card);
      await loadVault();
    } catch (err) {
      notify.error("Couldn't draw a reward", { description: err.message });
      throw err;
    } finally {
      setDrawing(false);
    }
  }

  const invited = Number(overview?.totalReferred ?? 0);
  const rewarded = Number(overview?.totalRewarded ?? 0);
  const drawsReady = vault.pendingDraws.length;

  return (
    <UserLayout pageTitle="Rewards" width="lg" actions={<IconButton icon={RefreshCw} label="Refresh" className="hidden sm:inline-grid" onClick={() => void reloadAll()} />}>
      <PullToRefresh onRefresh={reloadAll}>
        <div className="space-y-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <SkeletonCard className="min-h-56" />
              <SkeletonCard className="min-h-56" />
            </div>
          ) : error && !overview ? (
            <ErrorState title="Couldn't load rewards" onRetry={reloadAll} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Wallet */}
              <section className="relative overflow-hidden isolate flex flex-col justify-between gap-5 rounded-card bg-card p-6 ring-1 ring-inset ring-border/60" aria-label="Wallet">
                <div className="relative z-[2]">
                  <p className="flex items-center gap-2 text-caption font-semibold text-ink-neutral">
                    <Wallet className="size-4" aria-hidden /> Wallet balance
                  </p>
                  <AnimatedCounter value={Number(overview?.walletBalance ?? 0)} format={money} className="mt-1 block font-display text-display-xl leading-none font-bold text-gradient-portal" />
                  {Number(overview?.pendingCredit ?? 0) > 0 ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-caption font-semibold">
                      <Hourglass className="size-3.5 text-ink-info" aria-hidden /> {money(overview.pendingCredit)} verifying
                    </p>
                  ) : null}
                </div>
                <div className="relative z-[2] grid grid-cols-3 gap-2">
                  {[
                    { icon: Users, value: invited, label: "Invited" },
                    { icon: Hourglass, value: Number(overview?.totalPending ?? 0), label: "Pending" },
                    { icon: Trophy, value: rewarded, label: "Rewarded" },
                  ].map(({ icon: Icon, value, label }) => (
                    <div key={label} className="rounded-2xl bg-card/80 p-3 text-center ring-1 ring-inset ring-border/50">
                      <Icon className="mx-auto size-4 text-portal" aria-hidden />
                      <AnimatedCounter value={value} className="mt-1 block font-display text-xl font-bold" />
                      <p className="text-micro text-ink-neutral">{label}</p>
                    </div>
                  ))}
                </div>
              </section>

              {referralCode ? (
                <ReferralShareCard
                  code={referralCode}
                  link={referralLink}
                  pendingCredit={Number(overview?.pendingCredit ?? 0)}
                  progress={invited > 0 ? { current: rewarded, target: invited, label: "Friends rewarded" } : undefined}
                  onInvite={openInvite}
                />
              ) : null}
            </div>
          )}

          {/* Reward vault */}
          <section className="space-y-4 rounded-card bg-card p-5 ring-1 ring-inset ring-border/60 sm:p-6" aria-label="Reward vault">
            <SectionHeading
              icon={Gift}
              title="Reward vault"
              className="mb-0"
              trailing={
                drawsReady ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/16 px-3 py-1 text-caption font-bold text-ink-warning">
                    <PartyPopper className="size-3.5" aria-hidden /> {drawsReady} ready
                  </span>
                ) : null
              }
            />
            <p className="text-caption text-ink-neutral">1 friend's first visit = 1 free-service draw</p>

            {vault.needsGender ? (
              <div className="space-y-3 rounded-2xl bg-portal/8 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <UserRound className="size-4 text-portal" aria-hidden /> Pick your gender to unlock every card
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["MALE", "Male"],
                    ["FEMALE", "Female"],
                    ["OTHER", "Other"],
                  ].map(([value, label]) => (
                    <button key={value} type="button" disabled={savingGender} onClick={() => void handleSetGender(value)} className="h-11 rounded-full bg-card px-5 text-sm font-semibold ring-1 ring-inset ring-border hover:ring-portal/50 disabled:opacity-50">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {!vault.loaded ? (
              <SkeletonShimmer className="h-44 rounded-card" />
            ) : prize ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <RewardReveal reward={{ title: prize.serviceName, subtitle: `Free · worth ${money(prize.serviceBasePrice)}`, icon: Sparkles }} onReveal={() => notify.success(`You won ${prize.serviceName}`, { description: "Saved to your vouchers" })} />
                <button type="button" onClick={() => setPrize(null)} className="h-11 rounded-full px-4 text-sm font-semibold text-portal hover:bg-portal/10">
                  Done
                </button>
              </div>
            ) : vault.cards.length ? (
              <CardFan cards={vault.cards} drawing={drawing} />
            ) : (
              <EmptyState illustration="gift" title="Cards coming soon" compact className="bg-transparent" />
            )}

            {!prize ? (
              <div className="flex justify-center">
                <ButtonLoadingMorph
                  state={draw.state}
                  icon={Gift}
                  variant={drawsReady && !vault.needsGender ? "gold" : "secondary"}
                  size="lg"
                  disabled={!drawsReady || !vault.cards.length || vault.needsGender || drawing}
                  loadingLabel="Shuffling…"
                  successLabel="Scratch it!"
                  onClick={() => draw.run(handleDraw)}
                >
                  {vault.needsGender ? "Add gender to draw" : drawsReady ? "Draw reward" : "No draws yet"}
                </ButtonLoadingMorph>
              </div>
            ) : null}
          </section>

          {/* Vouchers */}
          {vault.wins.length ? (
            <section aria-label="My vouchers">
              <SectionHeading icon={Ticket} title="My vouchers" />
              <ul className="grid gap-3 sm:grid-cols-2">
                {vault.wins.map((win, i) => (
                  <VoucherCard key={win.id} win={win} index={i} />
                ))}
              </ul>
            </section>
          ) : null}

          {/* Referrals + activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-label="Referrals">
              <SectionHeading icon={Users} title="Referrals" />
              {loading ? (
                <SkeletonList rows={3} />
              ) : !overview?.referrals?.length ? (
                <EmptyState
                  illustration="gift"
                  title="No referrals yet"
                  compact
                  action={
                    referralLink ? (
                      <button type="button" onClick={openInvite} className="inline-flex h-11 items-center gap-2 rounded-control bg-portal px-5 text-sm font-semibold text-portal-foreground shadow-soft">
                        <Gift className="size-4" aria-hidden /> Invite a friend
                      </button>
                    ) : null
                  }
                />
              ) : (
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {overview.referrals.map((referral, i) => {
                      const countdown = referral.status === "COOLING" ? coolingLabel(referral.coolingUntil) : null;
                      return (
                        <motion.li
                          key={referral.id}
                          initial={reduce ? false : { opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ ...spring.soft, delay: reduce ? 0 : Math.min(i, 8) * 0.05 }}
                          className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-inset ring-border/60"
                        >
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-portal/12 font-semibold text-portal">{`${referral.referredName ?? "?"}`.charAt(0).toUpperCase()}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{referral.referredName}</p>
                            <p className="text-caption text-ink-neutral">
                              {shortDate(referral.createdAt)}
                              {countdown ? ` · ${countdown}` : ""}
                            </p>
                          </div>
                          <StatusChip status={referral.status} audience="customer" size="sm" />
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </section>

            <section aria-label="Wallet activity">
              <SectionHeading icon={Wallet} title="Wallet activity" />
              {loading ? (
                <SkeletonList rows={3} />
              ) : !overview?.transactions?.length ? (
                <EmptyState illustration="bag" title="Nothing yet" compact />
              ) : (
                <ul className="space-y-2">
                  {overview.transactions.map((tx, i) => {
                    const credit = tx.type === "CREDIT";
                    return (
                      <motion.li
                        key={tx.id}
                        initial={reduce ? false : { opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...spring.soft, delay: reduce ? 0 : Math.min(i, 8) * 0.05 }}
                        className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-inset ring-border/60"
                      >
                        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", credit ? "bg-success/12 text-ink-success" : "bg-muted text-ink-neutral")}>
                          {credit ? <ArrowDownLeft className="size-5" aria-hidden /> : <ArrowUpRight className="size-5" aria-hidden />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{tx.description || tx.source}</p>
                          <p className="text-caption text-ink-neutral">{shortDate(tx.createdAt)}</p>
                        </div>
                        <p className={cn("shrink-0 text-sm font-bold tabular-nums", credit && "text-ink-success")}>
                          {credit ? "+" : "−"}
                          {money(tx.amount)}
                        </p>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </PullToRefresh>
    </UserLayout>
  );
}
