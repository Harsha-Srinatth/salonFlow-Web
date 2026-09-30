import { AdminLayout } from "../portal/admin-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ErrorBanner } from "@/admin/components/error-banner"
import { StatCard } from "@/admin/components/stat-card"
import { StatusPill } from "@/admin/components/status-pill"
import { useRevealOnReady } from "@/admin/lib/motion"
import { getFirebaseIdToken } from "@/lib/auth/auth-client"
import { toApiUrl } from "@/lib/api-base"
import { connectAdminBookingsSocket, disconnectAdminBookingsSocket } from "@/lib/realtime/admin-bookings-socket"
import { BadgePercent, CalendarClock, Gift, Layers, Percent, Sparkles, Tags, Users } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

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

export default function OfferCenterPage() {
  const [center, setCenter] = useState({ services: [], serviceDiscounts: [], membershipDiscounts: [], combos: [], dashboard: {} })
  const [calendarEvents, setCalendarEvents] = useState([])
  const [preview, setPreview] = useState({ segment: "FREE", services: [], combos: [] })
  const [loading, setLoading] = useState(false)
  const [globalForm, setGlobalForm] = useState({ discountPercent: "20", startAt: "", endAt: "", isEnabled: true })
  const [serviceForm, setServiceForm] = useState({ serviceId: "", discountPercent: "", startAt: "", endAt: "", isEnabled: true })
  const [membershipForm, setMembershipForm] = useState({ serviceId: "", membershipSegment: "PREMIUM", discountPercent: "", startAt: "", endAt: "", isEnabled: true })
  const [comboForm, setComboForm] = useState({ name: "", description: "", category: "MEN", offerPrice: "", serviceIds: [], visibleSegments: ["FREE", "BASIC", "PREMIUM"], startAt: "", endAt: "", isEnabled: true })
  const [previewSourceFilter, setPreviewSourceFilter] = useState("ALL")
  const [previewSearch, setPreviewSearch] = useState("")
  const [previewOnlyDiscounted, setPreviewOnlyDiscounted] = useState(true)
  const [calendarTypeFilter, setCalendarTypeFilter] = useState("ALL")
  const [calendarOnlyActive, setCalendarOnlyActive] = useState(true)
  const [editOffer, setEditOffer] = useState(null)
  const [loadError, setLoadError] = useState("")
  const previewSegmentRef = useRef("FREE")
  const previewGridRef = useRevealOnReady([loading], { selector: ":scope > *" })
  const calendarListRef = useRevealOnReady([loading], { selector: ":scope > *" })

  async function reloadAll(segment = preview.segment || "FREE") {
    setLoading(true)
    try {
      const [centerData, calendarData, previewData] = await Promise.all([
        authFetch("/api/admin/offers/center"),
        authFetch("/api/admin/offers/calendar"),
        authFetch(`/api/admin/offers/preview?membershipSegment=${segment}`),
      ])
      setCenter(centerData)
      setCalendarEvents(calendarData.events ?? [])
      setPreview(previewData)
      setLoadError("")
    } catch (error) {
      const message = error.message ?? "Could not load offers"
      toast.error(message)
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }

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
            if (Array.isArray(payload?.events)) setCalendarEvents(payload.events)
            if (payload?.previews && payload.previews[segment]) {
              setPreview(payload.previews[segment])
              return
            }
            void reloadAll(segment)
          },
        })
      )
    return () => {
      disconnectAdminBookingsSocket()
    }
  }, [])

  const servicesMap = useMemo(() => new Map((center.services ?? []).map((service) => [service.id, service])), [center.services])
  const previewServices = preview.services ?? []
  const activeCombos = useMemo(
    () => (center.combos ?? []).filter((combo) => combo.isActiveNow),
    [center.combos]
  )
  const enrichedCombos = useMemo(
    () =>
      activeCombos.map((combo) => {
        const actualPrice = (combo.serviceIds ?? []).reduce(
          (sum, serviceId) => sum + Number(servicesMap.get(serviceId)?.basePrice ?? 0),
          0
        )
        const offerPrice = Number(combo.offerPrice ?? 0)
        return {
          ...combo,
          actualPrice,
          savings: Math.max(0, actualPrice - offerPrice),
        }
      }),
    [activeCombos, servicesMap]
  )
  const previewSummary = useMemo(() => {
    const counts = { MEMBERSHIP_OFFER: 0, COMBO_OFFER: 0, SERVICE_DISCOUNT: 0, GLOBAL_DISCOUNT: 0, NONE: 0 }
    for (const item of previewServices) {
      const source = `${item.source ?? "NONE"}`.toUpperCase()
      counts[source] = (counts[source] ?? 0) + 1
    }
    counts.COMBO_OFFER = enrichedCombos.length
    return counts
  }, [enrichedCombos.length, previewServices])
  const filteredPreviewServices = useMemo(() => {
    const query = previewSearch.trim().toLowerCase()
    return previewServices.filter((item) => {
      const source = `${item.source ?? "NONE"}`.toUpperCase()
      if (previewSourceFilter === "COMBO_OFFER") return false
      if (previewOnlyDiscounted && source === "NONE") return false
      if (previewSourceFilter !== "ALL" && source !== previewSourceFilter) return false
      if (query && !`${item.serviceName ?? ""}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [previewOnlyDiscounted, previewSearch, previewServices, previewSourceFilter])
  const previewSegmentLabels = [
    { value: "FREE", label: "Free Customer" },
    { value: "BASIC", label: "Basic Member" },
    { value: "PREMIUM", label: "Premium Member" },
  ]
  const combosByPreviewSegment = useMemo(() => {
    const query = previewSearch.trim().toLowerCase()
    if (previewSourceFilter !== "ALL" && previewSourceFilter !== "COMBO_OFFER") {
      return Object.fromEntries(previewSegmentLabels.map(({ value }) => [value, []]))
    }
    return Object.fromEntries(
      previewSegmentLabels.map(({ value }) => [
        value,
        enrichedCombos.filter((combo) => {
          if (!(combo.visibleSegments ?? []).includes(value)) return false
          if (query && !`${combo.name ?? ""}`.toLowerCase().includes(query)) return false
          return true
        }),
      ])
    )
  }, [enrichedCombos, previewSearch, previewSourceFilter])
  const calendarGroups = useMemo(() => {
    const now = Date.now()
    const map = { GLOBAL: [], SERVICE: [], MEMBERSHIP: [], COMBO: [], OTHER: [] }
    for (const event of calendarEvents ?? []) {
      const type = `${event?.type ?? "OTHER"}`.toUpperCase()
      const startMs = event?.startAt ? new Date(event.startAt).getTime() : null
      const endMs = event?.endAt ? new Date(event.endAt).getTime() : null
      const isActive = (startMs === null || now >= startMs) && (endMs === null || now <= endMs)
      if (calendarOnlyActive && !isActive) continue
      if (calendarTypeFilter !== "ALL" && type !== calendarTypeFilter) continue
      const bucket = map[type] ? type : "OTHER"
      map[bucket].push({ ...event, isActive })
    }
    return map
  }, [calendarEvents, calendarOnlyActive, calendarTypeFilter])

  function formatOfferSource(source) {
    const value = `${source ?? "NONE"}`.toUpperCase()
    if (value === "MEMBERSHIP_OFFER") return "Membership Offer"
    if (value === "COMBO_OFFER") return "Combo Offer"
    if (value === "SERVICE_DISCOUNT") return "Service Discount"
    if (value === "GLOBAL_DISCOUNT") return "Global Discount"
    return "No Offer"
  }

  function formatCalendarType(type) {
    const value = `${type ?? ""}`.toUpperCase()
    if (value === "GLOBAL") return "Global Offers"
    if (value === "SERVICE") return "Service Offers"
    if (value === "MEMBERSHIP") return "Membership Offers"
    if (value === "COMBO") return "Combo Offers"
    return "Other Offers"
  }

  async function submitGlobal() {
    try {
      const data = await authFetch("/api/admin/offers/global", { method: "POST", body: JSON.stringify({ ...globalForm, discountPercent: Number(globalForm.discountPercent ?? 0) }) })
      if (data.warning) toast.warning(data.warning)
      setCenter(data.center ?? center)
      toast.success("Global discount updated")
    } catch (error) {
      toast.error(error.message ?? "Could not save global discount")
    }
  }

  async function submitServiceDiscount() {
    if (!serviceForm.serviceId) {
      toast.error("Please select a service")
      return
    }
    try {
      const data = await authFetch("/api/admin/offers/service", { method: "POST", body: JSON.stringify({ ...serviceForm, discountPercent: Number(serviceForm.discountPercent ?? 0) }) })
      setCenter(data.center ?? center)
      setServiceForm({ serviceId: "", discountPercent: "", startAt: "", endAt: "", isEnabled: true })
      toast.success("Service discount added")
    } catch (error) {
      toast.error(error.message ?? "Could not save service discount")
    }
  }

  async function submitMembershipDiscount() {
    try {
      const data = await authFetch("/api/admin/offers/membership", { method: "POST", body: JSON.stringify({ ...membershipForm, discountPercent: Number(membershipForm.discountPercent ?? 0) }) })
      setCenter(data.center ?? center)
      toast.success("Membership discount added")
    } catch (error) {
      toast.error(error.message ?? "Could not save membership discount")
    }
  }

  async function submitCombo() {
    try {
      const data = await authFetch("/api/admin/offers/combos", { method: "POST", body: JSON.stringify({ ...comboForm, offerPrice: Number(comboForm.offerPrice ?? 0) }) })
      setCenter(data.center ?? center)
      toast.success("Combo offer added")
    } catch (error) {
      toast.error(error.message ?? "Could not save combo offer")
    }
  }

  async function loadPreview(segment) {
    const next = await authFetch(`/api/admin/offers/preview?membershipSegment=${segment}`)
    setPreview(next)
  }

  async function deleteOffer(event) {
    const type = `${event?.type ?? ""}`.trim().toUpperCase()
    const id = `${event?.id ?? ""}`.trim()
    if (!type || !id) return
    try {
      await authFetch(`/api/admin/offers/${type}/${id}`, { method: "DELETE" })
      toast.success("Offer deleted")
    } catch (error) {
      toast.error(error.message ?? "Could not delete offer")
    }
  }

  function startEditOffer(event) {
    const type = `${event?.type ?? ""}`.toUpperCase()
    if (type === "GLOBAL") {
      const global = center.globalDiscount
      if (!global?.id) return
      setEditOffer({
        type: "GLOBAL",
        id: global.id,
        discountPercent: `${global.discountPercent ?? 0}`,
        startAt: global.startAt ? new Date(global.startAt).toISOString().slice(0, 16) : "",
        endAt: global.endAt ? new Date(global.endAt).toISOString().slice(0, 16) : "",
        isEnabled: Boolean(global.isEnabled),
      })
      return
    }
    if (type === "SERVICE") {
      const item = (center.serviceDiscounts ?? []).find((row) => row.id === event.id)
      if (!item) return
      setEditOffer({
        type: "SERVICE",
        id: item.id,
        serviceId: item.serviceId,
        discountPercent: `${item.discountPercent ?? 0}`,
        startAt: item.startAt ? new Date(item.startAt).toISOString().slice(0, 16) : "",
        endAt: item.endAt ? new Date(item.endAt).toISOString().slice(0, 16) : "",
        isEnabled: Boolean(item.isEnabled),
      })
      return
    }
    if (type === "MEMBERSHIP") {
      const item = (center.membershipDiscounts ?? []).find((row) => row.id === event.id)
      if (!item) return
      setEditOffer({
        type: "MEMBERSHIP",
        id: item.id,
        serviceId: item.serviceId,
        membershipSegment: item.membershipSegment,
        discountPercent: `${item.discountPercent ?? 0}`,
        startAt: item.startAt ? new Date(item.startAt).toISOString().slice(0, 16) : "",
        endAt: item.endAt ? new Date(item.endAt).toISOString().slice(0, 16) : "",
        isEnabled: Boolean(item.isEnabled),
      })
      return
    }
    if (type === "COMBO") {
      const item = (center.combos ?? []).find((row) => row.id === event.id)
      if (!item) return
      setEditOffer({
        type: "COMBO",
        id: item.id,
        name: item.name ?? "",
        description: item.description ?? "",
        category: item.category ?? "MEN",
        offerPrice: `${item.offerPrice ?? 0}`,
        serviceIds: Array.isArray(item.serviceIds) ? item.serviceIds : [],
        visibleSegments: Array.isArray(item.visibleSegments) ? item.visibleSegments : ["FREE", "BASIC", "PREMIUM"],
        startAt: item.startAt ? new Date(item.startAt).toISOString().slice(0, 16) : "",
        endAt: item.endAt ? new Date(item.endAt).toISOString().slice(0, 16) : "",
        isEnabled: Boolean(item.isEnabled),
      })
    }
  }

  async function saveEditedOffer() {
    if (!editOffer?.type || !editOffer?.id) return
    if (editOffer.type === "COMBO" && !(editOffer.visibleSegments ?? []).length) {
      toast.error("Select at least one membership plan for combo visibility")
      return
    }
    try {
      const payload = { ...editOffer }
      delete payload.type
      delete payload.id
      if (payload.discountPercent !== undefined) payload.discountPercent = Number(payload.discountPercent ?? 0)
      if (payload.offerPrice !== undefined) payload.offerPrice = Number(payload.offerPrice ?? 0)
      await authFetch(`/api/admin/offers/${editOffer.type}/${editOffer.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      toast.success("Offer updated")
      setEditOffer(null)
    } catch (error) {
      toast.error(error.message ?? "Could not update offer")
    }
  }

  return (
    <AdminLayout pageTitle="Offer Center" description="Discounts, combos, and membership pricing in one place.">
      <div className="space-y-4">
        <ErrorBanner message={loadError} onRetry={() => void reloadAll()} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard icon={BadgePercent} label="Active Discounts" value={center.dashboard?.activeDiscounts ?? 0} tone="primary" />
          <StatCard icon={Layers} label="Active Combos" value={center.dashboard?.activeCombos ?? 0} tone="accent" delay={40} />
          <StatCard icon={CalendarClock} label="Expiring Soon" value={center.dashboard?.expiringSoon ?? 0} tone="destructive" delay={80} />
          <StatCard icon={Sparkles} label="Premium Offers" value={center.dashboard?.premiumOffers ?? 0} tone="accent" delay={120} />
          <StatCard icon={Tags} label="Basic Offers" value={center.dashboard?.basicOffers ?? 0} tone="primary" delay={160} />
          <StatCard icon={Users} label="Free Offers" value={center.dashboard?.freeOffers ?? 0} tone="neutral" delay={200} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="admin-shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><Percent className="size-4 text-primary" />Global Service Discount</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Label>Discount %</Label>
              <Input type="number" min="0" max="100" value={globalForm.discountPercent} onChange={(e) => setGlobalForm((v) => ({ ...v, discountPercent: e.target.value }))} />
              <Label>Effective Date</Label>
              <Input type="datetime-local" value={globalForm.startAt} onChange={(e) => setGlobalForm((v) => ({ ...v, startAt: e.target.value }))} />
              <Label>Expiry Date</Label>
              <Input type="datetime-local" value={globalForm.endAt} onChange={(e) => setGlobalForm((v) => ({ ...v, endAt: e.target.value }))} />
              <Button onClick={() => void submitGlobal()} disabled={loading}>Save Global Discount</Button>
              <p className="text-xs text-muted-foreground">Affected services: {(center.services ?? []).map((service) => service.name).join(", ")}</p>
            </CardContent>
          </Card>

          <Card className="admin-shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><Tags className="size-4 text-primary" />Individual Service Discount</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Label>Service</Label>
              <Select value={serviceForm.serviceId} onValueChange={(value) => setServiceForm((v) => ({ ...v, serviceId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>{(center.services ?? []).map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}</SelectContent>
              </Select>
              <Label>Discount %</Label>
              <Input type="number" min="0" max="100" value={serviceForm.discountPercent} onChange={(e) => setServiceForm((v) => ({ ...v, discountPercent: e.target.value }))} />
              <Label>Start</Label>
              <Input type="datetime-local" value={serviceForm.startAt} onChange={(e) => setServiceForm((v) => ({ ...v, startAt: e.target.value }))} />
              <Label>End</Label>
              <Input type="datetime-local" value={serviceForm.endAt} onChange={(e) => setServiceForm((v) => ({ ...v, endAt: e.target.value }))} />
              {serviceForm.serviceId ? (
                <div className="text-xs text-muted-foreground">
                  Original: Rs {Number(servicesMap.get(serviceForm.serviceId)?.basePrice ?? 0).toFixed(2)} | Discounted: Rs{" "}
                  {Math.max(0, Number(servicesMap.get(serviceForm.serviceId)?.basePrice ?? 0) * (1 - Number(serviceForm.discountPercent || 0) / 100)).toFixed(2)}
                </div>
              ) : null}
              <Button onClick={() => void submitServiceDiscount()} disabled={loading}>Add Service Discount</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="admin-shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-4 text-primary" />Membership-Specific Discount</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Label>Service</Label>
              <Select value={membershipForm.serviceId} onValueChange={(value) => setMembershipForm((v) => ({ ...v, serviceId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>{(center.services ?? []).map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}</SelectContent>
              </Select>
              <Label>Membership Type</Label>
              <Select value={membershipForm.membershipSegment} onValueChange={(value) => setMembershipForm((v) => ({ ...v, membershipSegment: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="BASIC">Basic</SelectItem>
                  <SelectItem value="PREMIUM">Premium</SelectItem>
                </SelectContent>
              </Select>
              <Label>Discount %</Label>
              <Input type="number" min="0" max="100" value={membershipForm.discountPercent} onChange={(e) => setMembershipForm((v) => ({ ...v, discountPercent: e.target.value }))} />
              <Label>Start</Label>
              <Input type="datetime-local" value={membershipForm.startAt} onChange={(e) => setMembershipForm((v) => ({ ...v, startAt: e.target.value }))} />
              <Label>End</Label>
              <Input type="datetime-local" value={membershipForm.endAt} onChange={(e) => setMembershipForm((v) => ({ ...v, endAt: e.target.value }))} />
              <Button onClick={() => void submitMembershipDiscount()} disabled={loading}>Add Membership Discount</Button>
            </CardContent>
          </Card>

          <Card className="admin-shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="size-4 text-primary" />Combo Offer Builder</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Label>Combo Name</Label>
              <Input value={comboForm.name} onChange={(e) => setComboForm((v) => ({ ...v, name: e.target.value }))} />
              <Label>Description</Label>
              <Input value={comboForm.description} onChange={(e) => setComboForm((v) => ({ ...v, description: e.target.value }))} />
              <Label>Category</Label>
              <Select value={comboForm.category} onValueChange={(value) => setComboForm((v) => ({ ...v, category: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEN">Men</SelectItem>
                  <SelectItem value="WOMEN">Women</SelectItem>
                  <SelectItem value="CHILDREN">Children</SelectItem>
                </SelectContent>
              </Select>
              <Label>Offer Price</Label>
              <Input type="number" value={comboForm.offerPrice} onChange={(e) => setComboForm((v) => ({ ...v, offerPrice: e.target.value }))} />
              <Label>Start</Label>
              <Input type="datetime-local" value={comboForm.startAt} onChange={(e) => setComboForm((v) => ({ ...v, startAt: e.target.value }))} />
              <Label>End</Label>
              <Input type="datetime-local" value={comboForm.endAt} onChange={(e) => setComboForm((v) => ({ ...v, endAt: e.target.value }))} />
              <Label>Services (click to toggle)</Label>
              <div className="flex flex-wrap gap-2">
                {(center.services ?? []).map((service) => {
                  const selected = comboForm.serviceIds.includes(service.id)
                  return (
                    <Button
                      key={service.id}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      onClick={() =>
                        setComboForm((v) => ({
                          ...v,
                          serviceIds: selected ? v.serviceIds.filter((id) => id !== service.id) : [...v.serviceIds, service.id],
                        }))
                      }
                    >
                      {service.name}
                    </Button>
                  )
                })}
              </div>
              <Label>Visible to Membership</Label>
              <div className="flex gap-2">
                {["FREE", "BASIC", "PREMIUM"].map((segment) => (
                  <Button
                    key={segment}
                    type="button"
                    size="sm"
                    variant={comboForm.visibleSegments.includes(segment) ? "default" : "outline"}
                    onClick={() =>
                      setComboForm((v) => ({
                        ...v,
                        visibleSegments: v.visibleSegments.includes(segment)
                          ? v.visibleSegments.filter((item) => item !== segment)
                          : [...v.visibleSegments, segment],
                      }))
                    }
                  >
                    {segment}
                  </Button>
                ))}
              </div>
              <Button onClick={() => void submitCombo()} disabled={loading}>Create Combo</Button>
            </CardContent>
          </Card>
        </div>

        <Card className="admin-shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" />Offer Preview & Priority</CardTitle>
            <Select value={preview.segment} onValueChange={(value) => void loadPreview(value)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">Free Customer</SelectItem>
                <SelectItem value="BASIC">Basic Member</SelectItem>
                <SelectItem value="PREMIUM">Premium Member</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Priority: Membership Offer → Combo Offer → Service Discount → Global Discount</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Membership: {previewSummary.MEMBERSHIP_OFFER}</Badge>
              <Badge variant="outline">Combo: {previewSummary.COMBO_OFFER}</Badge>
              <Badge variant="outline">Service: {previewSummary.SERVICE_DISCOUNT}</Badge>
              <Badge variant="outline">Global: {previewSummary.GLOBAL_DISCOUNT}</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder="Search service name"
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
              />
              <Select value={previewSourceFilter} onValueChange={setPreviewSourceFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Offer Types</SelectItem>
                  <SelectItem value="MEMBERSHIP_OFFER">Membership Offer</SelectItem>
                  <SelectItem value="COMBO_OFFER">Combo Offer</SelectItem>
                  <SelectItem value="SERVICE_DISCOUNT">Service Discount</SelectItem>
                  <SelectItem value="GLOBAL_DISCOUNT">Global Discount</SelectItem>
                  <SelectItem value="NONE">No Offer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant={previewOnlyDiscounted ? "default" : "outline"}
                onClick={() => setPreviewOnlyDiscounted((value) => !value)}
                disabled={previewSourceFilter === "COMBO_OFFER"}
              >
                {previewOnlyDiscounted ? "Showing Discounted Only" : "Showing All Services"}
              </Button>
            </div>
            <div ref={previewGridRef} className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredPreviewServices.map((service) => (
                <div key={service.serviceId} className="admin-card-hover admin-shadow-sm rounded-lg border border-border/70 bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{service.serviceName}</p>
                    <Badge variant="secondary">{formatOfferSource(service.source)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Original: Rs {service.originalPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Final: Rs {service.finalPrice.toFixed(2)} ({service.appliedPercent}% OFF)
                  </p>
                </div>
              ))}
            </div>
            {!filteredPreviewServices.length ? (
              <p className="text-xs text-muted-foreground">No services match current preview filters.</p>
            ) : null}
            <div className="pt-2 space-y-4">
              <p className="text-sm font-semibold">Combo offers by customer plan</p>
              <p className="text-xs text-muted-foreground">
                All active combos grouped by who can see them. Service pricing above still follows the selected customer type.
              </p>
              {previewSegmentLabels.map(({ value, label }) => {
                const segmentCombos = combosByPreviewSegment[value] ?? []
                return (
                  <div key={value} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{label}</p>
                      <Badge variant="outline">{segmentCombos.length} combo(s)</Badge>
                    </div>
                    {segmentCombos.length ? (
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {segmentCombos.map((combo) => (
                          <div key={`${value}-${combo.id}`} className="admin-card-hover admin-shadow-sm rounded-lg border border-border/70 bg-card p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium">{combo.name}</p>
                              <Badge variant="secondary">Combo Offer</Badge>
                            </div>
                            <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                              Visible to: {(combo.visibleSegments ?? []).join(", ") || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">{combo.category}</p>
                            <p className="text-xs text-muted-foreground">Actual: Rs {Number(combo.actualPrice ?? 0).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Offer: Rs {Number(combo.offerPrice ?? 0).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Savings: Rs {Number(combo.savings ?? 0).toFixed(2)}</p>
                            <p className="text-xs">Start: {combo.startAt ? new Date(combo.startAt).toLocaleString() : "N/A"}</p>
                            <p className="text-xs">End: {combo.endAt ? new Date(combo.endAt).toLocaleString() : "N/A"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No combos visible for this plan.</p>
                    )}
                  </div>
                )
              })}
              {!enrichedCombos.length ? (
                <p className="text-xs text-muted-foreground">No active combo offers in the calendar.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="admin-shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-primary" />Offer Calendar</CardTitle>
            <div className="grid gap-2 md:grid-cols-3">
              <Select value={calendarTypeFilter} onValueChange={setCalendarTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="GLOBAL">Global</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                  <SelectItem value="MEMBERSHIP">Membership</SelectItem>
                  <SelectItem value="COMBO">Combo</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant={calendarOnlyActive ? "default" : "outline"}
                onClick={() => setCalendarOnlyActive((value) => !value)}
              >
                {calendarOnlyActive ? "Active Offers Only" : "Showing Active + Past"}
              </Button>
              <div className="text-xs text-muted-foreground flex items-center">
                Total shown: {Object.values(calendarGroups).reduce((sum, list) => sum + list.length, 0)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editOffer ? (
              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-sm font-semibold">Edit {editOffer.type} Offer</p>
                {editOffer.type === "COMBO" ? (
                  <>
                    <Input placeholder="Combo name" value={editOffer.name ?? ""} onChange={(e) => setEditOffer((v) => ({ ...v, name: e.target.value }))} />
                    <Input placeholder="Description" value={editOffer.description ?? ""} onChange={(e) => setEditOffer((v) => ({ ...v, description: e.target.value }))} />
                    <Select value={editOffer.category ?? "MEN"} onValueChange={(value) => setEditOffer((v) => ({ ...v, category: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEN">Men</SelectItem>
                        <SelectItem value="WOMEN">Women</SelectItem>
                        <SelectItem value="CHILDREN">Children</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Offer price" value={editOffer.offerPrice ?? ""} onChange={(e) => setEditOffer((v) => ({ ...v, offerPrice: e.target.value }))} />
                    <div className="flex flex-wrap gap-2">
                      {(center.services ?? []).map((service) => {
                        const selected = (editOffer.serviceIds ?? []).includes(service.id)
                        return (
                          <Button
                            key={service.id}
                            type="button"
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            onClick={() =>
                              setEditOffer((v) => ({
                                ...v,
                                serviceIds: selected ? v.serviceIds.filter((id) => id !== service.id) : [...(v.serviceIds ?? []), service.id],
                              }))
                            }
                          >
                            {service.name}
                          </Button>
                        )
                      })}
                    </div>
                    <Label>Visible to Membership</Label>
                    <div className="flex flex-wrap gap-2">
                      {["FREE", "BASIC", "PREMIUM"].map((segment) => (
                        <Button
                          key={segment}
                          type="button"
                          size="sm"
                          variant={(editOffer.visibleSegments ?? []).includes(segment) ? "default" : "outline"}
                          onClick={() =>
                            setEditOffer((v) => ({
                              ...v,
                              visibleSegments: (v.visibleSegments ?? []).includes(segment)
                                ? (v.visibleSegments ?? []).filter((item) => item !== segment)
                                : [...(v.visibleSegments ?? []), segment],
                            }))
                          }
                        >
                          {segment}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : null}
                {editOffer.type === "SERVICE" || editOffer.type === "MEMBERSHIP" ? (
                  <Select value={editOffer.serviceId ?? ""} onValueChange={(value) => setEditOffer((v) => ({ ...v, serviceId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>{(center.services ?? []).map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : null}
                {editOffer.type === "MEMBERSHIP" ? (
                  <Select value={editOffer.membershipSegment ?? "FREE"} onValueChange={(value) => setEditOffer((v) => ({ ...v, membershipSegment: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">Free</SelectItem>
                      <SelectItem value="BASIC">Basic</SelectItem>
                      <SelectItem value="PREMIUM">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
                {editOffer.type !== "COMBO" ? (
                  <Input type="number" placeholder="Discount %" value={editOffer.discountPercent ?? ""} onChange={(e) => setEditOffer((v) => ({ ...v, discountPercent: e.target.value }))} />
                ) : null}
                <div className="grid gap-2 md:grid-cols-2">
                  <Input type="datetime-local" value={editOffer.startAt ?? ""} onChange={(e) => setEditOffer((v) => ({ ...v, startAt: e.target.value }))} />
                  <Input type="datetime-local" value={editOffer.endAt ?? ""} onChange={(e) => setEditOffer((v) => ({ ...v, endAt: e.target.value }))} />
                </div>
                <Button type="button" variant={editOffer.isEnabled ? "default" : "outline"} onClick={() => setEditOffer((v) => ({ ...v, isEnabled: !v.isEnabled }))}>
                  {editOffer.isEnabled ? "Enabled" : "Disabled"}
                </Button>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => void saveEditedOffer()} disabled={loading}>Save Changes</Button>
                  <Button type="button" variant="outline" onClick={() => setEditOffer(null)} disabled={loading}>Cancel</Button>
                </div>
              </div>
            ) : null}
            <div ref={calendarListRef} className="space-y-4">
            {Object.entries(calendarGroups).map(([type, items]) => {
              if (!items.length) return null
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{formatCalendarType(type)}</p>
                    <Badge variant="outline">{items.length}</Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((event) => (
                      <div key={`${event.type}-${event.id}`} className="admin-card-hover admin-shadow-sm rounded-lg border border-border/70 bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{event.title}</p>
                          <StatusPill status={event.isActive ? "Active" : "Expired"} />
                        </div>
                        <p className="text-xs text-muted-foreground">{event.type}</p>
                        <p className="text-xs">Start: {event.startAt ? new Date(event.startAt).toLocaleString() : "N/A"}</p>
                        <p className="text-xs">End: {event.endAt ? new Date(event.endAt).toLocaleString() : "N/A"}</p>
                        <div className="mt-2 flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => startEditOffer(event)} disabled={loading}>Edit</Button>
                          <Button type="button" size="sm" variant="destructive" onClick={() => void deleteOffer(event)} disabled={loading}>Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            </div>
            {!Object.values(calendarGroups).some((list) => list.length) ? (
              <p className="text-xs text-muted-foreground">No offers found for current calendar filters.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
