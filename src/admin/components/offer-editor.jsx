"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Baby, Check, Crown, Gift, IndianRupee, Percent, Search, Star, Tag, User, UserRound, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatedTabBar, ButtonLoadingMorph, FloatingLabelInput, TONE_CLASSES, useAsyncAction } from "@/components/kit";
import { haptic, interaction, spring } from "@/components/motion";
import { formatMoney } from "@/lib/format";
import { formatIsoDate } from "@/lib/salon-date";
import { DateRangePicker, FUTURE_PRESETS, ymd } from "@/admin/components/date-range-picker";
import { SlideOver } from "@/admin/components/slide-over";
import { Switch } from "@/admin/components/switch";
import { ToggleChip } from "@/admin/components/toggle-chip";
import { cn } from "@/lib/utils";

export const TYPE_META = {
  GLOBAL: { label: "Sitewide", short: "All services", icon: Percent, tone: TONE_CLASSES.primary },
  SERVICE: { label: "Service", short: "One service", icon: Tag, tone: TONE_CLASSES.success },
  MEMBERSHIP: { label: "Member", short: "Plan members", icon: Crown, tone: TONE_CLASSES.plum },
  COMBO: { label: "Combo", short: "Bundle price", icon: Gift, tone: TONE_CLASSES.info },
};
export const SEGMENT_META = {
  FREE: { label: "Free", icon: Users },
  BASIC: { label: "Basic", icon: Star },
  PREMIUM: { label: "Premium", icon: Crown },
};
const SEGMENT_OPTIONS = Object.entries(SEGMENT_META).map(([value, m]) => ({ value, label: m.label, icon: m.icon }));
const CATEGORY_OPTIONS = [
  { value: "MEN", label: "Men", icon: User },
  { value: "WOMEN", label: "Women", icon: UserRound },
  { value: "CHILDREN", label: "Kids", icon: Baby },
];
const QUICK_PERCENT = [5, 10, 15, 20, 25, 30, 50];
const inr = (n) => formatMoney(n);

/* ---- form <-> API mapping ---- */
const localYmd = (iso) => (iso ? ymd(new Date(iso)) : "");

export function emptyForm(type) {
  return { type, id: null, serviceId: "", membershipSegment: "PREMIUM", discountPercent: "10", name: "", description: "", category: "MEN", offerPrice: "", serviceIds: [], visibleSegments: ["FREE", "BASIC", "PREMIUM"], range: { from: "", to: "" }, isEnabled: true };
}

export function formFromOffer(type, item) {
  return {
    ...emptyForm(type),
    id: item.id,
    serviceId: item.serviceId ?? "",
    membershipSegment: item.membershipSegment ?? "PREMIUM",
    discountPercent: `${item.discountPercent ?? 0}`,
    name: item.name ?? "",
    description: item.description ?? "",
    category: item.category ?? "MEN",
    offerPrice: `${item.offerPrice ?? ""}`,
    serviceIds: Array.isArray(item.serviceIds) ? item.serviceIds : [],
    visibleSegments: Array.isArray(item.visibleSegments) && item.visibleSegments.length ? item.visibleSegments : ["FREE", "BASIC", "PREMIUM"],
    range: { from: localYmd(item.startAt), to: localYmd(item.endAt) },
    isEnabled: Boolean(item.isEnabled),
  };
}

/** Full payload the API wants (update replaces every field, so toggles must resend them all). */
export function payloadFromForm(form) {
  const startAt = form.range.from ? new Date(`${form.range.from}T00:00:00`).toISOString() : "";
  const endAt = form.range.to ? new Date(`${form.range.to}T23:59:00`).toISOString() : "";
  const base = { startAt, endAt, isEnabled: form.isEnabled };
  if (form.type === "GLOBAL") return { ...base, discountPercent: Number(form.discountPercent || 0) };
  if (form.type === "SERVICE") return { ...base, serviceId: form.serviceId, discountPercent: Number(form.discountPercent || 0) };
  if (form.type === "MEMBERSHIP") return { ...base, serviceId: form.serviceId, membershipSegment: form.membershipSegment, discountPercent: Number(form.discountPercent || 0) };
  return { ...base, name: form.name.trim(), description: form.description.trim(), category: form.category, offerPrice: Number(form.offerPrice || 0), serviceIds: form.serviceIds, visibleSegments: form.visibleSegments };
}

