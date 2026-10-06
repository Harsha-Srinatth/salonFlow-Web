"use client"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { BorderBeam } from "border-beam"
import { CalendarClock, CalendarDays, Crown, Eye, Gift, Layers, Pencil, Percent, Plus, Search, Sparkles, Tag, Trash2, Users, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { AdminLayout } from "../portal/admin-layout"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/admin/components/confirm-dialog"
import { EmptyState } from "@/admin/components/empty-state"
import { ErrorBanner } from "@/admin/components/error-banner"
import { emptyForm, formFromOffer, OfferEditor, payloadFromForm, SEGMENT_META, TYPE_META } from "@/admin/components/offer-editor"
import { Switch } from "@/admin/components/service-editor-drawer"
import { StatCard } from "@/admin/components/stat-card"
import { SegmentedControl } from "@/components/fx/segmented-control"
import { LoadingOrb } from "@/components/shared/loading-orb"
import { getFirebaseIdToken } from "@/lib/auth/auth-client"
import { toApiUrl } from "@/lib/api-base"
import { connectAdminBookingsSocket, disconnectAdminBookingsSocket } from "@/lib/realtime/admin-bookings-socket"
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

const inr = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString("en-IN")}`
const dayLabel = (iso) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" })

const STATUS = {
  live: { label: "Live", dot: "bg-success", text: "text-success" },
  scheduled: { label: "Soon", dot: "bg-chart-3", text: "text-chart-3" },
  ended: { label: "Ended", dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
  off: { label: "Off", dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
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

const TYPE_FILTERS = [
  { value: "ALL", label: "All", icon: Layers },
  ...Object.entries(TYPE_META).map(([value, m]) => ({ value, label: m.label, icon: m.icon })),
]
const SEGMENT_OPTIONS = Object.entries(SEGMENT_META).map(([value, m]) => ({ value, label: m.label, icon: m.icon }))

const SOURCE_META = {
  MEMBERSHIP_OFFER: { icon: Crown, title: "Member offer", tone: "bg-accent/15 text-accent" },
  COMBO_OFFER: { icon: Gift, title: "Combo", tone: "bg-chart-4/15 text-chart-4" },
  SERVICE_DISCOUNT: { icon: Tag, title: "Service offer", tone: "bg-chart-3/15 text-chart-3" },
  GLOBAL_DISCOUNT: { icon: Percent, title: "Sitewide offer", tone: "bg-primary/10 text-primary" },
}

function OfferCard({ offer, index, busy, onToggle, onEdit, onDelete }) {
  const meta = TYPE_META[offer.type]
  const Icon = meta.icon
  const st = STATUS[offer.status]
  const seg = offer.type === "MEMBERSHIP" ? SEGMENT_META[offer.membershipSegment] : null
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay: Math.min(index, 8) * 0.03 }}
      whileHover={{ y: -3 }}
      className={cn("admin-shadow-sm flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4", (offer.status === "ended" || offer.status === "off") && "opacity-70")}
    >
      <div className="flex items-start justify-between gap-3">
        <span title={meta.label} className={cn("grid size-11 shrink-0 place-items-center rounded-xl", meta.tone)}>
          <Icon className="size-5" />
        </span>
        <div className="text-right">
          <p className="font-display text-3xl font-bold leading-none tracking-tight">{offer.type === "COMBO" ? inr(offer.offerPrice) : `${offer.discountPercent}%`}</p>
          {offer.type === "COMBO" && offer.savings ? <p className="mt-1 text-xs font-semibold text-success">Saves {inr(offer.savings)}</p> : offer.type !== "COMBO" ? <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">off</p> : null}
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="truncate font-display text-base font-semibold leading-tight">{offer.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {seg ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
              <seg.icon className="size-3" /> {seg.label}
            </span>
          ) : null}
          {offer.type === "COMBO" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Layers className="size-3" /> {offer.serviceCount}
            </span>
          ) : null}
          {offer.type === "COMBO" ? (
            <span className="inline-flex items-center gap-1">
              {(offer.visibleSegments ?? []).map((s) => {
                const SegIcon = SEGMENT_META[s]?.icon ?? Users
                return <SegIcon key={s} title={SEGMENT_META[s]?.label} className="size-3.5 text-muted-foreground" />
              })}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div className="min-w-0 space-y-0.5">
          <p className={cn("flex items-center gap-1.5 text-xs font-semibold", st.text)}>
            <span className={cn("size-1.5 rounded-full", st.dot, offer.status === "live" && "admin-live-dot relative text-success")} /> {st.label}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" /> {whenLabel(offer, offer.status)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Switch checked={offer.isEnabled} onChange={() => onToggle(offer)} label={offer.isEnabled ? "Turn off" : "Turn on"} />
          <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${offer.title}`} disabled={busy} onClick={() => onEdit(offer)}>
            <Pencil className="size-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label={`Delete ${offer.title}`} disabled={busy} onClick={() => onDelete(offer)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
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
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(index, 10) * 0.02 }} className="admin-shadow-sm flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
      <span title={src?.title ?? "No offer"} className={cn("grid size-10 shrink-0 place-items-center rounded-xl", src?.tone ?? "bg-muted text-muted-foreground")}>
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.serviceName}</p>
        <p className="flex items-baseline gap-2 text-sm">
          <span className="font-bold tabular-nums">{inr(item.finalPrice)}</span>
          {discounted ? <span className="text-xs text-muted-foreground line-through tabular-nums">{inr(item.originalPrice)}</span> : null}
        </p>
      </div>
      {discounted ? <span className="shrink-0 rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success">-{Math.round(item.appliedPercent)}%</span> : null}
    </motion.div>
  )
}

