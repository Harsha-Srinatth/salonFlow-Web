"use client";
import { motion, useReducedMotion } from "motion/react";
import { BadgePercent, Check, Clock, Crown, Gift, Headset, Minus, ShieldAlert, Sparkles, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandLoader, ButtonLoadingMorph, ErrorState, MorphDialog, ResponsiveModal, useAsyncAction } from "@/components/kit";
import { SkeletonCard } from "@/components/motion/skeleton-shimmer";
import { SuccessBurst } from "@/components/motion/success-burst";
import { fireConfetti } from "@/components/motion/confetti-burst";
import { haptic, interaction, spring } from "@/components/motion/presets";
import { authedRequest } from "@/lib/payments-api";
import { pollMembershipStatus, runMembershipCheckout } from "@/lib/membership-checkout";
import { formatMoney } from "@/lib/format";
import { formatIsoDate, salonDateOf } from "@/lib/salon-date";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { UserLayout } from "../portal/user-layout";
import { fetchMembership, MEMBERSHIP_PATH, peekUserResource } from "../lib/user-api";
import { SectionHeading } from "../components/section-heading";

const PERKS = [
  { icon: BadgePercent, title: "Member prices" },
  { icon: Gift, title: "Member combos" },
  { icon: Clock, title: "Priority booking" },
  { icon: Headset, title: "VIP support" },
];
const ACTION_LABEL = { BUY: "Get", RENEW: "Renew", UPGRADE: "Upgrade to" };
const formatDate = (value) => (value ? formatIsoDate(salonDateOf(value), { day: "numeric", month: "short", year: "numeric" }) : "");
const periodLabel = (plan) => (plan.durationMonths === 1 ? "/month" : plan.durationMonths === 12 ? "/year" : `/${plan.durationMonths} months`);

function PlanCard({ plan, index, isCurrentPlan, isRecommended, expiresAt, disabled, onChoose }) {
  const reduce = useReducedMotion();
  const paid = Number(plan.priceAmount ?? 0) > 0;
  const action = plan.purchaseAction;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.soft, delay: reduce ? 0 : index * 0.07 }}
      whileHover={reduce ? undefined : interaction.cardHover}
      style={{ borderRadius: 24 }}
      className={cn(
        "relative flex flex-col gap-5 overflow-hidden bg-card p-6 shadow-soft ring-1 ring-inset transition-shadow hover:shadow-lift",
        isCurrentPlan ? "ring-2 ring-portal shadow-glow" : isRecommended ? "ring-2 ring-gold/60" : "ring-border/60",
        isRecommended && "relative"
      )}
    >
      {isCurrentPlan || isRecommended ? (
        <span className={cn("absolute top-5 right-5 rounded-full px-3 py-1 text-micro font-bold", isCurrentPlan ? "bg-portal text-portal-foreground" : "bg-gold/20 text-ink-warning")}>
          {isCurrentPlan ? "Current" : "Best value"}
        </span>
      ) : null}
      <div>
        <span className={cn("grid size-12 place-items-center rounded-2xl", paid ? "bg-gold/16 text-ink-warning" : "bg-muted text-ink-neutral")}>
          <Crown className="size-6" aria-hidden />
        </span>
        <h3 className="mt-4 font-display text-title font-bold">{plan.name}</h3>
        {plan.tagline ? <p className="mt-0.5 text-caption text-ink-neutral">{plan.tagline}</p> : null}
      </div>
      <p className="font-display">
        {paid ? (
          <>
            <span className="text-display-lg leading-none font-bold">{formatMoney(plan.priceAmount)}</span>
            <span className="ml-1 font-sans text-sm text-ink-neutral">{periodLabel(plan)}</span>
          </>
        ) : (
          <span className="text-display-lg leading-none font-bold">{formatMoney(0)}</span>
        )}
      </p>
      <ul className="flex-1 space-y-2.5">
        {(plan.benefits ?? []).map((benefit) => (
          <li key={benefit} className="flex items-start gap-2.5 text-sm font-medium">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success/12 text-ink-success">
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            </span>
            {benefit}
          </li>
        ))}
      </ul>
      {isCurrentPlan && paid && expiresAt ? <p className="text-center text-caption font-semibold text-ink-neutral">Valid until {formatDate(expiresAt)}</p> : null}
      {action && onChoose ? (
        <ButtonLoadingMorph variant={isRecommended || action === "RENEW" ? "primary" : "secondary"} fullWidth disabled={disabled} onClick={() => onChoose(plan)} icon={Crown}>
          {`${ACTION_LABEL[action]} ${plan.name}`}
        </ButtonLoadingMorph>
      ) : null}
    </motion.div>
  );
}

