"use client"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { CalendarClock, CalendarDays, CircleCheck, CircleDashed, Crown, Eye, Gift, Hourglass, Layers, Pencil, Percent, Plus, Search, Sparkles, Tag, TimerOff, Trash2, Users, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AnimatedTabBar, ButtonLoadingMorph, ErrorState, IconButton, StatCard, TONE_CLASSES } from "@/components/kit"
import { interaction, spring } from "@/components/motion"
import { notify } from "@/lib/notify"
import { AdminLayout } from "../portal/admin-layout"
import { useConfirm } from "@/admin/components/confirm-dialog"
import { EmptyState } from "@/admin/components/empty-state"
import { ErrorBanner } from "@/admin/components/error-banner"
import { FilterTabs } from "@/admin/components/filter-tabs"
import { emptyForm, formFromOffer, OfferEditor, payloadFromForm, SEGMENT_META, TYPE_META } from "@/admin/components/offer-editor"
import { SkeletonCards } from "@/admin/components/skeleton"
import { Switch } from "@/admin/components/switch"
import { ToneChip } from "@/admin/components/tone-chip"
import { getFirebaseIdToken } from "@/lib/auth/auth-client"
import { toApiUrl } from "@/lib/api-base"
import { formatMoney } from "@/lib/format"
import { connectAdminBookingsSocket, disconnectAdminBookingsSocket } from "@/lib/realtime/admin-bookings-socket"
import { formatIsoDate, salonDateOf } from "@/lib/salon-date"
import { cn } from "@/lib/utils"

async function authFetch(path, init) {
  const token = await getFirebaseIdToken().catch(() => null)
  const res = await fetch(toApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "Request failed")
  return data
}

const inr = (n) => formatMoney(n)
const dayLabel = (iso) => (iso && !Number.isNaN(new Date(iso).getTime()) ? formatIsoDate(salonDateOf(iso)) : "—")

// Schedule state derived here (not an API status), so it renders as a ToneChip.
const STATUS = {
  live: { label: "Live", tone: "success", icon: CircleCheck },
  scheduled: { label: "Soon", tone: "info", icon: Hourglass },
  ended: { label: "Ended", tone: "neutral", icon: TimerOff },
  off: { label: "Off", tone: "neutral", icon: CircleDashed },
}

function statusOf(item, now) {
  if (!item.isEnabled) return "off"
  if (item.startAt && new Date(item.startAt).getTime() > now) return "scheduled"
  if (item.endAt && new Date(item.endAt).getTime() < now) return "ended"
  return "live"
}

function whenLabel(item, status) {
  if (status === "ended") return `Ended ${dayLabel(item.endAt)}`
  if (status === "scheduled") return `From ${dayLabel(item.startAt)}`
  if (item.endAt) return `Until ${dayLabel(item.endAt)}`
  return "Always on"
}

const TYPE_FILTERS = [{ value: "ALL", label: "All", icon: Layers }, ...Object.entries(TYPE_META).map(([value, m]) => ({ value, label: m.label, icon: m.icon }))]
const SEGMENT_OPTIONS = Object.entries(SEGMENT_META).map(([value, m]) => ({ value, label: m.label, icon: m.icon }))

const SOURCE_META = {
  MEMBERSHIP_OFFER: { icon: Crown, title: "Member offer", tone: TONE_CLASSES.plum },
  COMBO_OFFER: { icon: Gift, title: "Combo", tone: TONE_CLASSES.info },
  SERVICE_DISCOUNT: { icon: Tag, title: "Service offer", tone: TONE_CLASSES.success },
  GLOBAL_DISCOUNT: { icon: Percent, title: "Sitewide offer", tone: TONE_CLASSES.primary },
}

