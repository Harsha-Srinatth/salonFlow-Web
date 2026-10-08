"use client";

import { Avatar, BrandDots, DayTabs, EmptyState, FloatingLabelInput, TimeSlotPicker } from "@/components/kit";
import { spring } from "@/components/motion/presets";
import { ServiceCatalogSelector } from "@/components/services/service-catalog-selector";
import { formatPhone } from "@/lib/format";
import { membershipSegmentBadgeClass, membershipSegmentLabel } from "@/lib/offers/offer-pricing";
import { formatIsoDate, salonTimeLabel } from "@/lib/salon-date";
import { iconForService } from "@/lib/service-icons";
import { cn } from "@/lib/utils";
import { ReceptionOffersPanel } from "@/receptionist/components/reception-offers-panel";
import { PaymentModePicker } from "@/receptionist/components/payment-sheet";
import { formatCurrency, maskEmail, maskPhone } from "@/receptionist/lib/booking-utils";
import { CalendarClock, Check, Crown, Lock, Mail, Mars, NonBinary, Phone, ShieldAlert, Sparkles, User, UserCheck, Venus } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { useId } from "react";

const GENDERS = [
  { value: "FEMALE", label: "Female", icon: Venus },
  { value: "MALE", label: "Male", icon: Mars },
  { value: "OTHER", label: "Other", icon: NonBinary },
];

function SectionLabel({ icon: Icon, children, id }) {
  return (
    <p id={id} className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
      <Icon className="size-4 text-portal" aria-hidden />
      {children}
    </p>
  );
}

function MemberBadge({ segment, planName }) {
  const value = `${segment ?? "FREE"}`.toUpperCase();
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold", membershipSegmentBadgeClass(value))}>
      <Crown className="size-3" aria-hidden />
      {planName ?? membershipSegmentLabel(value)}
    </span>
  );
}