export default function OfferCenterPage() {
  const { confirm, confirmDialog } = useConfirm()
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
      const message = error.message ?? "Could not load offers"
      toast.error(message)
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    previewSegmentRef.current = preview.segment || "FREE"
  }, [preview.segment])

  useEffect(() => {
    void reloadAll("FREE")
    void getFirebaseIdToken()
      .catch(() => null)
      .then((token) =>
        connectAdminBookingsSocket({
          token,
          onOfferUpdated: (payload) => {
            const segment = previewSegmentRef.current || "FREE"
            if (payload?.center) setCenter(payload.center)
            if (payload?.previews?.[segment]) {
              setPreview(payload.previews[segment])
              return
            }
            void reloadAll(segment)
          },
        })
      )
    return () => disconnectAdminBookingsSocket()
  }, [reloadAll])

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
    return offers
      .filter((o) => (typeFilter === "ALL" || o.type === typeFilter) && (showEnded || (o.status !== "ended" && o.status !== "off")))
      .sort((a, b) => rank[a.status] - rank[b.status])
  }, [offers, typeFilter, showEnded])

  const hiddenCount = offers.filter((o) => (typeFilter === "ALL" || o.type === typeFilter) && (o.status === "ended" || o.status === "off")).length

  /* ---- actions ---- */
  async function saveOffer(form) {
    const payload = payloadFromForm(form)
    if (form.id) {
      await authFetch(`/api/admin/offers/${form.type}/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      toast.success("Offer updated")
    } else {
      const path = { GLOBAL: "global", SERVICE: "service", MEMBERSHIP: "membership", COMBO: "combos" }[form.type]
      const data = await authFetch(`/api/admin/offers/${path}`, { method: "POST", body: JSON.stringify(payload) })
      if (data.warning) toast.message(data.warning)
      toast.success("Offer created")
    }
    await reloadAll()
  }

  async function toggleOffer(offer) {
    setBusy(true)
    try {
      const form = { ...formFromOffer(offer.type, offer), isEnabled: !offer.isEnabled }
      await authFetch(`/api/admin/offers/${offer.type}/${offer.id}`, { method: "PATCH", body: JSON.stringify(payloadFromForm(form)) })
      toast.success(form.isEnabled ? "Offer is live" : "Offer turned off")
      await reloadAll()
    } catch (error) {
      toast.error(error.message ?? "Could not update offer")
    } finally {
      setBusy(false)
    }
  }

  async function deleteOffer(offer) {
    const ok = await confirm({ title: `Delete "${offer.title}"?`, description: "Customers stop seeing it right away.", confirmLabel: "Delete", hold: true })
    if (!ok) return
    setBusy(true)
    try {
      await authFetch(`/api/admin/offers/${offer.type}/${offer.id}`, { method: "DELETE" })
      toast.success("Offer deleted")
      await reloadAll()
    } catch (error) {
      toast.error(error.message ?? "Could not delete offer")
    } finally {
      setBusy(false)
    }
  }

  const openNew = (type) => setEditor({ open: true, form: type ? emptyForm(type) : null })
  const openEdit = (offer) => setEditor({ open: true, form: formFromOffer(offer.type, offer) })

  async function changeSegment(segment) {
    try {
      setPreview(await authFetch(`/api/admin/offers/preview?membershipSegment=${segment}`))
    } catch (error) {
      toast.error(error.message ?? "Could not load preview")
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

  return (
    <AdminLayout
      pageTitle="Offer Center"
      description="Discounts, combos and member pricing."
      actions={
        <BorderBeam size="sm">
          <Button type="button" onClick={() => openNew(null)}>
            <Plus className="size-4" /> New offer
          </Button>
        </BorderBeam>
      }
    >
      <div className="space-y-5">
        <ErrorBanner message={loadError} onRetry={() => void reloadAll()} />

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <StatCard icon={Percent} label="Live discounts" value={d.activeDiscounts ?? 0} tone="primary" />
          <StatCard icon={Gift} label="Live combos" value={d.activeCombos ?? 0} tone="accent" delay={40} />
          <StatCard icon={Crown} label="Member offers" value={(d.premiumOffers ?? 0) + (d.basicOffers ?? 0) + (d.freeOffers ?? 0)} tone="success" delay={80} />
          <StatCard icon={CalendarClock} label="Ending in 3 days" value={d.expiringSoon ?? 0} tone={d.expiringSoon ? "destructive" : "neutral"} delay={120} />
        </div>

        <SegmentedControl
          label="View"
          options={[
            { value: "offers", label: "Offers", icon: Sparkles },
            { value: "preview", label: "Customer view", icon: Eye },
          ]}
          value={tab}
          onChange={setTab}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-4">
            {tab === "offers" ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="max-w-full overflow-x-auto pb-1">
                    <SegmentedControl label="Offer type" options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch checked={showEnded} onChange={setShowEnded} label="Show ended and off" />
                    Ended{hiddenCount ? <span className="rounded-full bg-muted px-1.5 text-xs font-semibold">{hiddenCount}</span> : null}
                  </label>
                </div>

                {loading && !offers.length ? (
                  <LoadingOrb compact label="Loading offers…" />
                ) : !visibleOffers.length ? (
                  <EmptyState icon={Percent} title="No offers here" description={offers.length ? "Try another type, or show ended offers." : "Create your first discount or combo."} actionLabel="New offer" onAction={() => openNew(null)} />
                ) : (
                  <LayoutGroup>
                    <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <AnimatePresence mode="popLayout">
                        {visibleOffers.map((offer, index) => (
                          <OfferCard key={`${offer.type}-${offer.id}`} offer={offer} index={index} busy={busy} onToggle={toggleOffer} onEdit={openEdit} onDelete={deleteOffer} />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </LayoutGroup>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <SegmentedControl label="Customer type" options={SEGMENT_OPTIONS} value={preview.segment} onChange={(v) => void changeSegment(v)} />
                  <div className="relative min-w-0 flex-1 sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={previewSearch} onChange={(e) => setPreviewSearch(e.target.value)} placeholder="Search" aria-label="Search services" className="h-10 w-full rounded-xl border bg-card pl-9 pr-8 text-sm outline-none" />
                    {previewSearch ? (
                      <button type="button" aria-label="Clear" onClick={() => setPreviewSearch("")} className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-muted">
                        <X className="size-3" />
                      </button>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch checked={onlyDiscounted} onChange={setOnlyDiscounted} label="Only discounted" />
                    <Percent className="size-4" />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Priority order">
                  <span className="font-semibold uppercase tracking-wide">Applied first →</span>
                  {Object.entries(SOURCE_META).map(([key, m], i) => (
                    <span key={key} className="flex items-center gap-1.5">
                      <span className={cn("grid size-5 place-items-center rounded-md", m.tone)}>
                        <m.icon className="size-3" />
                      </span>
                      {m.title}
                      {i < 3 ? <span aria-hidden>›</span> : null}
                    </span>
                  ))}
                </div>

                {previewCombos.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {previewCombos.map((c) => (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="admin-shadow-sm rounded-2xl border border-chart-4/30 bg-chart-4/5 p-4">
                        <div className="flex items-center gap-2">
                          <span className="grid size-9 place-items-center rounded-xl bg-chart-4/15 text-chart-4">
                            <Gift className="size-[18px]" />
                          </span>
                          <p className="truncate font-display font-semibold">{c.name}</p>
                        </div>
                        <p className="mt-3 flex items-baseline gap-2">
                          <span className="font-display text-2xl font-bold tabular-nums">{inr(c.offerPrice)}</span>
                          <span className="text-sm text-muted-foreground line-through tabular-nums">{inr(c.actual)}</span>
                          {c.savings ? <span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">-{inr(c.savings)}</span> : null}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : null}

                {!previewServices.length && !previewCombos.length ? (
                  <EmptyState icon={Eye} compact title="Nothing to show" description="No services match." />
                ) : (
                  <motion.div layout className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                      {previewServices.map((item, i) => (
                        <PreviewCard key={item.serviceId} item={item} index={i} />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <OfferEditor
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        services={center.services ?? []}
        initial={editor.form}
        existingGlobal={center.globalDiscount}
        onSubmit={saveOffer}
      />
      {confirmDialog}
    </AdminLayout>
  )
}
