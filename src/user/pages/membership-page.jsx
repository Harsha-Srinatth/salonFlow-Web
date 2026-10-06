"use client";
import { AnimatePresence, motion } from "motion/react";
import { BadgePercent, Check, CheckCircle2, Clock, Crown, Gift, Headset, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authedRequest } from "@/lib/payments-api";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { pollMembershipStatus, runMembershipCheckout } from "@/lib/membership-checkout";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { UserLayout } from "../portal/user-layout";

async function fetchMembership() {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl("/api/customer/membership"), {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Could not load membership");
  return data;
}

const PERKS = [
  { icon: BadgePercent, title: "Member prices", tone: "bg-primary/10 text-primary" },
  { icon: Gift, title: "Member combos", tone: "bg-accent/15 text-accent" },
  { icon: Clock, title: "Priority booking", tone: "bg-primary/10 text-primary" },
  { icon: Headset, title: "VIP support", tone: "bg-accent/15 text-accent" },
];

const ACTION_LABEL = { BUY: "Get", RENEW: "Renew", UPGRADE: "Upgrade to" };
const formatDate = (value) => (value ? new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "");
const periodLabel = (plan) => (plan.durationMonths === 1 ? "/month" : plan.durationMonths === 12 ? "/year" : `/${plan.durationMonths} months`);

function PlanCard({ plan, index, isCurrentPlan, isRecommended, expiresAt, busy, disabled, onChoose }) {
  const paid = Number(plan.priceAmount ?? 0) > 0;
  const action = plan.purchaseAction;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 260, damping: 26 }}
      whileHover={{ y: -4 }}
      className={cn("relative flex flex-col gap-5 rounded-3xl bg-card p-6 ring-2 transition-shadow hover:shadow-xl", isCurrentPlan ? "ring-primary" : isRecommended ? "ring-accent" : "ring-transparent")}
    >
      {isCurrentPlan || isRecommended ? (
        <span className={cn("absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-bold", isCurrentPlan ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>
          {isCurrentPlan ? "Current" : "Best value"}
        </span>
      ) : null}

      <div>
        <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
          <Crown className="size-6" />
        </span>
        <h3 className="mt-4 font-display text-2xl font-bold">{plan.name}</h3>
        {plan.tagline ? <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p> : null}
      </div>

      <p className="font-display">
        {paid ? (
          <>
            <span className="text-4xl font-bold">₹{Number(plan.priceAmount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            <span className="ml-1 font-sans text-sm text-muted-foreground">{periodLabel(plan)}</span>
          </>
        ) : (
          <span className="text-3xl font-bold">Free</span>
        )}
      </p>

      <ul className="flex-1 space-y-2.5">
        {(plan.benefits ?? []).map((benefit) => (
          <li key={benefit} className="flex items-start gap-2.5 text-sm font-medium">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
              <Check className="size-3.5" />
            </span>
            {benefit}
          </li>
        ))}
      </ul>

      {isCurrentPlan && paid && expiresAt ? <p className="text-center text-xs font-medium text-muted-foreground">Valid until {formatDate(expiresAt)}</p> : null}

      {action && onChoose ? (
        <Button type="button" className="h-11 w-full rounded-full" variant={isRecommended || action === "RENEW" ? "default" : "secondary"} disabled={disabled || busy} onClick={() => onChoose(plan)}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy ? "Opening payment…" : `${ACTION_LABEL[action]} ${plan.name}`}
        </Button>
      ) : null}
    </motion.div>
  );
}

const RESULT_COPY = {
  ACTIVE: { icon: CheckCircle2, tone: "text-success", title: "You're a member!" },
  PENDING: { icon: Loader2, tone: "text-primary", title: "Confirming your payment…" },
  FAILED: { icon: XCircle, tone: "text-destructive", title: "Payment didn't go through" },
  EXPIRED: { icon: XCircle, tone: "text-muted-foreground", title: "Checkout expired" },
  REVIEW: { icon: ShieldAlert, tone: "text-warning", title: "We need to check your payment" },
};

function ResultSheet({ result, onClose }) {
  const copy = RESULT_COPY[result?.state] ?? RESULT_COPY.PENDING;
  const Icon = copy.icon;
  return (
    <AnimatePresence>
      {result ? (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={copy.title}>
          <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 28 }} className="w-full max-w-sm rounded-3xl bg-card p-7 text-center shadow-2xl">
            <motion.span initial={{ scale: 0.3, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 16 }} className={cn("mx-auto grid size-16 place-items-center rounded-full bg-muted", copy.tone)}>
              <Icon className={cn("size-9", result.state === "PENDING" && "animate-spin")} />
            </motion.span>
            <h3 className="mt-4 font-display text-2xl font-bold">{copy.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{result.message}</p>
            {result.state === "ACTIVE" && result.expiresAt ? <p className="mt-2 text-sm font-semibold">Valid until {formatDate(result.expiresAt)}</p> : null}
            {result.state !== "PENDING" ? (
              <Button className="mt-6 h-11 w-full rounded-full" onClick={onClose}>
                {result.state === "ACTIVE" ? "Start saving" : "Close"}
              </Button>
            ) : (
              <Button className="mt-6 h-11 w-full rounded-full" variant="ghost" onClick={onClose}>
                Keep browsing
              </Button>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function UserMembershipPage() {
  const { appUser, loading } = useAuth();
  const [membership, setMembership] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [busySegment, setBusySegment] = useState(null);
  const [result, setResult] = useState(null);

  const reload = useCallback(() => fetchMembership().then(setMembership), []);

  useEffect(() => {
    if (!appUser || appUser.role !== "USER") return;
    void reload()
      .catch((error) => notify.error("Couldn't load plans", { description: error.message }))
      .finally(() => setPageLoading(false));
  }, [appUser, reload]);

  async function onChoosePlan(plan) {
    if (busySegment) return;
    setBusySegment(plan.segment);
    try {
      const { outcome, status } = await runMembershipCheckout({ request: authedRequest, segment: plan.segment });
      if (outcome === "DISMISSED") return;
      setResult({ ...status, state: status?.state ?? "PENDING" });
      if (status?.state === "PENDING") {
        // Payment may still be landing (UPI app, slow webhook): keep checking, never guess.
        const settled = await pollMembershipStatus(authedRequest, status.orderId, { onUpdate: (s) => s.state !== "PENDING" && setResult(s) });
        if (settled) setResult(settled);
      }
      await reload().catch(() => undefined);
    } catch (error) {
      notify.error(error?.message ?? "Could not start the payment");
    } finally {
      setBusySegment(null);
    }
  }

  if (loading || pageLoading) {
    return (
      <UserLayout pageTitle="Membership">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-96 rounded-3xl" />
          ))}
        </div>
      </UserLayout>
    );
  }

  if (!appUser || appUser.role !== "USER") {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <p>Sign in as a customer to view membership plans.</p>
        <Button asChild>
          <Link to="/auth/login">Customer login</Link>
        </Button>
      </div>
    );
  }

  const currentPlan = membership?.currentPlan;
  const isFree = !currentPlan?.isPaid;
  const online = membership?.onlinePaymentsEnabled !== false;

  return (
    <UserLayout pageTitle="Membership">
      <div className="space-y-8">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-4 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15">
            <Crown className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm opacity-80">Your plan</p>
            <p className="font-display text-3xl font-bold">{currentPlan?.name ?? "Free"}</p>
            {currentPlan?.isPaid && currentPlan.expiresAt ? <p className="mt-0.5 text-sm opacity-80">Valid until {formatDate(currentPlan.expiresAt)}</p> : null}
            {currentPlan?.lapsed ? <p className="mt-0.5 text-sm font-medium">Your membership has ended. Renew to get member prices again.</p> : null}
          </div>
          {!isFree ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-bold text-success">
              <Check className="size-4" /> Active
            </span>
          ) : null}
        </motion.section>

        {isFree ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {PERKS.map(({ icon: Icon, title, tone }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="flex items-center gap-3 rounded-2xl bg-card p-4">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tone)}>
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-semibold">{title}</span>
              </motion.div>
            ))}
          </div>
        ) : null}

        {!online ? <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">Online payment is not available right now. Ask at the salon desk to activate a plan.</p> : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {membership?.freePlan ? <PlanCard index={0} plan={membership.freePlan} isCurrentPlan={isFree} /> : null}
          {(membership?.allPlans ?? [])
            .filter((plan) => plan.segment !== "FREE")
            .map((plan, i) => {
              const isCurrentPlan = currentPlan?.segment === plan.segment;
              return (
                <PlanCard
                  key={plan.segment}
                  index={i + 1}
                  plan={plan}
                  isCurrentPlan={isCurrentPlan}
                  isRecommended={isFree && plan.segment === "BASIC"}
                  expiresAt={currentPlan?.expiresAt}
                  busy={busySegment === plan.segment}
                  disabled={!online || Boolean(busySegment)}
                  onChoose={online ? onChoosePlan : undefined}
                />
              );
            })}
        </div>
      </div>
      <ResultSheet result={result} onClose={() => setResult(null)} />
    </UserLayout>
  );
}