function validate(form) {
  if (form.type !== "COMBO") {
    const p = Number(form.discountPercent);
    if (!(p > 0 && p <= 100)) return "Pick a discount between 1 and 100%";
  }
  if ((form.type === "SERVICE" || form.type === "MEMBERSHIP") && !form.serviceId) return "Choose a service";
  if (form.type === "COMBO") {
    if (!form.name.trim()) return "Name the combo";
    if (!form.serviceIds.length) return "Pick at least one service";
    if (!(Number(form.offerPrice) > 0)) return "Set the combo price";
    if (!form.visibleSegments.length) return "Choose who can see it";
  }
  return "";
}

function SearchBox({ value, onChange, placeholder = "Search" }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-neutral" aria-hidden />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-11 w-full rounded-control bg-muted/60 pr-10 pl-10 text-sm outline-none placeholder:text-ink-neutral focus-visible:ring-2 focus-visible:ring-portal" />
      {value ? (
        <button type="button" aria-label="Clear" onClick={() => onChange("")} className="tap absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-muted">
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function ServiceRadioList({ services, value, onChange }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => services.filter((s) => `${s.name} ${s.category ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())), [services, q]);
  return (
    <div className="space-y-2">
      <SearchBox value={q} onChange={setQ} placeholder="Find a service" />
      <ul className="admin-scrollbar max-h-56 space-y-1 overflow-y-auto rounded-2xl bg-muted/40 p-1.5 ring-1 ring-inset ring-border/60" role="radiogroup" aria-label="Service" data-vaul-no-drag>
        {list.map((s) => {
          const on = s.id === value;
          return (
            <li key={s.id}>
              <button type="button" role="radio" aria-checked={on} onClick={() => onChange(s.id)} className={cn("flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors", on ? "bg-portal text-portal-foreground" : "hover:bg-muted")}>
                <span className="flex min-w-0 items-center gap-2">
                  {on ? <Check className="size-4 shrink-0" /> : null}
                  <span className="truncate font-medium">{s.name}</span>
                </span>
                <span className={cn("shrink-0 text-caption tabular-nums", on ? "opacity-90" : "text-ink-neutral")}>{inr(s.basePrice)}</span>
              </button>
            </li>
          );
        })}
        {!list.length ? <li className="py-4 text-center text-caption text-ink-neutral">No match</li> : null}
      </ul>
    </div>
  );
}

function ServiceMultiList({ services, value, onChange }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => services.filter((s) => `${s.name} ${s.category ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())), [services, q]);
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="space-y-2">
      <SearchBox value={q} onChange={setQ} placeholder="Find services" />
      <div className="admin-scrollbar flex max-h-52 flex-wrap gap-1.5 overflow-y-auto rounded-2xl bg-muted/40 p-2 ring-1 ring-inset ring-border/60" data-vaul-no-drag>
        {list.map((s) => (
          <ToggleChip key={s.id} size="sm" selected={value.includes(s.id)} onClick={() => toggle(s.id)}>
            {s.name}
          </ToggleChip>
        ))}
        {!list.length ? <p className="w-full py-3 text-center text-caption text-ink-neutral">No match</p> : null}
      </div>
    </div>
  );
}

function PercentField({ value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-1 rounded-2xl bg-portal/8 px-4 py-3 ring-1 ring-inset ring-portal/20 focus-within:ring-2 focus-within:ring-portal">
        <input aria-label="Discount percent" type="number" inputMode="decimal" min="0" max="100" step="0.5" value={value} onChange={(e) => onChange(e.target.value)} className="w-24 bg-transparent font-display text-5xl font-bold tracking-tight outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
        <span className="text-2xl font-bold text-ink-neutral">% off</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_PERCENT.map((p) => (
          <motion.button key={p} type="button" whileTap={interaction.press} onClick={() => { haptic("tap"); onChange(`${p}`); }} className={cn("tap h-9 rounded-full px-3.5 text-caption font-bold ring-1 ring-inset transition-colors", Number(value) === p ? "bg-portal text-portal-foreground ring-portal" : "bg-card ring-border hover:bg-muted")}>
            {p}%
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="space-y-2">
      <p className="text-caption font-semibold text-ink-neutral">{label}</p>
      {children}
    </div>
  );
}

/**
 * One slide-over to create or edit any offer. `type` null = pick a type first (create only).
 * `onSubmit(form)` must return a promise that rejects with an Error whose message is shown inline.
 */
export function OfferEditor({ open, onOpenChange, services, initial, existingGlobal, onSubmit }) {
  const [form, setForm] = useState(null);
  const saveAction = useAsyncAction({ successMs: 700 });
  const saving = saveAction.state === "loading";
  const [error, setError] = useState("");
  const reduce = useReducedMotion();
  const editing = Boolean(initial?.id);

  useEffect(() => {
    if (!open) return;
    setForm(initial ?? null);
    setError("");
  }, [open, initial]);

  const servicesById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setError("");
  };

  const original = form?.serviceId ? Number(servicesById.get(form.serviceId)?.basePrice ?? 0) : 0;
  const discounted = Math.max(0, original * (1 - Number(form?.discountPercent || 0) / 100));
  const comboActual = (form?.serviceIds ?? []).reduce((sum, id) => sum + Number(servicesById.get(id)?.basePrice ?? 0), 0);
  const comboOffer = Number(form?.offerPrice || 0);
  const comboSave = Math.max(0, comboActual - comboOffer);

  async function submit() {
    const message = validate(form);
    if (message) {
      setError(message);
      throw new Error(message);
    }
    try {
      await onSubmit(form);
      setTimeout(() => onOpenChange(false), 650);
    } catch (e) {
      setError(e?.message ?? "Could not save");
      throw e;
    }
  }

  const meta = form ? TYPE_META[form.type] : null;
  const title = editing ? `Edit ${meta?.label.toLowerCase()} offer` : form ? `New ${meta.label.toLowerCase()} offer` : "New offer";

  const rangeText = form?.range.from
    ? form.range.to && form.range.to !== form.range.from
      ? `${formatIsoDate(form.range.from)} → ${formatIsoDate(form.range.to, { day: "numeric", month: "short", year: "numeric" })}`
      : formatIsoDate(form.range.from, { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={meta?.icon ?? Gift}
      size="md"
      footer={
        form ? (
          <div className="w-full space-y-2">
            <AnimatePresence initial={false}>
              {error ? (
                <motion.p key="e" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm font-semibold text-ink-destructive" role="alert">
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>
            <div className="flex items-center justify-between gap-2">
              {!editing ? (
                <ButtonLoadingMorph variant="ghost" icon={ArrowLeft} disabled={saving} onClick={() => setForm(null)}>
                  Type
                </ButtonLoadingMorph>
              ) : (
                <span />
              )}
              <ButtonLoadingMorph icon={Check} state={saveAction.state} loadingLabel="Saving…" successLabel="Saved" errorLabel="Fix and retry" onClick={() => saveAction.run(submit)}>
                {editing ? "Save" : "Create"}
              </ButtonLoadingMorph>
            </div>
          </div>
        ) : null
      }
    >
      <div className="overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {!form ? (
            <motion.div key="pick" initial={{ opacity: 0, x: reduce ? 0 : -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduce ? 0 : -16 }} transition={spring.soft} className="grid grid-cols-2 gap-3">
              {Object.entries(TYPE_META).map(([type, m], i) => {
                const Icon = m.icon;
                return (
                  <motion.button
                    key={type}
                    type="button"
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring.soft, delay: i * 0.06 }}
                    whileHover={reduce ? undefined : interaction.cardHover}
                    whileTap={reduce ? undefined : interaction.press}
                    onClick={() => setForm(type === "GLOBAL" && existingGlobal ? formFromOffer("GLOBAL", existingGlobal) : emptyForm(type))}
                    className="flex flex-col items-start gap-3 rounded-card bg-card p-4 text-left ring-1 ring-inset ring-border/60 transition-colors hover:ring-portal/40"
                  >
                    <span className={cn("grid size-11 place-items-center rounded-2xl ring-1 ring-inset", m.tone)}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block font-display text-base font-semibold">{m.label}</span>
                      <span className="block text-caption text-ink-neutral">{m.short}</span>
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, x: reduce ? 0 : 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduce ? 0 : 16 }} transition={spring.soft} className="space-y-5">
              {form.type === "COMBO" ? (
                <>
                  <FloatingLabelInput label="Combo name" icon={Gift} value={form.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />
                  <Row label="For">
                    <AnimatedTabBar fullWidth label="Category" items={CATEGORY_OPTIONS} value={form.category} onChange={(category) => set({ category })} />
                  </Row>
                  <Row label={`Services · ${form.serviceIds.length}`}>
                    <ServiceMultiList services={services} value={form.serviceIds} onChange={(serviceIds) => set({ serviceIds })} />
                  </Row>
                  <FloatingLabelInput label="Combo price (₹)" icon={IndianRupee} type="number" inputMode="numeric" min="1" value={form.offerPrice} onChange={(e) => set({ offerPrice: e.target.value })} />
                  {comboActual ? (
                    <p className="flex items-center gap-2 text-sm">
                      <span className="text-ink-neutral line-through tabular-nums">{inr(comboActual)}</span>
                      {comboOffer > 0 ? <span className={cn("rounded-full px-2.5 py-0.5 text-caption font-bold ring-1 ring-inset", comboSave ? TONE_CLASSES.success : TONE_CLASSES.warning)}>{comboSave ? `Saves ${inr(comboSave)}` : "No saving"}</span> : null}
                    </p>
                  ) : null}
                  <Row label="Visible to">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(SEGMENT_META).map(([seg, m]) => (
                        <ToggleChip key={seg} selected={form.visibleSegments.includes(seg)} onClick={() => set({ visibleSegments: form.visibleSegments.includes(seg) ? form.visibleSegments.filter((x) => x !== seg) : [...form.visibleSegments, seg] })}>
                          <m.icon className="size-3.5" aria-hidden /> {m.label}
                        </ToggleChip>
                      ))}
                    </div>
                  </Row>
                </>
              ) : (
                <>
                  {form.type === "MEMBERSHIP" ? (
                    <Row label="Member plan">
                      <AnimatedTabBar fullWidth label="Member plan" items={SEGMENT_OPTIONS} value={form.membershipSegment} onChange={(membershipSegment) => set({ membershipSegment })} />
                    </Row>
                  ) : null}
                  {form.type !== "GLOBAL" ? (
                    <Row label="Service">
                      <ServiceRadioList services={services} value={form.serviceId} onChange={(serviceId) => set({ serviceId })} />
                    </Row>
                  ) : null}
                  <Row label="Discount">
                    <PercentField value={form.discountPercent} onChange={(discountPercent) => set({ discountPercent })} />
                    {original ? (
                      <p className="flex items-center gap-2 text-sm tabular-nums">
                        <span className="text-ink-neutral line-through">{inr(original)}</span>
                        <span className="font-display text-base font-bold">{inr(discounted)}</span>
                      </p>
                    ) : null}
                  </Row>
                </>
              )}

              <Row label="When">
                <DateRangePicker value={form.range} onChange={(range) => set({ range })} presets={FUTURE_PRESETS} allowPast={false} allowFuture anyLabel="Always on" label="Offer dates" inline />
                {rangeText ? <p className="text-caption text-ink-neutral">{rangeText}</p> : null}
              </Row>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3">
                <span className="text-sm font-semibold">Live</span>
                <Switch checked={form.isEnabled} onChange={(isEnabled) => set({ isEnabled })} label="Offer live" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SlideOver>
  );
}