function OfferCard({ offer, index, busy, onToggle, onEdit, onDelete }) {
  const reduce = useReducedMotion()
  const meta = TYPE_META[offer.type]
  const Icon = meta.icon
  const st = STATUS[offer.status]
  const seg = offer.type === "MEMBERSHIP" ? SEGMENT_META[offer.membershipSegment] : null
  return (
    <motion.article
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={reduce ? undefined : interaction.cardHover}
      transition={{ ...spring.soft, delay: Math.min(index, 10) * 0.04 }}
      className={cn("flex flex-col gap-4 rounded-card border border-border/60 bg-card p-4 shadow-soft transition-shadow hover:shadow-lift", (offer.status === "ended" || offer.status === "off") && "opacity-75")}
    >
      <div className="flex items-start justify-between gap-3">
        <span title={meta.label} className={cn("grid size-11 shrink-0 place-items-center rounded-2xl ring-1 ring-inset", meta.tone)}>
          <Icon className="size-5" aria-hidden />
          <span className="sr-only">{meta.label}</span>
        </span>
        <div className="text-right">
          <p className="font-display text-3xl leading-none font-bold tracking-tight tabular-nums">{offer.type === "COMBO" ? inr(offer.offerPrice) : `${offer.discountPercent}%`}</p>
          {offer.type === "COMBO" && offer.savings ? <p className="mt-1 text-caption font-semibold text-ink-success">Saves {inr(offer.savings)}</p> : offer.type !== "COMBO" ? <p className="mt-1 text-micro font-semibold uppercase text-ink-neutral">off</p> : null}
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="truncate font-display text-headline font-semibold">{offer.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {seg ? (
            <ToneChip tone="plum" icon={seg.icon} size="sm">
              {seg.label}
            </ToneChip>
          ) : null}
          {offer.type === "COMBO" ? (
            <ToneChip icon={Layers} size="sm">
              {offer.serviceCount} services
            </ToneChip>
          ) : null}
          {offer.type === "COMBO"
            ? (offer.visibleSegments ?? []).map((sg) => {
                const SegIcon = SEGMENT_META[sg]?.icon ?? Users
                return (
                  <span key={sg} title={SEGMENT_META[sg]?.label} className="grid size-6 place-items-center rounded-full bg-muted text-ink-neutral">
                    <SegIcon className="size-3.5" aria-hidden />
                    <span className="sr-only">{SEGMENT_META[sg]?.label}</span>
                  </span>
                )
              })
            : null}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3">
        <div className="min-w-0 space-y-1">
          <ToneChip tone={st.tone} icon={st.icon} size="sm">
            {st.label}
          </ToneChip>
          <p className="flex items-center gap-1 text-caption text-ink-neutral">
            <CalendarDays className="size-3.5" aria-hidden /> {whenLabel(offer, offer.status)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Switch checked={offer.isEnabled} onChange={() => onToggle(offer)} disabled={busy} label={offer.isEnabled ? `Turn off ${offer.title}` : `Turn on ${offer.title}`} />
          <IconButton icon={Pencil} label={`Edit ${offer.title}`} disabled={busy} onClick={() => onEdit(offer)} />
          <IconButton icon={Trash2} label={`Delete ${offer.title}`} disabled={busy} className="text-ink-destructive" onClick={() => onDelete(offer)} />
        </div>
      </div>
    </motion.article>
  )
}

function PreviewCard({ item, index }) {
  const src = SOURCE_META[`${item.source ?? ""}`.toUpperCase()]
  const Icon = src?.icon ?? Tag
  const discounted = Number(item.finalPrice) < Number(item.originalPrice)
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ...spring.soft, delay: Math.min(index, 10) * 0.03 }} className="flex min-h-16 items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft">
      <span title={src?.title ?? "No offer"} className={cn("grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset", src?.tone ?? TONE_CLASSES.neutral)}>
        <Icon className="size-[18px]" aria-hidden />
        <span className="sr-only">{src?.title ?? "No offer"}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.serviceName}</p>
        <p className="flex items-baseline gap-2 text-sm">
          <span className="font-bold tabular-nums">{inr(item.finalPrice)}</span>
          {discounted ? <span className="text-caption text-ink-neutral line-through tabular-nums">{inr(item.originalPrice)}</span> : null}
        </p>
      </div>
      {discounted ? (
        <ToneChip tone="success" size="sm">
          −{Math.round(item.appliedPercent)}%
        </ToneChip>
      ) : null}
    </motion.div>
  )
}