export function CustomerStep({ form, setField, lookup, lookupLoading, locked, onToggleLock, planName }) {
  const genderId = useId();
  const hasContact = Boolean(form.customerEmail || form.customerPhone);
  const existing = lookup.status === "EXISTING_CUSTOMER" && lookup.customer;
  const conflict = lookup.status === "CONFLICT_NON_CUSTOMER_ACCOUNT";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <FloatingLabelInput
          label="Phone"
          icon={Phone}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={form.customerPhone}
          disabled={locked}
          onChange={(e) => setField("customerPhone", e.target.value)}
          error={conflict ? "Staff/admin account" : undefined}
          success={Boolean(existing)}
        />
        <FloatingLabelInput label="Name" icon={User} autoComplete="off" value={form.customerName} disabled={locked} onChange={(e) => setField("customerName", e.target.value)} />
        <FloatingLabelInput label="Email" icon={Mail} type="email" autoComplete="off" value={form.customerEmail} disabled={locked} onChange={(e) => setField("customerEmail", e.target.value)} className="md:col-span-2" />
      </div>

      <div aria-live="polite" className="min-h-6">
        {lookupLoading ? (
          <p className="inline-flex items-center gap-2 text-caption font-semibold text-ink-neutral">
            <BrandDots size={5} /> Looking up customer…
          </p>
        ) : conflict ? (
          <p className="flex items-center gap-2 rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-ink-destructive">
            <ShieldAlert className="size-4 shrink-0" aria-hidden /> Belongs to a staff/admin account. Use different details.
          </p>
        ) : existing ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="flex flex-wrap items-center gap-3 rounded-card border border-success/30 bg-success/8 p-3">
            <Avatar name={lookup.customer.name} size="md" status="online" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold">{lookup.customer.name ?? "Customer"}</p>
                <MemberBadge segment={lookup.customer.membershipSegment} planName={planName} />
              </div>
              <p className="truncate text-caption text-ink-neutral">
                {maskPhone(lookup.customer.phone)} · {maskEmail(lookup.customer.email)}
                {lookup.customer.accountStatus ? ` · ${lookup.customer.accountStatus}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleLock}
              aria-pressed={locked}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-control px-4 text-sm font-semibold transition-colors",
                locked ? "bg-success text-success-foreground" : "bg-card ring-1 ring-inset ring-border hover:bg-muted"
              )}
            >
              {locked ? <Lock className="size-4" aria-hidden /> : <UserCheck className="size-4" aria-hidden />}
              {locked ? "Locked" : "Use customer"}
            </button>
          </motion.div>
        ) : hasContact ? (
          <p className="flex flex-wrap items-center gap-2 text-caption font-semibold text-ink-neutral">
            <Sparkles className="size-4 text-portal" aria-hidden /> New customer
            <MemberBadge segment="FREE" />
          </p>
        ) : null}
      </div>

      <div>
        <SectionLabel icon={User} id={genderId}>
          Gender <span className="font-normal text-ink-neutral">· picks stylists & services</span>
        </SectionLabel>
        <LayoutGroup id={genderId}>
          <div role="radiogroup" aria-labelledby={genderId} className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
            {GENDERS.map((g) => {
              const active = form.customerGender === g.value;
              const Icon = g.icon;
              return (
                <button
                  key={g.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setField("customerGender", g.value)}
                  className={cn("relative inline-flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold", active ? "text-foreground" : "text-ink-neutral")}
                >
                  {active ? <motion.span layoutId={`${genderId}-pill`} transition={spring.snappy} className="absolute inset-0 rounded-full bg-card shadow-soft ring-1 ring-portal/25" /> : null}
                  <Icon className={cn("relative size-4", active && "text-portal")} aria-hidden />
                  <span className="relative">{g.label}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
}

export function ServicesStep({ services, servicesLoading, servicesError, offers, offersLoading, form, membershipSegment, planName, onToggleService, onSelectVariant, onApplyCombo, onClearCombo }) {
  return (
    <div className="space-y-6">
      <ReceptionOffersPanel
        offers={offers}
        membershipSegment={membershipSegment}
        membershipPlanName={planName}
        selectedComboId={form.comboId}
        loading={offersLoading}
        onApplyCombo={onApplyCombo}
        onClearCombo={onClearCombo}
      />
      {servicesLoading && !services.length ? (
        <p className="inline-flex items-center gap-2 text-caption font-semibold text-ink-neutral">
          <BrandDots size={5} /> Loading services…
        </p>
      ) : null}
      {servicesError ? <p className="rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-ink-destructive">{servicesError}</p> : null}
      <div className="[&_.grid]:md:grid-cols-2 [&_.grid]:2xl:grid-cols-3">
        <ServiceCatalogSelector
          services={services}
          mode="multi"
          label="Choose services"
          selectedServiceIds={form.serviceIds ?? []}
          onToggleServiceId={onToggleService}
          pricedServices={offers?.pricedServices}
          variantSelections={form.variantSelections}
          membershipSegment={membershipSegment}
          onSelectVariant={onSelectVariant}
        />
      </div>
    </div>
  );
}

export function TimeStep({ form, todayIso, tomorrowIso, slots, slotsLoading, stylistOptions, onDate, onSlot, onStylist }) {
  const stylistId = useId();
  return (
    <div className="space-y-6">
      <DayTabs days={[todayIso, tomorrowIso]} value={form.bookingDate || todayIso} onChange={onDate} label="Date" />
      <div>
        <SectionLabel icon={CalendarClock}>Time</SectionLabel>
        <TimeSlotPicker
          slots={slots}
          value={form.startsAt}
          onChange={(startsAt) => onSlot(startsAt)}
          loading={slotsLoading}
          empty={<EmptyState compact illustration="calendar" title="No free slots" description="Try the other day or fewer services." />}
        />
      </div>
      {form.startsAt ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
          <SectionLabel icon={User} id={stylistId}>Stylist</SectionLabel>
          <div role="radiogroup" aria-labelledby={stylistId} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {stylistOptions.map((s) => {
              const active = form.stylistId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onStylist(s.id)}
                  className={cn(
                    "relative flex min-h-14 items-center gap-2.5 rounded-2xl p-2.5 text-left ring-1 ring-inset transition-colors",
                    active ? "bg-portal/10 ring-portal/50" : "bg-card ring-border/60 hover:bg-muted"
                  )}
                >
                  <Avatar name={s.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.name}</span>
                  {active ? (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} className="grid size-6 place-items-center rounded-full bg-portal text-portal-foreground">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    </motion.span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

export function ConfirmStep({ form, services, stylistName, priceSummary, onPaymentMode }) {
  const chosen = services.filter((s) => (form.serviceIds ?? []).includes(s.id));
  const rows = [
    { icon: User, label: form.customerName || "Walk-in customer", sub: [formatPhone(form.customerPhone), form.customerEmail].filter(Boolean).join(" · ") },
    { icon: CalendarClock, label: form.startsAt ? `${formatIsoDate(form.bookingDate, { weekday: "short", day: "numeric", month: "short" })} · ${salonTimeLabel(form.startsAt)}` : "—", sub: stylistName },
  ];
  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-portal/12 text-portal">
              <row.icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{row.label}</span>
              {row.sub ? <span className="block truncate text-caption text-ink-neutral">{row.sub}</span> : null}
            </span>
          </li>
        ))}
      </ul>

      <ul className="flex flex-wrap gap-2" aria-label="Services">
        {chosen.map((s) => {
          const Icon = iconForService(s);
          const variant = form.variantSelections?.[s.id];
          return (
            <li key={s.id} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-card px-3 text-sm font-semibold ring-1 ring-inset ring-border">
              <Icon className="size-4 text-portal" aria-hidden />
              {s.name}
              {variant ? <span className="font-normal text-ink-neutral">· {variant}</span> : null}
            </li>
          );
        })}
      </ul>

      <PaymentModePicker value={form.paymentMode || "OFFLINE_CASH"} onChange={onPaymentMode} />

      <dl className="space-y-1.5 rounded-card border border-border/60 bg-card p-4">
        <div className="flex justify-between text-sm">
          <dt className="text-ink-neutral">Total</dt>
          <dd className="tabular-nums">{formatCurrency(priceSummary.totalAmount ?? 0)}</dd>
        </div>
        {Number(priceSummary.discountAmount ?? 0) > 0 ? (
          <div className="flex justify-between text-sm">
            <dt className="text-ink-neutral">Discount</dt>
            <dd className="font-semibold text-ink-success tabular-nums">−{formatCurrency(priceSummary.discountAmount)}</dd>
          </div>
        ) : null}
        <div className="flex items-end justify-between border-t border-border/60 pt-2">
          <dt className="font-semibold">Payable</dt>
          <dd className="font-display text-title font-bold tabular-nums">{formatCurrency(priceSummary.payableAmount ?? 0)}</dd>
        </div>
        {priceSummary.offerLabel ? <p className="text-caption font-semibold text-ink-primary">{priceSummary.offerLabel}</p> : null}
      </dl>
    </div>
  );
}
