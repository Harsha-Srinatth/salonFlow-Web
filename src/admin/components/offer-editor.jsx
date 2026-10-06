"use client";
import { AnimatePresence, motion } from "motion/react";
import { BorderBeam } from "border-beam";
import { ArrowLeft, Check, Crown, Gift, Loader2, Percent, Search, Star, Tag, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DateRangePicker, FUTURE_PRESETS, parseYmd, ymd } from "@/admin/components/date-range-picker";
import { SlideOver } from "@/admin/components/slide-over";
import { Switch } from "@/admin/components/service-editor-drawer";
import { ToggleChip } from "@/admin/components/toggle-chip";
import { SegmentedControl } from "@/components/fx/segmented-control";
import { cn } from "@/lib/utils";

export const TYPE_META = {
  GLOBAL: { label: "Sitewide", short: "All services", icon: Percent, tone: "bg-primary/10 text-primary" },
  SERVICE: { label: "Service", short: "One service", icon: Tag, tone: "bg-chart-3/15 text-chart-3" },
  MEMBERSHIP: { label: "Member", short: "Plan members", icon: Crown, tone: "bg-accent/15 text-accent" },
  COMBO: { label: "Combo", short: "Bundle price", icon: Gift, tone: "bg-chart-4/15 text-chart-4" },
};
export const SEGMENT_META = {
  FREE: { label: "Free", icon: Users },
  BASIC: { label: "Basic", icon: Star },
  PREMIUM: { label: "Premium", icon: Crown },
};
const SEGMENT_OPTIONS = Object.entries(SEGMENT_META).map(([value, m]) => ({ value, label: m.label, icon: m.icon }));
const CATEGORY_OPTIONS = [
  { value: "MEN", label: "Men" },
  { value: "WOMEN", label: "Women" },
  { value: "CHILDREN", label: "Children" },
];
const QUICK_PERCENT = [5, 10, 15, 20, 25, 30, 50];
const inr = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

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
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-9 w-full rounded-lg border bg-background pl-9 pr-8 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" />
      {value ? (
        <button type="button" aria-label="Clear" onClick={() => onChange("")} className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-muted">
          <X className="size-3" />
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
      <ul className="admin-scrollbar max-h-56 space-y-1 overflow-y-auto rounded-xl border bg-muted/20 p-1.5" role="radiogroup" aria-label="Service">
        {list.map((s) => {
          const on = s.id === value;
          return (
            <li key={s.id}>
              <button type="button" role="radio" aria-checked={on} onClick={() => onChange(s.id)} className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors", on ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                <span className="flex min-w-0 items-center gap-2">
                  {on ? <Check className="size-4 shrink-0" /> : null}
                  <span className="truncate font-medium">{s.name}</span>
                </span>
                <span className={cn("shrink-0 text-xs tabular-nums", on ? "opacity-90" : "text-muted-foreground")}>{inr(s.basePrice)}</span>
              </button>
            </li>
          );
        })}
        {!list.length ? <li className="py-4 text-center text-xs text-muted-foreground">No match</li> : null}
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
      <div className="admin-scrollbar flex max-h-52 flex-wrap gap-1.5 overflow-y-auto rounded-xl border bg-muted/20 p-2">
        {list.map((s) => (
          <ToggleChip key={s.id} size="sm" selected={value.includes(s.id)} onClick={() => toggle(s.id)}>
            {s.name}
          </ToggleChip>
        ))}
        {!list.length ? <p className="w-full py-3 text-center text-xs text-muted-foreground">No match</p> : null}
      </div>
    </div>
  );
}