/** Benefit × plan matrix built from each plan's own `benefits` list (no invented rows). */
function ComparePlans({ plans }) {
  const rows = useMemo(() => Array.from(new Set(plans.flatMap((p) => p.benefits ?? []))), [plans]);
  if (plans.length < 2 || !rows.length) return null;
  return (
    <section aria-label="Compare plans">
      <SectionHeading icon={Sparkles} title="Compare" />
      <div className="overflow-hidden rounded-card bg-card ring-1 ring-inset ring-border/60">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th scope="col" className="p-3 text-left text-caption font-semibold text-ink-neutral">
                <span className="sr-only">Benefit</span>
              </th>
              {plans.map((p) => (
                <th key={p.segment} scope="col" className="w-[4.25rem] px-1 py-3 text-center font-display text-[12px] font-bold break-words sm:w-28 sm:text-sm">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row} className="border-b border-border/40 last:border-0">
                <th scope="row" className="p-3 text-left text-[13px] font-medium sm:text-sm">
                  {row}
                </th>
                {plans.map((p) => {
                  const has = (p.benefits ?? []).includes(row);
                  return (
                    <td key={p.segment} className="px-1 py-3 text-center">
                      {has ? (
                        <span className="mx-auto grid size-6 place-items-center rounded-full bg-success/12 text-ink-success" aria-label="Included">
                          <Check className="size-3.5" strokeWidth={3} aria-hidden />
                        </span>
                      ) : (
                        <Minus className="mx-auto size-4 text-ink-neutral/50" aria-label="Not included" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const RESULT_COPY = {
  ACTIVE: { title: "You're a member!" },
  PENDING: { title: "Confirming payment…" },
  FAILED: { icon: XCircle, tone: "text-ink-destructive bg-destructive/12", title: "Payment didn't go through" },
  EXPIRED: { icon: XCircle, tone: "text-ink-neutral bg-muted", title: "Checkout expired" },
  REVIEW: { icon: ShieldAlert, tone: "text-ink-warning bg-warning/14", title: "We need to check your payment" },
};

function ResultDialog({ result, onClose }) {
  const state = result?.state ?? "PENDING";
  const copy = RESULT_COPY[state] ?? RESULT_COPY.PENDING;
  const Icon = copy.icon;
  useEffect(() => {
    if (state === "ACTIVE") {
      haptic("reward");
      void fireConfetti({ particleCount: 140, spread: 90 });
    }
  }, [state]);
  return (
    <MorphDialog open={Boolean(result)} onOpenChange={(o) => !o && state !== "PENDING" && onClose()} title={copy.title} size="sm" hideClose={state === "PENDING"}>
      {result ? (
        <div className="flex flex-col items-center gap-3 pb-1 text-center">
          {state === "ACTIVE" ? (
            <SuccessBurst size={84} tone="hsl(var(--gold))" label="Membership active" />
          ) : state === "PENDING" ? (
            <BrandLoader size="lg" label="Confirming with the bank" />
          ) : (
            <span className={cn("grid size-16 place-items-center rounded-full", copy.tone)}>
              <Icon className="size-8" aria-hidden />
            </span>
          )}
          {result.message ? <p className="text-sm text-ink-neutral">{result.message}</p> : null}
          {state === "ACTIVE" && result.expiresAt ? <p className="text-sm font-semibold">Valid until {formatDate(result.expiresAt)}</p> : null}
          <button type="button" onClick={onClose} className={cn("mt-2 h-11 w-full rounded-control text-sm font-semibold", state === "ACTIVE" ? "bg-portal text-portal-foreground shadow-soft" : "bg-secondary")}>
            {state === "ACTIVE" ? "Start saving" : state === "PENDING" ? "Keep browsing" : "Close"}
          </button>
        </div>
      ) : null}
    </MorphDialog>
  );
}

export default function UserMembershipPage() {
  const { appUser, refresh } = useAuth();
  const isUser = appUser?.role === "USER";
  const [membership, setMembership] = useState(() => peekUserResource(MEMBERSHIP_PATH) ?? null);
  const [loadError, setLoadError] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const reload = useCallback(
    () =>
      fetchMembership()
        .then((data) => {
          setMembership(data);
          setLoadError(null);
        })
        .catch((err) => {
          setLoadError(err);
          throw err;
        }),
    []
  );

  useEffect(() => {
    if (isUser) reload().catch(() => undefined);
  }, [isUser, reload]);

  async function checkout() {
    if (!chosen || busy) return;
    setBusy(true);
    try {
      const { outcome, status } = await runMembershipCheckout({ request: authedRequest, segment: chosen.segment });
      if (outcome === "DISMISSED") return;
      setChosen(null);
      setResult({ ...status, state: status?.state ?? "PENDING" });
      if (status?.state === "PENDING") {
        // Payment may still be landing (UPI app, slow webhook): keep checking, never guess.
        const settled = await pollMembershipStatus(authedRequest, status.orderId, { onUpdate: (s) => s.state !== "PENDING" && setResult(s) });
        if (settled) setResult(settled);
      }
      await reload().catch(() => undefined);
      await refresh().catch(() => undefined);
    } catch (err) {
      notify.error(err?.message ?? "Could not start the payment");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  const loading = !membership && !loadError;
  const currentPlan = membership?.currentPlan;
  const isFree = !currentPlan?.isPaid;
  const online = membership?.onlinePaymentsEnabled !== false;
  const paidPlans = (membership?.allPlans ?? []).filter((plan) => plan.segment !== "FREE");
  const comparePlans = [membership?.freePlan, ...paidPlans].filter(Boolean);

  return (
    <UserLayout pageTitle="Membership">
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonCard key={i} className="min-h-96" />
          ))}
        </div>
      ) : loadError && !membership ? (
        <ErrorState title="Couldn't load plans" onRetry={reload} />
      ) : (
        <div className="space-y-8">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.soft}
            className="relative isolate flex flex-wrap items-center gap-4 overflow-hidden rounded-card p-6 bg-primary text-primary-foreground sm:p-8"
          >
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-foreground/10">
              <Crown className="size-7" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold opacity-85">Your plan</p>
              <p className="font-display text-display-lg leading-tight font-bold">{currentPlan?.name ?? "Free"}</p>
              {currentPlan?.isPaid && currentPlan.expiresAt ? <p className="mt-0.5 text-sm opacity-85">Valid until {formatDate(currentPlan.expiresAt)}</p> : null}
              {currentPlan?.lapsed ? <p className="mt-0.5 text-sm font-semibold">Ended · renew for member prices</p> : null}
            </div>
            {!isFree ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground px-4 py-2 text-sm font-bold text-primary">
                <Check className="size-4" strokeWidth={3} aria-hidden /> Active
              </span>
            ) : null}
          </motion.section>

          {isFree ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {PERKS.map(({ icon: Icon, title }, i) => (
                <motion.div key={title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.1 + i * 0.05 }} className="flex items-center gap-3 rounded-card bg-card p-4 ring-1 ring-inset ring-border/60">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-portal/12 text-portal">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold">{title}</span>
                </motion.div>
              ))}
            </div>
          ) : null}

          {!online ? <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-ink-neutral">Online payment is off right now. Ask at the desk to activate a plan.</p> : null}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {membership?.freePlan ? <PlanCard index={0} plan={membership.freePlan} isCurrentPlan={isFree} /> : null}
            {paidPlans.map((plan, i) => (
              <PlanCard
                key={plan.segment}
                index={i + 1}
                plan={plan}
                isCurrentPlan={currentPlan?.segment === plan.segment}
                isRecommended={isFree && plan.segment === "BASIC"}
                expiresAt={currentPlan?.expiresAt}
                disabled={!online || busy}
                onChoose={online ? setChosen : undefined}
              />
            ))}
          </div>

          <ComparePlans plans={comparePlans} />
        </div>
      )}

      <ResponsiveModal
        open={Boolean(chosen)}
        onOpenChange={(o) => !o && !busy && setChosen(null)}
        title={chosen ? `${ACTION_LABEL[chosen.purchaseAction] ?? "Get"} ${chosen.name}` : ""}
        icon={Crown}
        tone="gold"
        size="sm"
        footer={<CheckoutButton chosen={chosen} onCheckout={checkout} />}
      >
        {chosen ? (
          <div className="space-y-4">
            <p className="font-display">
              <span className="text-display-lg font-bold">{formatMoney(chosen.priceAmount)}</span>
              <span className="ml-1 font-sans text-sm text-ink-neutral">{periodLabel(chosen)}</span>
            </p>
            <ul className="space-y-2">
              {(chosen.benefits ?? []).map((benefit, i) => (
                <motion.li key={benefit} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.soft, delay: i * 0.05 }} className="flex items-center gap-2.5 text-sm font-medium">
                  <Check className="size-4 text-ink-success" strokeWidth={3} aria-hidden /> {benefit}
                </motion.li>
              ))}
            </ul>
            <p className="text-caption text-ink-neutral">UPI, cards and netbanking via Razorpay. Active once the payment is confirmed.</p>
          </div>
        ) : null}
      </ResponsiveModal>
      <ResultDialog result={result} onClose={() => setResult(null)} />
    </UserLayout>
  );
}

function CheckoutButton({ chosen, onCheckout }) {
  const { state, run } = useAsyncAction({ successMs: 600 });
  if (!chosen) return null;
  return (
    <ButtonLoadingMorph state={state} icon={Crown} fullWidth size="lg" loadingLabel="Opening payment…" successLabel="Done" onClick={() => run(onCheckout)}>
      Pay {formatMoney(chosen.priceAmount)}
    </ButtonLoadingMorph>
  );
}
