"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Building2, Check, Clock, Facebook, Globe, Hash, HelpCircle, Instagram, Link2, Mail, MapPin, MessageCircle, Phone, Plus, Save, ScrollText, ShieldCheck, Store, Trash2, Undo2, Youtube } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notify as toast } from "@/lib/notify";
import { useDispatch, useSelector } from "react-redux";
import { createSalonAsync, fetchAdminDashboardData, resetNewSalon, setNewSalonField } from "@/store/admin-dashboard-slice";
import { ButtonLoadingMorph, ErrorState, FloatingLabelInput, IconButton, ProgressRing, useAsyncAction } from "@/components/kit";
import { SkeletonCard, SkeletonText, spring } from "@/components/motion";
import { dateTimeOf } from "@/admin/lib/safe-format";
import { useUnsavedGuard } from "@/admin/lib/use-unsaved-guard";
import { AdminInsightsPanel } from "@/admin/components/admin-insights-panel";
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

const isUrl = (v) => !filled(v) || /^https:\/\/\S+\.\S+/i.test(`${v}`.trim());
const isEmail = (v) => !filled(v) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(`${v}`.trim());
const isPhone = (v) => !filled(v) || `${v}`.replace(/\D/g, "").length >= 10;

/** Inline validation: format errors per field (empty is allowed; the API decides what is required). */
function validateProfile(p) {
  const errors = {};
  for (const k of ["mapsUrl", "website", "instagram", "facebook", "youtube", "x", "privacyUrl", "termsUrl"]) if (!isUrl(p[k])) errors[k] = "Start with https://";
  if (!isEmail(p.supportEmail)) errors.supportEmail = "Check the email";
  if (!isPhone(p.phone)) errors.phone = "At least 10 digits";
  if (!isPhone(p.whatsapp)) errors.whatsapp = "At least 10 digits";
  return errors;
}

