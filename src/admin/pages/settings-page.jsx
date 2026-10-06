"use client";
import { AnimatePresence, motion } from "motion/react";
import { BorderBeam } from "border-beam";
import { Building2, Check, Globe, Hash, HelpCircle, Instagram, Loader2, Mail, MapPin, Phone, Plus, Save, ScrollText, Store, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/notify";
import { useDispatch, useSelector } from "react-redux";
import { createSalonAsync, fetchAdminDashboardData, resetNewSalon, setNewSalonField } from "@/store/admin-dashboard-slice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner } from "@/admin/components/error-banner";
import { AdminInsightsPanel } from "@/admin/components/admin-insights-panel";
import { LoadingOrb } from "@/components/shared/loading-orb";
import { apiJson } from "@/lib/api-json";
import { cn } from "@/lib/utils";
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

/** Fields that decide how "complete" each section is. */
const SECTIONS = [
  { id: "business", label: "Business", icon: Store, keys: ["businessName", "tagline", "about"] },
  { id: "contact", label: "Contact", icon: Mail, keys: ["phone", "supportEmail"] },
  { id: "location", label: "Location", icon: MapPin, keys: ["addressLine1", "city", "postalCode", "mapsUrl"] },
  { id: "salons", label: "Salons", icon: Building2, keys: [], custom: "salons" },
  { id: "online", label: "Online", icon: Globe, keys: ["website", "instagram", "privacyUrl", "termsUrl"] },
  { id: "policies", label: "Policies", icon: ScrollText, keys: ["paymentPolicy", "lateArrivalPolicy"] },
  { id: "faq", label: "FAQ", icon: HelpCircle, keys: [], custom: "faq" },
];

const filled = (value) => `${value ?? ""}`.trim().length > 0;
function buildSalonAddress(form) {
  return [form.buildingNumber, form.streetName, form.areaName, form.cityName, form.stateName, form.countryName]
    .map((value) => `${value ?? ""}`.trim())
    .filter(Boolean)
    .join(", ");
}
const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function Field({ id, label, hint, children, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function TextArea({ id, value, onChange, rows = 3, maxLength, placeholder, ariaLabel }) {
  return (
    <div className="relative">
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 pb-6 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      {maxLength ? (
        <span className={cn("pointer-events-none absolute bottom-1.5 right-2.5 text-[10px] tabular-nums text-muted-foreground", value.length > maxLength * 0.9 && "text-warning")}>
          {value.length}/{maxLength}
        </span>
      ) : null}
    </div>
  );
}

function Section({ id, icon: Icon, title, description, complete, children, index }) {
  return (
    <motion.section
      id={`settings-${id}`}
      data-section={id}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.4, delay: Math.min(index, 2) * 0.04, ease: "easeOut" }}
      className="admin-shadow-sm scroll-mt-24 overflow-hidden rounded-2xl border border-border/70 bg-card"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-[18px]" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold leading-tight">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        <AnimatePresence initial={false}>
          {complete ? (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }} className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
              <Check className="size-3" /> Done
            </motion.span>
          ) : null}
        </AnimatePresence>
      </header>
      <div className="p-5">{children}</div>
    </motion.section>
  );
}

