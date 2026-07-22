"use client";

import { AdminLayout } from "../portal/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

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

function planToForm(plan) {
  return {
    name: plan?.name ?? "",
    tagline: plan?.tagline ?? "",
    priceAmount: `${plan?.priceAmount ?? 0}`,
    stripePriceId: plan?.stripePriceId ?? "",
    benefitsText: (plan?.benefits ?? []).join("\n"),
    isActive: plan?.isActive !== false,
  };
}

function PlanEditor({ segment, title, form, onChange, onSave, saving }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">Segment code: {segment}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label>Plan name</Label>
          <Input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Tagline</Label>
          <Input value={form.tagline} onChange={(e) => onChange({ ...form, tagline: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Monthly price (Rs)</Label>
          <Input type="number" value={form.priceAmount} onChange={(e) => onChange({ ...form, priceAmount: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Stripe price ID (optional)</Label>
          <Input
            placeholder="price_..."
            value={form.stripePriceId}
            onChange={(e) => onChange({ ...form, stripePriceId: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Plan benefits (one per line)</Label>
          <textarea
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={5}
            value={form.benefitsText}
            onChange={(e) => onChange({ ...form, benefitsText: e.target.value })}
          />
        </div>
        <Button type="button" variant={form.isActive ? "default" : "outline"} onClick={() => onChange({ ...form, isActive: !form.isActive })}>
          {form.isActive ? "Active" : "Inactive"}
        </Button>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save plan"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminMembershipPage() {
  const [loading, setLoading] = useState(true);
  const [savingSegment, setSavingSegment] = useState("");
  const [freePlan, setFreePlan] = useState(null);
  const [customerCounts, setCustomerCounts] = useState({ FREE: 0, BASIC: 0, PREMIUM: 0 });
  const [basicForm, setBasicForm] = useState(planToForm(null));
  const [premiumForm, setPremiumForm] = useState(planToForm(null));

  async function loadCenter() {
    setLoading(true);
    try {
      const data = await authFetch("/api/admin/membership");
      setFreePlan(data.freePlan ?? null);
      setCustomerCounts(data.customerCounts ?? { FREE: 0, BASIC: 0, PREMIUM: 0 });
      const basic = (data.paidPlans ?? []).find((plan) => plan.segment === "BASIC");
      const premium = (data.paidPlans ?? []).find((plan) => plan.segment === "PREMIUM");
      setBasicForm(planToForm(basic));
      setPremiumForm(planToForm(premium));
    } catch (error) {
      toast.error(error.message ?? "Could not load membership plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCenter();
  }, []);

  async function savePlan(segment, form) {
    setSavingSegment(segment);
    try {
      await authFetch(`/api/admin/membership/plans/${segment}`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          tagline: form.tagline,
          priceAmount: Number(form.priceAmount ?? 0),
          stripePriceId: form.stripePriceId,
          benefits: form.benefitsText.split("\n").map((line) => line.trim()).filter(Boolean),
          isActive: form.isActive,
        }),
      });
      toast.success(`${segment} plan saved`);
      await loadCenter();
    } catch (error) {
      toast.error(error.message ?? "Could not save plan");
    } finally {
      setSavingSegment("");
    }
  }

  return (
    <AdminLayout
      pageTitle="Membership Plans"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin-dashboard">Dashboard</Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About Stripe webhook table</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <code className="text-xs">stripe_webhook_events</code> stores processed Stripe event IDs so the same
              payment webhook is not handled twice. It is not where plans are stored.
            </p>
            <p>
              Salon plans live in <code className="text-xs">membership_plans</code>. When Stripe checkout is connected,
              successful subscription webhooks will update the customer&apos;s plan and log the event id there.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Free customers</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{customerCounts.FREE ?? 0}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Basic members</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{customerCounts.BASIC ?? 0}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Premium members</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{customerCounts.PREMIUM ?? 0}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Free plan (default)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{freePlan?.name ?? "Free"}</p>
            <p className="text-muted-foreground">{freePlan?.tagline}</p>
            <ul className="list-disc pl-5 text-muted-foreground">
              {(freePlan?.benefits ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Badge variant="secondary">Always active for new customers</Badge>
          </CardContent>
        </Card>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading plans...</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <PlanEditor
              segment="BASIC"
              title="Basic plan"
              form={basicForm}
              onChange={setBasicForm}
              onSave={() => void savePlan("BASIC", basicForm)}
              saving={savingSegment === "BASIC"}
            />
            <PlanEditor
              segment="PREMIUM"
              title="Premium plan"
              form={premiumForm}
              onChange={setPremiumForm}
              onSave={() => void savePlan("PREMIUM", premiumForm)}
              saving={savingSegment === "PREMIUM"}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
