"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import {
  Check,
  Crown,
  Sparkles,
  TrendingUp,
  Zap,
  ArrowRight,
  Gift,
  Shield,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { UserLayout } from "../portal/user-layout";
import { LoadingOrb } from "@/components/shared/loading-orb";

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

function PlanCard({ plan, isCurrentPlan, isRecommended, onAction, disabled }) {
  return (
    <Card
      className={`transition-all relative overflow-hidden ${
        isCurrentPlan
          ? "border-primary shadow-lg bg-gradient-to-b from-primary/5 to-transparent"
          : isRecommended
            ? "border-accent shadow-md ring-2 ring-accent/20"
            : ""
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-bold transform rotate-45 translate-x-2 -translate-y-2">
          Best
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
            {isCurrentPlan && (
              <Badge className="rounded-full bg-primary text-primary-foreground">
                Current
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{plan.tagline}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Price */}
        <div className="space-y-1">
          {Number(plan.priceAmount ?? 0) > 0 ? (
            <>
              <p className="text-4xl font-bold text-foreground">
                ₹<span>{Number(plan.priceAmount).toFixed(0)}</span>
              </p>
              <p className="text-xs text-muted-foreground font-medium">per month</p>
            </>
          ) : (
            <p className="text-2xl font-bold text-foreground">Always Free</p>
          )}
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          {(plan.benefits ?? []).map((benefit, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground font-medium">{benefit}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        {!isCurrentPlan && (
          <Button
            type="button"
            className="w-full h-11"
            variant={isRecommended ? "default" : "outline"}
            disabled={disabled}
            onClick={onAction}
          >
            Choose {plan.name}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        )}
        {isCurrentPlan && (
          <Button type="button" className="w-full h-11" variant="outline" disabled>
            Current plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function UserMembershipPage() {
  const { appUser, loading, logout } = useAuth();
  const [membership, setMembership] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!appUser || appUser.role !== "USER") return;
    void fetchMembership()
      .then(setMembership)
      .catch((error) => toast.error(error.message ?? "Could not load membership"))
      .finally(() => setPageLoading(false));
  }, [appUser]);

  function onChoosePlan(plan) {
    toast.message(`Contact the salon to activate ${plan.name}. Online payment coming soon!`);
  }

  if (loading) {
    return (
      <UserLayout pageTitle="Membership">
        <LoadingOrb label="Loading membership plans…" className="h-96" />
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
    <UserLayout
      pageTitle="Membership Plans"
      actions={
        <Button variant="destructive" onClick={() => void logout()}>
          Sign out
        </Button>
      }
    >
      {pageLoading ? (
        <LoadingOrb label="Loading plans…" className="h-96" />
      ) : (
        <div className="space-y-10">
          {/* Upgrade Banner */}
          {membership?.showUpgradeBanner ? (
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-8 overflow-hidden relative">
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/20">
                    <Crown className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                      <Sparkles className="w-4 h-4" />
                      Limited time offer
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                      Unlock premium salon benefits
                    </h2>
                    <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
                      Save up to 40% on services, get exclusive combo deals, priority booking, and VIP support every visit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Current Plan Summary */}
          <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Your current plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-3xl font-bold text-foreground">{currentPlan?.name ?? "Free"}</p>
                <p className="text-sm text-muted-foreground mt-1">{currentPlan?.tagline}</p>
              </div>
              <div>
                {!isFree ? (
                  <Badge className="rounded-full bg-success text-success-foreground">
                    <Check className="mr-1 w-3 h-3" />
                    Member benefits active
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground font-medium">
                    Upgrade to unlock exclusive member-only offers and discounts.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Plans Comparison Grid */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Compare membership plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Free Plan */}
              <PlanCard plan={membership?.freePlan} isCurrentPlan={isFree} />

              {/* Paid Plans */}
              {(membership?.allPlans ?? [])
                .filter((plan) => plan.segment !== "FREE")
                .map((plan) => {
                  const isCurrentPlan = currentPlan?.segment === plan.segment;
                  const isRecommended = isFree && plan.segment === "BASIC";

                  return (
                    <PlanCard
                      key={plan.segment}
                      plan={plan}
                      isCurrentPlan={isCurrentPlan}
                      isRecommended={isRecommended}
                      onAction={
                        isCurrentPlan ? undefined : () => onChoosePlan(plan)
                      }
                      disabled={isCurrentPlan}
                    />
                  );
                })}
            </div>
          </div>

          {/* Member Benefits Showcase */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="w-5 h-5 text-accent" />
                What premium members get
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Up to 40% savings</p>
                    <p className="text-sm text-muted-foreground">On selected services every visit</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <Gift className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Exclusive combo deals</p>
                    <p className="text-sm text-muted-foreground">Bundle services and save more</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Priority booking</p>
                    <p className="text-sm text-muted-foreground">Reserve your preferred time slots</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <Shield className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">VIP support</p>
                    <p className="text-sm text-muted-foreground">Dedicated assistance & priority service</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="flex-1">
              <Link to="/user-dashboard/appointments">
                Book appointment
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="flex-1">
              <Link to="/user-dashboard/offers">
                View offers
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          {/* Info Message */}
          {isFree && (
            <Card className="border-amber-200/50 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10">
              <CardContent className="pt-4 text-sm text-foreground">
                After selecting a plan, visit our salon front desk to complete activation. Your member benefits will be active immediately!
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </UserLayout>
  );
}
