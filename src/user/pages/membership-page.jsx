"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { cn } from "@/lib/utils";
import { BadgePercent, Check, Clock, Crown, Gift, Headset, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  { icon: BadgePercent, title: "Up to 40% off", tone: "bg-primary/10 text-primary" },
  { icon: Gift, title: "Member combos", tone: "bg-accent/15 text-accent" },
  { icon: Clock, title: "Priority booking", tone: "bg-primary/10 text-primary" },
  { icon: Headset, title: "VIP support", tone: "bg-accent/15 text-accent" },
];

function PlanCard({ plan, isCurrentPlan, isRecommended, onChoose }) {
  const paid = Number(plan.priceAmount ?? 0) > 0;
  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 rounded-3xl bg-card p-6 ring-2",
        isCurrentPlan ? "ring-primary" : isRecommended ? "ring-accent" : "ring-transparent"
      )}
    >
      {isCurrentPlan || isRecommended ? (
        <span
          className={cn(
            "absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-bold",
            isCurrentPlan ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
          )}
        >
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
            <span className="text-4xl font-bold">₹{Number(plan.priceAmount).toFixed(0)}</span>
            <span className="ml-1 font-sans text-sm text-muted-foreground">/month</span>
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

      {!isCurrentPlan && onChoose ? (
        <Button
          type="button"
          className="h-11 w-full rounded-full"
          variant={isRecommended ? "default" : "secondary"}
          onClick={onChoose}
        >
          Choose {plan.name}
        </Button>
      ) : null}
    </div>
  );
}

export default function UserMembershipPage() {
  const { appUser, loading } = useAuth();
  const [membership, setMembership] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!appUser || appUser.role !== "USER") return;
    void fetchMembership()
      .then(setMembership)
      .catch((error) => notify.error("Couldn't load plans", { description: error.message }))
      .finally(() => setPageLoading(false));
  }, [appUser]);

  function onChoosePlan(plan) {
    notify.message(`${plan.name} is activated at the salon desk`, {
      description: "Online payment is coming soon.",
      icon: <Store className="size-5" />,
    });
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

  return (
    <UserLayout pageTitle="Membership">
      <div className="space-y-8">
        <section className="flex flex-wrap items-center gap-4 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15">
            <Crown className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm opacity-80">Your plan</p>
            <p className="font-display text-3xl font-bold">{currentPlan?.name ?? "Free"}</p>
          </div>
          {!isFree ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-bold text-success">
              <Check className="size-4" /> Active
            </span>
          ) : null}
        </section>

        {isFree ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {PERKS.map(({ icon: Icon, title, tone }) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl bg-card p-4">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tone)}>
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-semibold">{title}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {membership?.freePlan ? <PlanCard plan={membership.freePlan} isCurrentPlan={isFree} /> : null}
          {(membership?.allPlans ?? [])
            .filter((plan) => plan.segment !== "FREE")
            .map((plan) => {
              const isCurrentPlan = currentPlan?.segment === plan.segment;
              return (
                <PlanCard
                  key={plan.segment}
                  plan={plan}
                  isCurrentPlan={isCurrentPlan}
                  isRecommended={isFree && plan.segment === "BASIC"}
                  onChoose={isCurrentPlan ? undefined : () => onChoosePlan(plan)}
                />
              );
            })}
        </div>
      </div>
    </UserLayout>
  );
}