function Section({ id, icon: Icon, title, description, complete, children, index }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={`settings-${id}`}
      data-section={id}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ ...spring.soft, delay: Math.min(index, 2) * 0.05 }}
      className="scroll-mt-[calc(var(--topbar-h)+1rem)] overflow-hidden rounded-card border border-border/60 bg-card shadow-soft"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-portal/12 text-portal">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-base font-semibold">{title}</h2>
            {description ? <p className="text-caption text-ink-neutral">{description}</p> : null}
          </div>
        </div>
        <AnimatePresence initial={false}>
          {complete ? (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring.bouncy} className="grid size-7 shrink-0 place-items-center rounded-full bg-success/12 text-ink-success" title="Complete">
              <Check className="size-4" aria-hidden />
              <span className="sr-only">Complete</span>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </motion.section>
  );
}

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [saved, setSaved] = useState(EMPTY_PROFILE);
  const [faqIds, setFaqIds] = useState([]);
  const [meta, setMeta] = useState({ missingFields: [], updatedAt: null, hours: null });
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const saveAction = useAsyncAction({ successMs: 900 });
  const salonAction = useAsyncAction({ successMs: 900 });
  const saving = saveAction.state === "loading";
  const [activeSection, setActiveSection] = useState("business");
  const [params, setParams] = useSearchParams();
  const reduce = useReducedMotion();
  const contentRef = useRef(null);
  const dispatch = useDispatch();
  const { salons, newSalon } = useSelector((state) => state.adminDashboard);

  useEffect(() => {
    void dispatch(fetchAdminDashboardData());
  }, [dispatch]);

  async function createSalon() {
    const address = buildSalonAddress(newSalon);
    if (!newSalon.name.trim() || !address) {
      toast.warning("Add a name and the address");
      throw new Error("invalid");
    }
    const result = await dispatch(
      createSalonAsync({ name: newSalon.name.trim(), pincode: `${newSalon.pincode ?? ""}`.trim(), address, latitude: 0, longitude: 0 })
    );
    if (createSalonAsync.rejected.match(result)) {
      toast.error(result.payload ?? "Could not create salon");
      throw new Error("create failed");
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

  // Unsaved-changes guard: tab close and in-app links.
  const guardSheet = useUnsavedGuard(dirty, { title: "Leave settings?", description: "Unsaved profile changes will be lost." });
  const errors = useMemo(() => validateProfile(profile), [profile]);
  const invalid = Object.keys(errors).length > 0;

  // ?section=salons (⌘K, dashboard checklist) scrolls to that section once loaded.
  useEffect(() => {
    const section = params.get("section");
    if (status !== "ready" || !section) return;
    const timer = setTimeout(() => document.getElementById(`settings-${section}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), 200);
    setParams((p) => {
      p.delete("section");
      return p;
    }, { replace: true });
    return () => clearTimeout(timer);
  }, [params, status, reduce, setParams]);

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
  /** FloatingLabelInput bound to a profile field, with inline format validation. */
  const input = (field, label, props = {}) => <FloatingLabelInput id={`bp-${field}`} label={label} value={profile[field] ?? ""} error={errors[field]} success={!errors[field] && filled(profile[field]) && props.type && props.type !== "text"} onChange={(e) => set(field)(e.target.value)} {...props} />;
  const area = (field, label, maxLength, props = {}) => <FloatingLabelInput as="textarea" id={`bp-${field}`} label={label} maxLength={maxLength} value={profile[field] ?? ""} hint={`${`${profile[field] ?? ""}`.length}/${maxLength}`} onChange={(e) => set(field)(e.target.value)} {...props} />;

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

  async function save() {
    if (!dirty) return;
    if (invalid) {
      toast.warning("Fix the highlighted fields");
      throw new Error("invalid");
    }
    try {
      applyProfile(await apiJson("/api/admin/business-profile", { method: "PUT", auth: true, body: profile }));
      toast.success("Profile saved", { description: "Website footer and assistant updated" });
    } catch (error) {
      toast.error(error.message);
      throw error;
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
    <AdminLayout pageTitle="Settings" description="Business profile, salons, AI">
      {status === "error" ? <ErrorState title="Couldn't load your profile" description={loadError} onRetry={load} /> : null}
      {status === "loading" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <SkeletonCard />
            <SkeletonText lines={4} />
          </div>
          <SkeletonCard />
        </div>
      ) : null}

      {status === "ready" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveAction.run(save);
          }}
          className="grid gap-5 lg:grid-cols-[170px_minmax(0,1fr)] xl:grid-cols-[170px_minmax(0,1fr)_360px]"
        >
          {/* Section navigation: chips on phones, sticky list on desktop */}
          <nav aria-label="Settings sections" className="min-w-0 sticky top-[calc(var(--topbar-h)+var(--safe-top))] z-raised -mx-[var(--gutter)] bg-background px-[var(--gutter)] py-2 lg:top-[calc(var(--topbar-h)+1rem)] lg:mx-0 lg:self-start lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {SECTIONS.map((section) => {
                const active = activeSection === section.id;
                const Icon = section.icon;
                return (
                  <li key={section.id} className="shrink-0">
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => document.getElementById(`settings-${section.id}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })}
                      className={cn("relative flex h-10 w-full items-center gap-2.5 rounded-full px-3 text-sm font-semibold transition-colors lg:h-11 lg:rounded-2xl", active ? "text-portal" : "text-ink-neutral hover:bg-muted hover:text-foreground")}
                    >
                      {active ? <motion.span layoutId="settings-nav" className="absolute inset-0 rounded-full bg-portal/12 ring-1 ring-inset ring-portal/20 lg:rounded-2xl" transition={reduce ? { duration: 0 } : spring.snappy} /> : null}
                      <Icon className="relative size-4" aria-hidden />
                      <span className="relative flex-1 text-left">{section.label}</span>
                      {sectionComplete(section) ? <Check className="relative size-3.5 text-ink-success" aria-label="complete" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Forms */}
          <div ref={contentRef} className="min-w-0 space-y-5 pb-28">
            <AnimatePresence initial={false}>
              {meta.missingFields.length ? (
                <motion.p role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-2 rounded-2xl bg-warning/14 p-3 text-sm text-ink-warning ring-1 ring-inset ring-warning/30">
                  <HelpCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    <b>Missing:</b> {meta.missingFields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}
                  </span>
                </motion.p>
              ) : null}
            </AnimatePresence>

            <Section index={0} id="business" icon={Store} title="Business" description="Landing page and assistant" complete={sectionComplete(SECTIONS[0])}>
              <div className="grid gap-3 md:grid-cols-2">
                {input("businessName", "Business name", { icon: Store, maxLength: 120 })}
                {input("tagline", "Tagline", { maxLength: 200 })}
                <div className="md:col-span-2">{area("about", "About", 1500)}</div>
              </div>
            </Section>

            <Section index={1} id="contact" icon={Mail} title="Contact" complete={sectionComplete(SECTIONS[1])}>
              <div className="grid gap-3 md:grid-cols-3">
                {input("phone", "Phone (+91…)", { type: "tel", icon: Phone, maxLength: 24 })}
                {input("whatsapp", "WhatsApp", { type: "tel", icon: MessageCircle, maxLength: 24 })}
                {input("supportEmail", "Support email", { type: "email", icon: Mail, maxLength: 254 })}
              </div>
            </Section>

            <Section index={2} id="location" icon={MapPin} title="Location" description={meta.hours ? `Hours from booking: ${meta.hours.days}, ${meta.hours.opens}–${meta.hours.closes}` : undefined} complete={sectionComplete(SECTIONS[2])}>
              <div className="grid gap-3 md:grid-cols-2">
                {input("addressLine1", "Address line 1", { icon: MapPin, maxLength: 200 })}
                {input("addressLine2", "Address line 2", { maxLength: 200 })}
                {input("city", "City", { maxLength: 80 })}
                {input("state", "State", { maxLength: 80 })}
                {input("postalCode", "PIN code", { icon: Hash, inputMode: "numeric", maxLength: 16 })}
                {input("country", "Country", { maxLength: 80 })}
                <div className="md:col-span-2">{input("mapsUrl", "Google Maps link", { type: "url", icon: Link2 })}</div>
              </div>
              {meta.hours ? (
                <p className="mt-3 flex items-center gap-1.5 text-caption text-ink-neutral">
                  <Clock className="size-3.5" aria-hidden /> Lunch {meta.hours.lunchBreak.from}–{meta.hours.lunchBreak.to}
                </p>
              ) : null}
            </Section>

            <Section index={3} id="salons" icon={Building2} title={`Salons · ${salons.length}`} complete={salons.length > 0}>
              <div className="space-y-5" onKeyDown={(e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault(); }}>
                {salons.length ? (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    <AnimatePresence initial={false}>
                      {salons.map((salon) => (
                        <motion.li key={salon.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.soft} className="rounded-2xl bg-muted/50 p-3.5 text-sm ring-1 ring-inset ring-border/60">
                          <div className="flex items-center gap-2">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-portal/12 text-portal">
                              <Building2 className="size-4" aria-hidden />
                            </span>
                            <p className="truncate font-semibold">{salon.name}</p>
                          </div>
                          <p className="mt-2 flex items-start gap-1.5 text-caption text-ink-neutral">
                            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            <span>{salon.address}</span>
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-caption text-ink-neutral">
                            <Hash className="size-3.5 shrink-0" aria-hidden /> {salon.pincode}
                          </p>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border py-5 text-center text-caption text-ink-neutral">No salon yet</p>
                )}

                <div className="space-y-3 rounded-2xl border border-dashed border-portal/30 bg-portal/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Plus className="size-4 text-portal" aria-hidden /> Add a salon
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      ["name", "Salon name"],
                      ["pincode", "Pincode"],
                      ["buildingNumber", "Building no."],
                      ["streetName", "Street"],
                      ["areaName", "Area"],
                      ["cityName", "City"],
                      ["stateName", "State"],
                      ["countryName", "Country"],
                    ].map(([field, label]) => (
                      <FloatingLabelInput key={field} id={`salon-${field}`} label={label} value={newSalon[field] ?? ""} onChange={(e) => dispatch(setNewSalonField({ field, value: e.target.value }))} />
                    ))}
                  </div>
                  <p className="flex items-start gap-2 rounded-xl bg-card/70 p-3 text-caption text-ink-neutral">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span>{buildSalonAddress(newSalon) || "Address preview"}</span>
                  </p>
                  <ButtonLoadingMorph icon={Plus} state={salonAction.state} loadingLabel="Creating…" successLabel="Created" onClick={() => salonAction.run(createSalon)}>
                    Create salon
                  </ButtonLoadingMorph>
                </div>
              </div>
            </Section>

            <Section index={4} id="online" icon={Globe} title="Online" description="Only filled links show. https:// only." complete={sectionComplete(SECTIONS[4])}>
              <div className="grid gap-3 md:grid-cols-2">
                {input("website", "Website", { type: "url", icon: Globe })}
                {input("instagram", "Instagram", { type: "url", icon: Instagram })}
                {input("facebook", "Facebook", { type: "url", icon: Facebook })}
                {input("youtube", "YouTube", { type: "url", icon: Youtube })}
                {input("x", "X (Twitter)", { type: "url", icon: Link2 })}
                {input("privacyUrl", "Privacy policy", { type: "url", icon: ShieldCheck })}
                {input("termsUrl", "Terms", { type: "url", icon: ScrollText })}
              </div>
            </Section>

            <Section index={5} id="policies" icon={ScrollText} title="Policies" description="Refund rules come from booking. The assistant quotes these." complete={sectionComplete(SECTIONS[5])}>
              <div className="grid gap-3">
                {area("paymentPolicy", "Payments", 1500)}
                {area("lateArrivalPolicy", "Late arrival", 1500)}
                {area("generalPolicy", "Other policies", 3000)}
              </div>
            </Section>

            <Section index={6} id="faq" icon={HelpCircle} title={`FAQ · ${profile.faq.length}`} description="The assistant answers these word for word" complete={sectionComplete(SECTIONS[6])}>
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {profile.faq.map((item, index) => (
                    <motion.div key={faqIds[index] ?? index} layout={!reduce} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={spring.soft} className="space-y-2 rounded-2xl bg-muted/40 p-3 ring-1 ring-inset ring-border/60">
                      <div className="flex items-start gap-2">
                        <span className="mt-4 grid size-6 shrink-0 place-items-center rounded-full bg-portal/12 text-[11px] font-bold text-portal">{index + 1}</span>
                        <FloatingLabelInput label="Question" maxLength={300} value={item.question} onChange={(e) => setFaq(index, "question", e.target.value)} />
                        <IconButton
                          icon={Trash2}
                          label={`Remove question ${index + 1}`}
                          className="mt-1.5 text-ink-destructive"
                          onClick={() => {
                            setProfile((current) => ({ ...current, faq: current.faq.filter((_, i) => i !== index) }));
                            setFaqIds((ids) => ids.filter((_, i) => i !== index));
                          }}
                        />
                      </div>
                      <FloatingLabelInput as="textarea" label="Answer" maxLength={1500} value={item.answer} onChange={(e) => setFaq(index, "answer", e.target.value)} inputClassName="min-h-20" />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {!profile.faq.length ? <p className="rounded-2xl border border-dashed border-border py-6 text-center text-caption text-ink-neutral">No questions yet</p> : null}
                <ButtonLoadingMorph
                  variant="outline"
                  icon={Plus}
                  disabled={profile.faq.length >= 25}
                  onClick={() => {
                    setProfile((current) => ({ ...current, faq: [...current.faq, { question: "", answer: "" }] }));
                    setFaqIds((ids) => [...ids, newId()]);
                  }}
                >
                  Add question
                </ButtonLoadingMorph>
              </div>
            </Section>
          </div>

          {/* Right rail: completeness, live preview, AI assistants */}
          <aside className="space-y-4 lg:col-span-2 xl:sticky xl:top-[calc(var(--topbar-h)+1rem)] xl:col-span-1 xl:self-start">
            <div className="flex items-center gap-4 rounded-card border border-border/60 bg-card p-4 shadow-soft">
              <ProgressRing value={completeness} size={80} label="Profile completeness" />
              <div className="min-w-0">
                <p className="font-display text-base font-semibold">Profile</p>
                <p className="text-caption text-ink-neutral">{completeness === 100 ? "All filled in" : "Fuller = better answers"}</p>
                {!dirty && meta.updatedAt ? <p className="mt-1 text-[11px] text-ink-neutral">Saved {dateTimeOf(meta.updatedAt)}</p> : null}
              </div>
            </div>

            <div className="rounded-card border border-border/60 bg-card p-4 shadow-soft">
              <p className="mb-3 text-micro font-semibold uppercase text-ink-neutral">Footer preview</p>
              <div className="space-y-2 rounded-2xl bg-foreground p-4 text-sm text-background">
                <p className="font-display text-base font-semibold">{profile.businessName || "Your salon"}</p>
                {profile.tagline ? <p className="text-xs opacity-80">{profile.tagline}</p> : null}
                <div className="space-y-1 pt-1 text-xs opacity-90">
                  {address ? (
                    <p className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden /> {address}
                    </p>
                  ) : null}
                  {profile.phone ? (
                    <p className="flex items-center gap-1.5">
                      <Phone className="size-3" aria-hidden /> {profile.phone}
                    </p>
                  ) : null}
                  {profile.supportEmail ? (
                    <p className="flex items-center gap-1.5">
                      <Mail className="size-3" aria-hidden /> {profile.supportEmail}
                    </p>
                  ) : null}
                </div>
                {links.length ? (
                  <p className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                    {links.map((l) => (
                      <span key={l} className="rounded-full bg-background/15 px-2 py-0.5">
                        {l}
                      </span>
                    ))}
                  </p>
                ) : null}
                {!address && !profile.phone && !profile.supportEmail && !links.length ? <p className="text-xs opacity-70">Add contact details</p> : null}
              </div>
            </div>

            <AdminInsightsPanel />
          </aside>

          {/* Save bar: only when there is something to save; above the phone tab bar */}
          <AnimatePresence>
            {dirty || saving ? (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={spring.sheet}
                className="glass-strong fixed inset-x-3 bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+0.75rem)] z-sticky mx-auto flex max-w-xl items-center justify-between gap-2 rounded-sheet p-2.5 pl-4 shadow-float lg:bottom-6 lg:left-[calc(var(--sidebar-w)+1rem)]"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("size-2 rounded-full", invalid ? "bg-destructive" : "bg-warning")} aria-hidden /> {invalid ? "Fix fields" : "Unsaved"}
                </span>
                <div className="flex gap-2">
                  <ButtonLoadingMorph variant="ghost" icon={Undo2} disabled={saving} onClick={discard}>
                    Discard
                  </ButtonLoadingMorph>
                  <ButtonLoadingMorph type="submit" icon={Save} state={saveAction.state} loadingLabel="Saving…" successLabel="Saved" errorLabel="Check fields">
                    Save
                  </ButtonLoadingMorph>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </form>
      ) : null}
      {guardSheet}
    </AdminLayout>
  );
}
