"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/admin/components/error-banner";
import { AdminInsightsPanel } from "@/admin/components/admin-insights-panel";
import { apiJson } from "@/lib/api-json";
import { Globe, HelpCircle, Mail, MapPin, Plus, Save, ScrollText, Store, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "../portal/admin-layout";

const EMPTY_PROFILE = {
  businessName: "",
  tagline: "",
  about: "",
  phone: "",
  whatsapp: "",
  supportEmail: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  mapsUrl: "",
  website: "",
  instagram: "",
  facebook: "",
  youtube: "",
  x: "",
  privacyUrl: "",
  termsUrl: "",
  paymentPolicy: "",
  lateArrivalPolicy: "",
  generalPolicy: "",
  faq: [],
};

const FIELD_LABELS = {
  businessName: "Business name",
  supportEmail: "Support email",
  phone: "Phone",
  addressLine1: "Address",
  city: "City",
};

function Field({ id, label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function TextArea({ id, value, onChange, rows = 3, maxLength, placeholder, ariaLabel }) {
  return (
    <textarea
      id={id}
      rows={rows}
      maxLength={maxLength}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    />
  );
}

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [saved, setSaved] = useState(EMPTY_PROFILE);
  const [meta, setMeta] = useState({ missingFields: [], updatedAt: null, hours: null });
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    setLoadError(null);
    try {
      const data = await apiJson("/api/admin/business-profile", { auth: true });
      const next = { ...EMPTY_PROFILE, ...(data.profile ?? {}) };
      setProfile(next);
      setSaved(next);
      setMeta({ missingFields: data.missingFields ?? [], updatedAt: data.updatedAt, hours: data.hours });
      setStatus("ready");
    } catch (error) {
      setLoadError(error.message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => JSON.stringify(profile) !== JSON.stringify(saved), [profile, saved]);
  const set = (field) => (value) => setProfile((current) => ({ ...current, [field]: value }));
  const input = (field, props = {}) => (
    <Input id={`bp-${field}`} value={profile[field]} onChange={(e) => set(field)(e.target.value)} {...props} />
  );

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const data = await apiJson("/api/admin/business-profile", { method: "PUT", auth: true, body: profile });
      const next = { ...EMPTY_PROFILE, ...(data.profile ?? {}) };
      setProfile(next);
      setSaved(next);
      setMeta({ missingFields: data.missingFields ?? [], updatedAt: data.updatedAt, hours: data.hours });
      toast.success("Business profile saved. The website footer and assistant now use it.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  function setFaq(index, field, value) {
    setProfile((current) => ({
      ...current,
      faq: current.faq.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }

  return (
    <AdminLayout pageTitle="Settings" description="Business profile shown on your website and used by the support assistant.">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          {status === "error" ? <ErrorBanner message={loadError} onRetry={() => void load()} /> : null}
          {status === "loading" ? (
            <Card className="admin-shadow-sm">
              <CardContent className="space-y-3 pt-6">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ) : null}

          {status === "ready" ? (
            <form className="space-y-4" onSubmit={save}>
              {meta.missingFields.length ? (
                <div role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <p className="font-semibold">Still missing: {meta.missingFields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}</p>
                  <p className="text-muted-foreground">
                    Until these are filled in, the website footer leaves them out and the assistant tells customers it doesn't have them.
                  </p>
                </div>
              ) : null}

              <Card className="admin-shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="size-5 text-primary" /> Business
                  </CardTitle>
                  <CardDescription>Shown on the landing page and in the support assistant.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Field id="bp-businessName" label="Business name">{input("businessName", { maxLength: 120, placeholder: "e.g. Sahasra Unisex Salon" })}</Field>
                  <Field id="bp-tagline" label="Tagline">{input("tagline", { maxLength: 200 })}</Field>
                  <div className="md:col-span-2">
                    <Field id="bp-about" label="About" hint="A short description of the salon.">
                      <TextArea id="bp-about" value={profile.about} onChange={set("about")} maxLength={1500} />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              <Card className="admin-shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="size-5 text-primary" /> Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <Field id="bp-phone" label="Phone" hint="With country code, e.g. +91 98765 43210">{input("phone", { type: "tel", maxLength: 24 })}</Field>
                  <Field id="bp-whatsapp" label="WhatsApp">{input("whatsapp", { type: "tel", maxLength: 24 })}</Field>
                  <Field id="bp-supportEmail" label="Support email">{input("supportEmail", { type: "email", maxLength: 254 })}</Field>
                </CardContent>
              </Card>

              <Card className="admin-shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="size-5 text-primary" /> Location
                  </CardTitle>
                  {meta.hours ? (
                    <CardDescription>
                      Opening hours come from the booking system: {meta.hours.days}, {meta.hours.opens} – {meta.hours.closes} (lunch {meta.hours.lunchBreak.from} – {meta.hours.lunchBreak.to}).
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Field id="bp-addressLine1" label="Address line 1">{input("addressLine1", { maxLength: 200 })}</Field>
                  <Field id="bp-addressLine2" label="Address line 2">{input("addressLine2", { maxLength: 200 })}</Field>
                  <Field id="bp-city" label="City">{input("city", { maxLength: 80 })}</Field>
                  <Field id="bp-state" label="State">{input("state", { maxLength: 80 })}</Field>
                  <Field id="bp-postalCode" label="PIN code">{input("postalCode", { maxLength: 16 })}</Field>
                  <Field id="bp-country" label="Country">{input("country", { maxLength: 80 })}</Field>
                  <div className="md:col-span-2">
                    <Field id="bp-mapsUrl" label="Google Maps link" hint="https:// link to your map listing">{input("mapsUrl", { type: "url", placeholder: "https://maps.app.goo.gl/…" })}</Field>
                  </div>
                </CardContent>
              </Card>

              <Card className="admin-shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="size-5 text-primary" /> Online
                  </CardTitle>
                  <CardDescription>Only filled-in links appear in the website footer. Links must start with https://</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Field id="bp-website" label="Website">{input("website", { type: "url" })}</Field>
                  <Field id="bp-instagram" label="Instagram">{input("instagram", { type: "url" })}</Field>
                  <Field id="bp-facebook" label="Facebook">{input("facebook", { type: "url" })}</Field>
                  <Field id="bp-youtube" label="YouTube">{input("youtube", { type: "url" })}</Field>
                  <Field id="bp-x" label="X (Twitter)">{input("x", { type: "url" })}</Field>
                  <Field id="bp-privacyUrl" label="Privacy policy URL">{input("privacyUrl", { type: "url" })}</Field>
                  <Field id="bp-termsUrl" label="Terms of service URL">{input("termsUrl", { type: "url" })}</Field>
                </CardContent>
              </Card>

              <Card className="admin-shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ScrollText className="size-5 text-primary" /> Policies
                  </CardTitle>
                  <CardDescription>
                    The cancellation/refund policy comes from the booking system. Add anything else customers should know; the assistant quotes these.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <Field id="bp-paymentPolicy" label="Payments" hint="e.g. accepted payment methods">
                    <TextArea id="bp-paymentPolicy" value={profile.paymentPolicy} onChange={set("paymentPolicy")} maxLength={1500} />
                  </Field>
                  <Field id="bp-lateArrivalPolicy" label="Late arrival">
                    <TextArea id="bp-lateArrivalPolicy" value={profile.lateArrivalPolicy} onChange={set("lateArrivalPolicy")} maxLength={1500} />
                  </Field>
                  <Field id="bp-generalPolicy" label="Other policies">
                    <TextArea id="bp-generalPolicy" value={profile.generalPolicy} onChange={set("generalPolicy")} maxLength={3000} rows={4} />
                  </Field>
                </CardContent>
              </Card>

              <Card className="admin-shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="size-5 text-primary" /> Customer FAQ
                  </CardTitle>
                  <CardDescription>Questions customers often ask. The assistant answers these exactly as written.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile.faq.map((item, index) => (
                    <div key={index} className="space-y-2 rounded-xl border border-border/70 p-3">
                      <div className="flex items-center gap-2">
                        <Input aria-label={`Question ${index + 1}`} placeholder="Question" maxLength={300} value={item.question} onChange={(e) => setFaq(index, "question", e.target.value)} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove question ${index + 1}`}
                          onClick={() => setProfile((current) => ({ ...current, faq: current.faq.filter((_, i) => i !== index) }))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <TextArea id={`faq-${index}`} ariaLabel={`Answer ${index + 1}`} placeholder="Answer" value={item.answer} onChange={(value) => setFaq(index, "answer", value)} maxLength={1500} rows={2} />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={profile.faq.length >= 25}
                    onClick={() => setProfile((current) => ({ ...current, faq: [...current.faq, { question: "", answer: "" }] }))}
                  >
                    <Plus className="size-4" /> Add question
                  </Button>
                </CardContent>
              </Card>

              <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
                <span className="text-sm text-muted-foreground">
                  {dirty ? "Unsaved changes" : meta.updatedAt ? `Saved ${new Date(meta.updatedAt).toLocaleString()}` : "Not saved yet"}
                </span>
                <div className="flex gap-2">
                  {dirty ? (
                    <Button type="button" variant="ghost" onClick={() => setProfile(saved)} disabled={saving}>
                      Discard
                    </Button>
                  ) : null}
                  <Button type="submit" disabled={!dirty || saving}>
                    <Save className="size-4" />
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </form>
          ) : null}
        </div>

        <AdminInsightsPanel />
      </div>
    </AdminLayout>
  );
}