function CompletenessRing({ percent }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-[88px] place-items-center">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - percent / 100) }}
          transition={{ type: "spring", stiffness: 70, damping: 18 }}
        />
      </svg>
      <span className="absolute text-lg font-bold tabular-nums">{percent}%</span>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [saved, setSaved] = useState(EMPTY_PROFILE);
  const [faqIds, setFaqIds] = useState([]);
  const [meta, setMeta] = useState({ missingFields: [], updatedAt: null, hours: null });
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("business");
  const contentRef = useRef(null);
  const dispatch = useDispatch();
  const { salons, newSalon, mutating: salonMutating } = useSelector((state) => state.adminDashboard);

  useEffect(() => {
    void dispatch(fetchAdminDashboardData());
  }, [dispatch]);

  async function createSalon() {
    const address = buildSalonAddress(newSalon);
    if (!newSalon.name.trim() || !address) {
      toast.error("Salon name and full address are required");
      return;
    }
    const result = await dispatch(
      createSalonAsync({ name: newSalon.name.trim(), pincode: `${newSalon.pincode ?? ""}`.trim(), address, latitude: 0, longitude: 0 })
    );
    if (createSalonAsync.rejected.match(result)) {
      toast.error(result.payload ?? "Could not create salon");
      return;
    }
    dispatch(resetNewSalon());
    toast.success("Salon created");
  }

  const applyProfile = useCallback((data) => {
    const next = { ...EMPTY_PROFILE, ...(data.profile ?? {}) };
    setProfile(next);
    setSaved(next);
    setFaqIds(next.faq.map(newId));
    setMeta({ missingFields: data.missingFields ?? [], updatedAt: data.updatedAt, hours: data.hours });
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    setLoadError(null);
    try {
      applyProfile(await apiJson("/api/admin/business-profile", { auth: true }));
      setStatus("ready");
    } catch (error) {
      setLoadError(error.message);
      setStatus("error");
    }
  }, [applyProfile]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => JSON.stringify(profile) !== JSON.stringify(saved), [profile, saved]);

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Scroll-spy: highlight the section nearest the top.
  useEffect(() => {
    if (status !== "ready") return;
    const nodes = [...document.querySelectorAll("[data-section]")];
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveSection(top.target.getAttribute("data-section"));
      },
      { rootMargin: "-90px 0px -60% 0px" }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [status]);

  const set = (field) => (value) => setProfile((current) => ({ ...current, [field]: value }));
  const input = (field, props = {}) => <Input id={`bp-${field}`} value={profile[field]} onChange={(e) => set(field)(e.target.value)} {...props} />;

  const sectionComplete = (section) => {
    if (section.custom === "salons") return salons.length > 0;
    if (section.custom === "faq") return profile.faq.some((f) => filled(f.question) && filled(f.answer));
    return section.keys.every((k) => filled(profile[k]));
  };
  const completeness = useMemo(() => {
    const keys = SECTIONS.flatMap((s) => s.keys);
    const done = keys.filter((k) => filled(profile[k])).length + (profile.faq.some((f) => filled(f.question) && filled(f.answer)) ? 1 : 0);
    return Math.round((done / (keys.length + 1)) * 100);
  }, [profile]);

  async function save(event) {
    event?.preventDefault();
    if (saving || !dirty) return;
    setSaving(true);
    try {
      applyProfile(await apiJson("/api/admin/business-profile", { method: "PUT", auth: true, body: profile }));
      toast.success("Business profile saved. The website footer and assistant now use it.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setProfile(saved);
    setFaqIds(saved.faq.map(newId));
  }

  function setFaq(index, field, value) {
    setProfile((current) => ({ ...current, faq: current.faq.map((item, i) => (i === index ? { ...item, [field]: value } : item)) }));
  }

  const address = [profile.addressLine1, profile.addressLine2, profile.city, profile.state, profile.postalCode].filter(filled).join(", ");
  const links = [profile.website && "Website", profile.instagram && "Instagram", profile.facebook && "Facebook", profile.youtube && "YouTube", profile.x && "X"].filter(Boolean);

  return (
    <AdminLayout pageTitle="Settings" description="Business profile shown on your website and used by the support assistant.">
      {status === "error" ? <ErrorBanner message={loadError} onRetry={() => void load()} /> : null}
      {status === "loading" ? <LoadingOrb compact label="Loading your business profile…" /> : null}

      {status === "ready" ? (
        <form onSubmit={save} className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[180px_minmax(0,1fr)_380px]">
          {/* Section navigation */}
          <nav aria-label="Settings sections" className="lg:sticky lg:top-4 lg:self-start">
            <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {SECTIONS.map((section) => {
                const active = activeSection === section.id;
                const Icon = section.icon;
                return (
                  <li key={section.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => document.getElementById(`settings-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className={cn("relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors", active ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                    >
                      {active ? <motion.span layoutId="settings-nav" className="absolute inset-0 rounded-xl bg-primary/10" transition={{ type: "spring", stiffness: 500, damping: 36 }} /> : null}
                      <Icon className="relative size-4" />
                      <span className="relative flex-1 text-left">{section.label}</span>
                      {sectionComplete(section) ? <Check className="relative size-3.5 text-success" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Forms */}
          <div ref={contentRef} className="min-w-0 space-y-5 pb-24">
            <AnimatePresence initial={false}>
              {meta.missingFields.length ? (
                <motion.div role="status" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                    <p className="font-semibold">Still missing: {meta.missingFields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}</p>
                    <p className="text-muted-foreground">Until these are filled in, the website footer leaves them out and the assistant tells customers it does not have them.</p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <Section index={0} id="business" icon={Store} title="Business" description="Shown on the landing page and in the support assistant." complete={sectionComplete(SECTIONS[0])}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field id="bp-businessName" label="Business name">{input("businessName", { maxLength: 120, placeholder: "e.g. Sahasra Unisex Salon" })}</Field>
                <Field id="bp-tagline" label="Tagline">{input("tagline", { maxLength: 200 })}</Field>
                <Field className="md:col-span-2" id="bp-about" label="About" hint="A short description of the salon.">
                  <TextArea id="bp-about" value={profile.about} onChange={set("about")} maxLength={1500} />
                </Field>
              </div>
            </Section>

            <Section index={1} id="contact" icon={Mail} title="Contact" description="How customers reach you." complete={sectionComplete(SECTIONS[1])}>
              <div className="grid gap-4 md:grid-cols-3">
                <Field id="bp-phone" label="Phone" hint="With country code, e.g. +91 98765 43210">{input("phone", { type: "tel", maxLength: 24 })}</Field>
                <Field id="bp-whatsapp" label="WhatsApp">{input("whatsapp", { type: "tel", maxLength: 24 })}</Field>
                <Field id="bp-supportEmail" label="Support email">{input("supportEmail", { type: "email", maxLength: 254 })}</Field>
              </div>
            </Section>

            <Section
              index={2}
              id="location"
              icon={MapPin}
              title="Location"
              description={meta.hours ? `Opening hours come from the booking system: ${meta.hours.days}, ${meta.hours.opens} – ${meta.hours.closes} (lunch ${meta.hours.lunchBreak.from} – ${meta.hours.lunchBreak.to}).` : undefined}
              complete={sectionComplete(SECTIONS[2])}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field id="bp-addressLine1" label="Address line 1">{input("addressLine1", { maxLength: 200 })}</Field>
                <Field id="bp-addressLine2" label="Address line 2">{input("addressLine2", { maxLength: 200 })}</Field>
                <Field id="bp-city" label="City">{input("city", { maxLength: 80 })}</Field>
                <Field id="bp-state" label="State">{input("state", { maxLength: 80 })}</Field>
                <Field id="bp-postalCode" label="PIN code">{input("postalCode", { maxLength: 16 })}</Field>
                <Field id="bp-country" label="Country">{input("country", { maxLength: 80 })}</Field>
                <Field className="md:col-span-2" id="bp-mapsUrl" label="Google Maps link" hint="https:// link to your map listing">{input("mapsUrl", { type: "url", placeholder: "https://maps.app.goo.gl/…" })}</Field>
              </div>
            </Section>

            <Section index={3} id="salons" icon={Building2} title={`Salons (${salons.length})`} description="Your salon locations. Fill the address fields; they are combined into one address when you create the salon." complete={salons.length > 0}>
              <div className="space-y-5" onKeyDown={(e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault(); }}>
                {salons.length ? (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    <AnimatePresence initial={false}>
                      {salons.map((salon) => (
                        <motion.li key={salon.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-border/70 bg-muted/10 p-3.5 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                              <Building2 className="size-4" />
                            </span>
                            <p className="truncate font-semibold">{salon.name}</p>
                          </div>
                          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="mt-0.5 size-3.5 shrink-0" />
                            <span>{salon.address}</span>
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Hash className="size-3.5 shrink-0" /> {salon.pincode}
                          </p>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed py-5 text-center text-sm text-muted-foreground">No salon added yet.</p>
                )}

                <div className="space-y-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Plus className="size-4 text-primary" /> Add a salon
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      ["name", "Salon name", "Salon name"],
                      ["pincode", "Pincode", "Pincode"],
                      ["buildingNumber", "Building number", "Building no."],
                      ["streetName", "Street name", "Street name"],
                      ["areaName", "Area name", "Area name"],
                      ["cityName", "City name", "City name"],
                      ["stateName", "State name", "State name"],
                      ["countryName", "Country name", "Country name"],
                    ].map(([field, label, placeholder]) => (
                      <Field key={field} id={`salon-${field}`} label={label}>
                        <Input id={`salon-${field}`} placeholder={placeholder} value={newSalon[field]} onChange={(e) => dispatch(setNewSalonField({ field, value: e.target.value }))} />
                      </Field>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-card/60 p-3 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    <span>{buildSalonAddress(newSalon) || "Address preview will appear here"}</span>
                  </div>
                  <Button type="button" onClick={() => void createSalon()} disabled={salonMutating}>
                    {salonMutating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    {salonMutating ? "Creating…" : "Create salon"}
                  </Button>
                </div>
              </div>
            </Section>

            <Section index={4} id="online" icon={Globe} title="Online" description="Only filled-in links appear in the website footer. Links must start with https://" complete={sectionComplete(SECTIONS[4])}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field id="bp-website" label="Website">{input("website", { type: "url" })}</Field>
                <Field id="bp-instagram" label="Instagram">{input("instagram", { type: "url" })}</Field>
                <Field id="bp-facebook" label="Facebook">{input("facebook", { type: "url" })}</Field>
                <Field id="bp-youtube" label="YouTube">{input("youtube", { type: "url" })}</Field>
                <Field id="bp-x" label="X (Twitter)">{input("x", { type: "url" })}</Field>
                <Field id="bp-privacyUrl" label="Privacy policy URL">{input("privacyUrl", { type: "url" })}</Field>
                <Field id="bp-termsUrl" label="Terms of service URL">{input("termsUrl", { type: "url" })}</Field>
              </div>
            </Section>

            <Section index={5} id="policies" icon={ScrollText} title="Policies" description="The cancellation and refund policy comes from the booking system. Add anything else customers should know; the assistant quotes these." complete={sectionComplete(SECTIONS[5])}>
              <div className="grid gap-4">
                <Field id="bp-paymentPolicy" label="Payments" hint="e.g. accepted payment methods">
                  <TextArea id="bp-paymentPolicy" value={profile.paymentPolicy} onChange={set("paymentPolicy")} maxLength={1500} />
                </Field>
                <Field id="bp-lateArrivalPolicy" label="Late arrival">
                  <TextArea id="bp-lateArrivalPolicy" value={profile.lateArrivalPolicy} onChange={set("lateArrivalPolicy")} maxLength={1500} />
                </Field>
                <Field id="bp-generalPolicy" label="Other policies">
                  <TextArea id="bp-generalPolicy" value={profile.generalPolicy} onChange={set("generalPolicy")} maxLength={3000} rows={4} />
                </Field>
              </div>
            </Section>

            <Section index={6} id="faq" icon={HelpCircle} title="Customer FAQ" description="Questions customers often ask. The assistant answers these exactly as written." complete={sectionComplete(SECTIONS[6])}>
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {profile.faq.map((item, index) => (
                    <motion.div
                      key={faqIds[index] ?? index}
                      layout
                      initial={{ opacity: 0, height: 0, scale: 0.98 }}
                      animate={{ opacity: 1, height: "auto", scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 rounded-xl border border-border/70 bg-muted/10 p-3">
                        <div className="flex items-center gap-2">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{index + 1}</span>
                          <Input aria-label={`Question ${index + 1}`} placeholder="Question" maxLength={300} value={item.question} onChange={(e) => setFaq(index, "question", e.target.value)} />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove question ${index + 1}`}
                            onClick={() => {
                              setProfile((current) => ({ ...current, faq: current.faq.filter((_, i) => i !== index) }));
                              setFaqIds((ids) => ids.filter((_, i) => i !== index));
                            }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                        <TextArea id={`faq-${index}`} ariaLabel={`Answer ${index + 1}`} placeholder="Answer" value={item.answer} onChange={(value) => setFaq(index, "answer", value)} maxLength={1500} rows={2} />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {!profile.faq.length ? <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">No questions yet. Add the ones customers ask most.</p> : null}
                <Button
                  type="button"
                  variant="outline"
                  disabled={profile.faq.length >= 25}
                  onClick={() => {
                    setProfile((current) => ({ ...current, faq: [...current.faq, { question: "", answer: "" }] }));
                    setFaqIds((ids) => [...ids, newId()]);
                  }}
                >
                  <Plus className="size-4" /> Add question
                </Button>
              </div>
            </Section>
          </div>

          {/* Right rail: completeness, live preview, assistants */}
          <aside className="space-y-4 lg:col-span-2 xl:col-span-1 xl:sticky xl:top-4 xl:self-start">
            <div className="admin-shadow-sm flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5">
              <CompletenessRing percent={completeness} />
              <div>
                <p className="font-display text-base font-semibold">Profile completeness</p>
                <p className="text-xs text-muted-foreground">{completeness === 100 ? "Everything is filled in." : "A fuller profile gives customers and the assistant better answers."}</p>
              </div>
            </div>

            <div className="admin-shadow-sm rounded-2xl border border-border/70 bg-card p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Website footer preview</p>
              <div className="space-y-2 rounded-xl bg-[hsl(var(--sidebar-foreground)/0.96)] p-4 text-sm text-background">
                <p className="font-display text-base font-semibold">{profile.businessName || "Your salon name"}</p>
                {profile.tagline ? <p className="text-xs opacity-75">{profile.tagline}</p> : null}
                <div className="space-y-1 pt-1 text-xs opacity-90">
                  {address ? (
                    <p className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-3 shrink-0" /> {address}
                    </p>
                  ) : null}
                  {profile.phone ? (
                    <p className="flex items-center gap-1.5">
                      <Phone className="size-3" /> {profile.phone}
                    </p>
                  ) : null}
                  {profile.supportEmail ? (
                    <p className="flex items-center gap-1.5">
                      <Mail className="size-3" /> {profile.supportEmail}
                    </p>
                  ) : null}
                </div>
                {links.length ? (
                  <p className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <Instagram className="size-3" />
                    {links.map((l) => (
                      <span key={l} className="rounded-full bg-white/15 px-2 py-0.5">{l}</span>
                    ))}
                  </p>
                ) : null}
                {!address && !profile.phone && !profile.supportEmail && !links.length ? <p className="text-xs opacity-60">Fill in contact details to see them here.</p> : null}
              </div>
            </div>

            <AdminInsightsPanel />
          </aside>

          {/* Save bar: only appears when there is something to save */}
          <AnimatePresence>
            {dirty || saving ? (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className="fixed inset-x-3 bottom-4 z-30 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur"
              >
                <span className="flex items-center gap-2 pl-1 text-sm font-medium">
                  <span className="size-2 rounded-full bg-warning" /> Unsaved changes
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={discard} disabled={saving}>
                    <Undo2 className="size-4" /> Discard
                  </Button>
                  <BorderBeam size="sm" active={!saving}>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </BorderBeam>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          {!dirty && meta.updatedAt ? <p className="text-center text-xs text-muted-foreground lg:col-start-2">Last saved {new Date(meta.updatedAt).toLocaleString()}</p> : null}
        </form>
      ) : null}
    </AdminLayout>
  );
}