function PercentField({ value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-1 rounded-xl bg-primary/5 px-4 py-3">
        <input aria-label="Discount percent" type="number" inputMode="decimal" min="0" max="100" step="0.5" value={value} onChange={(e) => onChange(e.target.value)} className="w-24 bg-transparent font-display text-5xl font-bold tracking-tight outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
        <span className="text-2xl font-bold text-muted-foreground">% off</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_PERCENT.map((p) => (
          <motion.button key={p} type="button" whileTap={{ scale: 0.94 }} onClick={() => onChange(`${p}`)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors", Number(value) === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
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
      <p className="text-sm font-medium">{label}</p>
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (e) {
      setError(e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const meta = form ? TYPE_META[form.type] : null;
  const title = editing ? `Edit ${meta?.label.toLowerCase()} offer` : form ? `New ${meta.label.toLowerCase()} offer` : "New offer";

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        form ? (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {error ? (
                <motion.p key="e" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden text-sm font-medium text-destructive" role="alert">
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>
            <div className="flex items-center justify-between gap-2">
              {!editing ? (
                <Button type="button" variant="ghost" onClick={() => setForm(null)} disabled={saving}>
                  <ArrowLeft className="size-4" /> Type
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <BorderBeam size="sm" active={!saving}>
                  <Button type="button" onClick={() => void submit()} disabled={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    {saving ? "Saving…" : editing ? "Save" : "Create"}
                  </Button>
                </BorderBeam>
              </div>
            </div>
          </div>
        ) : null
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5">
        <AnimatePresence mode="wait" initial={false}>
          {!form ? (
            <motion.div key="pick" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="grid gap-3 sm:grid-cols-2">
              {Object.entries(TYPE_META).map(([type, m], i) => {
                const Icon = m.icon;
                return (
                  <motion.button
                    key={type}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setForm(type === "GLOBAL" && existingGlobal ? formFromOffer("GLOBAL", existingGlobal) : emptyForm(type))}
                    className="flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className={cn("grid size-11 place-items-center rounded-xl", m.tone)}>
                      <Icon className="size-5" />
                    </span>
                    <span>
                      <span className="block font-display text-base font-semibold">{m.label}</span>
                      <span className="block text-xs text-muted-foreground">{m.short}</span>
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-6">
              <div className="flex items-center gap-3">
                <span className={cn("grid size-11 place-items-center rounded-xl", meta.tone)}>
                  <meta.icon className="size-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold leading-tight">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.short}</p>
                </div>
              </div>

              {form.type === "COMBO" ? (
                <>
                  <Row label="Name">
                    <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Bridal glow pack" maxLength={80} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
                  </Row>
                  <Row label="For">
                    <SegmentedControl fluid label="Category" options={CATEGORY_OPTIONS} value={form.category} onChange={(category) => set({ category })} />
                  </Row>
                  <Row label={`Services · ${form.serviceIds.length}`}>
                    <ServiceMultiList services={services} value={form.serviceIds} onChange={(serviceIds) => set({ serviceIds })} />
                  </Row>
                  <Row label="Combo price">
                    <div className="flex items-center gap-3 rounded-xl bg-primary/5 px-4 py-3">
                      <span className="text-2xl font-bold text-muted-foreground">₹</span>
                      <input aria-label="Combo price" type="number" inputMode="numeric" min="1" value={form.offerPrice} onChange={(e) => set({ offerPrice: e.target.value })} className="w-full min-w-0 bg-transparent font-display text-4xl font-bold tracking-tight outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    {comboActual ? (
                      <p className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground line-through">{inr(comboActual)}</span>
                        {comboOffer > 0 ? <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", comboSave ? "bg-success/10 text-success" : "bg-warning/15 text-warning")}>{comboSave ? `Saves ${inr(comboSave)}` : "No saving"}</span> : null}
                      </p>
                    ) : null}
                  </Row>
                  <Row label="Visible to">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(SEGMENT_META).map(([seg, m]) => (
                        <ToggleChip key={seg} selected={form.visibleSegments.includes(seg)} onClick={() => set({ visibleSegments: form.visibleSegments.includes(seg) ? form.visibleSegments.filter((x) => x !== seg) : [...form.visibleSegments, seg] })}>
                          <m.icon className="size-3.5" /> {m.label}
                        </ToggleChip>
                      ))}
                    </div>
                  </Row>
                </>
              ) : (
                <>
                  {form.type === "MEMBERSHIP" ? (
                    <Row label="Member plan">
                      <SegmentedControl fluid label="Member plan" options={SEGMENT_OPTIONS} value={form.membershipSegment} onChange={(membershipSegment) => set({ membershipSegment })} />
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
                      <p className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground line-through">{inr(original)}</span>
                        <span className="font-semibold">{inr(discounted)}</span>
                      </p>
                    ) : null}
                  </Row>
                </>
              )}

              <Row label="When">
                <DateRangePicker value={form.range} onChange={(range) => set({ range })} presets={FUTURE_PRESETS} allowPast={false} allowFuture anyLabel="Always on" label="Offer dates" inline />
                {form.range.from ? <p className="text-xs text-muted-foreground">{form.range.to && form.range.to !== form.range.from ? `${parseYmd(form.range.from).toLocaleDateString([], { day: "numeric", month: "short" })} to ${parseYmd(form.range.to).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}` : parseYmd(form.range.from).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}</p> : null}
              </Row>

              <div className="flex items-center justify-between rounded-xl border p-3">
                <span className="text-sm font-medium">Live</span>
                <Switch checked={form.isEnabled} onChange={(isEnabled) => set({ isEnabled })} label="Offer live" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SlideOver>
  );
}