export default function OfferCenterPage() {
  const { ask, confirmSheet } = useConfirm()
  const [params, setParams] = useSearchParams()
  const [center, setCenter] = useState({ services: [], serviceDiscounts: [], membershipDiscounts: [], combos: [], dashboard: {}, globalDiscount: null })
  const [preview, setPreview] = useState({ segment: "FREE", services: [], combos: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [tab, setTab] = useState("offers")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [showEnded, setShowEnded] = useState(false)
  const [editor, setEditor] = useState({ open: false, form: null })
  const [busy, setBusy] = useState(false)
  const [previewSearch, setPreviewSearch] = useState("")
  const [onlyDiscounted, setOnlyDiscounted] = useState(true)
  const previewSegmentRef = useRef("FREE")
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const reloadAll = useCallback(async (segment = previewSegmentRef.current || "FREE") => {
    try {
      const [centerData, previewData] = await Promise.all([authFetch("/api/admin/offers/center"), authFetch(`/api/admin/offers/preview?membershipSegment=${segment}`)])
      setCenter(centerData)
      setPreview(previewData)
      setLoadError("")
    } catch (error) {
      setLoadError(error.message ?? "Could not load offers")
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    previewSegmentRef.current = preview.segment || "FREE"
  }, [preview.segment])

  useEffect(() => {
    reloadAll("FREE").catch(() => {})
    void getFirebaseIdToken()
      .catch(() => null)
      .then((token) =>
        connectAdminBookingsSocket({
          token,
          owner: "offer-center",
          onOfferUpdated: (payload) => {
            const segment = previewSegmentRef.current || "FREE"
            if (payload?.center) setCenter(payload.center)
            if (payload?.previews?.[segment]) {
              setPreview(payload.previews[segment])
              return
            }
            reloadAll(segment).catch(() => {})
          },
        })
      )
    return () => disconnectAdminBookingsSocket()
  }, [reloadAll])

  // ?new=1 (dashboard, ⌘K, FAB) opens the type picker.
  useEffect(() => {
    if (!params.get("new")) return
    setEditor({ open: true, form: null })
    setParams((p) => {
      p.delete("new")
      return p
    }, { replace: true })
  }, [params, setParams])

  const servicesById = useMemo(() => new Map((center.services ?? []).map((s) => [s.id, s])), [center.services])

  const offers = useMemo(() => {
    const out = []
    const g = center.globalDiscount
    if (g) out.push({ ...g, type: "GLOBAL", title: "All services" })
    for (const d of center.serviceDiscounts ?? []) out.push({ ...d, type: "SERVICE", title: servicesById.get(d.serviceId)?.name ?? "Service" })
    for (const d of center.membershipDiscounts ?? []) out.push({ ...d, type: "MEMBERSHIP", title: servicesById.get(d.serviceId)?.name ?? "Service" })
    for (const c of center.combos ?? []) {
      const actual = (c.serviceIds ?? []).reduce((sum, id) => sum + Number(servicesById.get(id)?.basePrice ?? 0), 0)
      out.push({ ...c, type: "COMBO", title: c.name, serviceCount: (c.serviceIds ?? []).length, savings: Math.max(0, actual - Number(c.offerPrice ?? 0)) })
    }
    return out.map((o) => ({ ...o, status: statusOf(o, now) }))
  }, [center, servicesById, now])

  const visibleOffers = useMemo(() => {
    const rank = { live: 0, scheduled: 1, off: 2, ended: 3 }
    return offers.filter((o) => (typeFilter === "ALL" || o.type === typeFilter) && (showEnded || (o.status !== "ended" && o.status !== "off"))).sort((a, b) => rank[a.status] - rank[b.status])
  }, [offers, typeFilter, showEnded])

  const hiddenCount = offers.filter((o) => (typeFilter === "ALL" || o.type === typeFilter) && (o.status === "ended" || o.status === "off")).length

  /* ---- actions ---- */
  async function saveOffer(form) {
    const payload = payloadFromForm(form)
    if (form.id) {
      await authFetch(`/api/admin/offers/${form.type}/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      notify.success("Offer updated")
    } else {
      const path = { GLOBAL: "global", SERVICE: "service", MEMBERSHIP: "membership", COMBO: "combos" }[form.type]
      const data = await authFetch(`/api/admin/offers/${path}`, { method: "POST", body: JSON.stringify(payload) })
      if (data.warning) notify.warning(data.warning)
      notify.success("Offer created")
    }
    await reloadAll().catch(() => {})
  }

  async function toggleOffer(offer) {
    setBusy(true)
    try {
      const form = { ...formFromOffer(offer.type, offer), isEnabled: !offer.isEnabled }
      await authFetch(`/api/admin/offers/${offer.type}/${offer.id}`, { method: "PATCH", body: JSON.stringify(payloadFromForm(form)) })
      notify.success(form.isEnabled ? "Offer is live" : "Offer turned off")
      await reloadAll().catch(() => {})
    } catch (error) {
      notify.error(error.message ?? "Could not update offer")
    } finally {
      setBusy(false)
    }
  }

  function deleteOffer(offer) {
    ask({
      title: `Delete "${offer.title}"?`,
      description: "Customers stop seeing it right away.",
      confirmLabel: "Slide to delete",
      action: async () => {
        try {
          await authFetch(`/api/admin/offers/${offer.type}/${offer.id}`, { method: "DELETE" })
          notify.success("Offer deleted")
          await reloadAll().catch(() => {})
        } catch (error) {
          notify.error(error.message ?? "Could not delete offer")
          throw error
        }
      },
    })
  }

  const openNew = (type) => setEditor({ open: true, form: type ? emptyForm(type) : null })
  const openEdit = (offer) => setEditor({ open: true, form: formFromOffer(offer.type, offer) })

  async function changeSegment(segment) {
    try {
      setPreview(await authFetch(`/api/admin/offers/preview?membershipSegment=${segment}`))
    } catch (error) {
      notify.error(error.message ?? "Could not load preview")
    }
  }

  /* ---- preview data ---- */
  const previewServices = useMemo(() => {
    const q = previewSearch.trim().toLowerCase()
    return (preview.services ?? []).filter((s) => (!onlyDiscounted || Number(s.finalPrice) < Number(s.originalPrice)) && (!q || `${s.serviceName ?? ""}`.toLowerCase().includes(q)))
  }, [preview.services, previewSearch, onlyDiscounted])
  const previewCombos = useMemo(
    () =>
      (center.combos ?? [])
        .filter((c) => c.isActiveNow && (c.visibleSegments ?? []).includes(preview.segment))
        .map((c) => {
          const actual = (c.serviceIds ?? []).reduce((sum, id) => sum + Number(servicesById.get(id)?.basePrice ?? 0), 0)
          return { ...c, actual, savings: Math.max(0, actual - Number(c.offerPrice ?? 0)) }
        }),
    [center.combos, preview.segment, servicesById]
  )

  const d = center.dashboard ?? {}
  const firstLoad = loading && !offers.length

  return (
    <AdminLayout
      pageTitle="Offers"
      description="Discounts, combos, member prices"
      actions={
        <ButtonLoadingMorph icon={Plus} onClick={() => openNew(null)}>
          New offer
        </ButtonLoadingMorph>
      }
    >
      <div className="space-y-5">
        <ErrorBanner message={offers.length ? loadError : ""} onRetry={() => reloadAll()} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Percent} label="Live discounts" value={d.activeDiscounts ?? 0} tone="primary" loading={firstLoad && !loadError} />
          <StatCard icon={Gift} label="Live combos" value={d.activeCombos ?? 0} tone="info" loading={firstLoad && !loadError} />
          <StatCard icon={Crown} label="Member offers" value={(d.premiumOffers ?? 0) + (d.basicOffers ?? 0) + (d.freeOffers ?? 0)} tone="plum" loading={firstLoad && !loadError} />
          <StatCard icon={CalendarClock} label="Ending ≤ 3 days" value={d.expiringSoon ?? 0} tone={d.expiringSoon ? "warning" : "neutral"} loading={firstLoad && !loadError} />
        </div>

        <AnimatedTabBar
          label="View"
          items={[
            { value: "offers", label: "Offers", icon: Sparkles },
            { value: "preview", label: "Customer view", icon: Eye },
          ]}
          value={tab}
          onChange={setTab}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={spring.soft} className="space-y-4">
            {tab === "offers" ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <FilterTabs label="Offer type" options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} className="min-w-0" />
                  <label className="flex items-center gap-2.5 text-sm font-semibold">
                    <Switch checked={showEnded} onChange={setShowEnded} label="Show ended and off offers" />
                    Ended / off{hiddenCount ? <span className="rounded-full bg-muted px-2 text-caption font-bold tabular-nums">{hiddenCount}</span> : null}
                  </label>
                </div>

                {loadError && !offers.length ? (
                  <ErrorState title="Couldn't load offers" description={loadError} onRetry={() => reloadAll()} />
                ) : firstLoad ? (
                  <SkeletonCards count={3} />
                ) : !visibleOffers.length ? (
                  <EmptyState illustration="gift" title="No offers here" description={offers.length ? "Try another type or show ended." : "Create a discount or combo."} actionLabel="New offer" actionIcon={Plus} onAction={() => openNew(null)} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                      {visibleOffers.map((offer, index) => (
                        <OfferCard key={`${offer.type}-${offer.id}`} offer={offer} index={index} busy={busy} onToggle={toggleOffer} onEdit={openEdit} onDelete={deleteOffer} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <FilterTabs label="Customer type" options={SEGMENT_OPTIONS} value={preview.segment} onChange={(v) => void changeSegment(v)} />
                  <label className="relative block min-w-0 flex-1 sm:max-w-xs">
                    <span className="sr-only">Search services</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-neutral" aria-hidden />
                    <input value={previewSearch} onChange={(e) => setPreviewSearch(e.target.value)} placeholder="Search" className="h-11 w-full rounded-control bg-card pr-10 pl-10 text-sm shadow-soft ring-1 ring-inset ring-border/60 outline-none placeholder:text-ink-neutral focus-visible:ring-2 focus-visible:ring-portal" />
                    {previewSearch ? (
                      <button type="button" aria-label="Clear search" onClick={() => setPreviewSearch("")} className="tap absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-muted">
                        <X className="size-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-semibold">
                    <Switch checked={onlyDiscounted} onChange={setOnlyDiscounted} label="Only discounted services" />
                    <Percent className="size-4 text-ink-neutral" aria-hidden /> Discounted
                  </label>
                </div>

                <ol className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-ink-neutral" aria-label="Which offer wins, first to last">
                  {Object.entries(SOURCE_META).map(([key, m], i) => (
                    <li key={key} className="flex items-center gap-1.5">
                      <span className={cn("grid size-6 place-items-center rounded-lg ring-1 ring-inset", m.tone)}>
                        <m.icon className="size-3.5" aria-hidden />
                      </span>
                      {m.title}
                      {i < 3 ? <span aria-hidden>›</span> : null}
                    </li>
                  ))}
                </ol>

                {previewCombos.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {previewCombos.map((c) => (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="rounded-card border border-info/30 bg-info/8 p-4 shadow-soft">
                        <div className="flex items-center gap-2">
                          <span className={cn("grid size-9 place-items-center rounded-xl ring-1 ring-inset", TONE_CLASSES.info)}>
                            <Gift className="size-[18px]" aria-hidden />
                          </span>
                          <p className="truncate font-display font-semibold">{c.name}</p>
                        </div>
                        <p className="mt-3 flex items-baseline gap-2">
                          <span className="font-display text-2xl font-bold tabular-nums">{inr(c.offerPrice)}</span>
                          <span className="text-sm text-ink-neutral line-through tabular-nums">{inr(c.actual)}</span>
                          {c.savings ? (
                            <ToneChip tone="success" size="sm" className="ml-auto">
                              −{inr(c.savings)}
                            </ToneChip>
                          ) : null}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : null}

                {!previewServices.length && !previewCombos.length ? (
                  <EmptyState compact illustration="search" title="Nothing to show" description="No services match." />
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                      {previewServices.map((item, i) => (
                        <PreviewCard key={item.serviceId} item={item} index={i} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <OfferEditor open={editor.open} onOpenChange={(open) => setEditor((e) => ({ ...e, open }))} services={center.services ?? []} initial={editor.form} existingGlobal={center.globalDiscount} onSubmit={saveOffer} />
      {confirmSheet}
    </AdminLayout>
  )
}
