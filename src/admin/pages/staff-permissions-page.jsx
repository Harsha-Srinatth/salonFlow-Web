"use client";

import { AnimatePresence, motion } from "motion/react";
import { BorderBeam } from "border-beam";
import { Check, ChevronRight, KeyRound, Loader2, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "@/lib/notify";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { SlideOver } from "@/admin/components/slide-over";
import { Switch } from "@/admin/components/service-editor-drawer";
import { StatusPill } from "@/admin/components/status-pill";
import { ToggleChip } from "@/admin/components/toggle-chip";
import Counter from "@/components/fx/counter";
import { SegmentedControl } from "@/components/fx/segmented-control";
import { LoadingOrb } from "@/components/shared/loading-orb";
import { clearEditStaff, fetchAdminDashboardData, setEditFormField, startEditStaff, updateStaffAsync } from "@/store/admin-dashboard-slice";
import { cn } from "@/lib/utils";
import { AdminLayout } from "../portal/admin-layout";

const SEGMENTS = [
  { value: "ALL", label: "All" },
  { value: "MEN", label: "Men" },
  { value: "WOMEN", label: "Women" },
  { value: "UNISEX", label: "Unisex" },
];
const GENDER_TYPES = SEGMENTS.filter((s) => s.value !== "ALL");
const categoryOf = (service) => `${service.category ?? ""}`.trim() || "General";

function CoverageBar({ count, total }) {
  const pct = total ? Math.min(100, Math.round((count / total) * 100)) : 0;
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Can perform <span className="font-semibold text-foreground">{count}</span> of {total} services
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
    </div>
  );
}

export default function AdminStaffPermissionsPage() {
  const { appUser } = useAuth();
  const dispatch = useDispatch();
  const { staff, servicesCatalog, editId, editForm, loading, mutating, error } = useSelector((state) => state.adminDashboard);

  const [searchText, setSearchText] = useState("");
  const [segment, setSegment] = useState("ALL");
  const [activeOnly, setActiveOnly] = useState(true);
  const [serviceQuery, setServiceQuery] = useState("");

  const stylists = useMemo(() => staff.filter((s) => s.role === "STAFF"), [staff]);
  const filteredStylists = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return stylists.filter((s) => {
      if (activeOnly && !s.isActive) return false;
      if (segment !== "ALL" && `${s.genderType ?? "UNISEX"}`.toUpperCase() !== segment) return false;
      if (!q) return true;
      return `${s.name ?? ""} ${s.email ?? ""} ${s.phone ?? ""}`.toLowerCase().includes(q);
    });
  }, [activeOnly, searchText, segment, stylists]);

  const totalServices = servicesCatalog.length;
  const activeStylists = stylists.filter((s) => s.isActive).length;
  const unassigned = stylists.filter((s) => s.isActive && !(s.allowedServiceIds ?? []).length).length;

  const grouped = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    const groups = new Map();
    for (const service of servicesCatalog) {
      if (q && !`${service.name ?? ""} ${service.category ?? ""}`.toLowerCase().includes(q)) continue;
      const key = categoryOf(service);
      groups.set(key, [...(groups.get(key) ?? []), service]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [servicesCatalog, serviceQuery]);

  useEffect(() => {
    if (appUser?.role !== "ADMIN") return;
    void dispatch(fetchAdminDashboardData());
  }, [appUser?.role, dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (!editId) setServiceQuery("");
  }, [editId]);

  const selected = Array.isArray(editForm.allowedServiceIds) ? editForm.allowedServiceIds : [];
  const setSelected = (ids) => dispatch(setEditFormField({ field: "allowedServiceIds", value: Array.from(new Set(ids)) }));
  const toggleService = (id) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const editing = stylists.find((s) => s.id === editId) ?? null;

  async function save() {
    if (!editId) return;
    const result = await dispatch(updateStaffAsync({ id: editId, payload: editForm }));
    if (updateStaffAsync.rejected.match(result)) {
      toast.error(result.payload ?? "Update failed");
      return;
    }
    toast.success("Stylist permissions saved");
    dispatch(clearEditStaff());
    void dispatch(fetchAdminDashboardData());
  }

  if (!appUser) return <div className="p-4">Please sign in first.</div>;
  if (appUser.role !== "ADMIN") return <div className="p-4">Admin only.</div>;

  return (
    <AdminLayout pageTitle="Staff Permissions" description="Control which services each stylist is allowed to perform.">
      <div className="space-y-5">
        <ErrorBanner message={error} onRetry={() => void dispatch(fetchAdminDashboardData())} />

        <div className="grid grid-cols-3 gap-3">
          {[
            ["Stylists", stylists.length],
            ["Active", activeStylists],
            ["Need services", unassigned],
          ].map(([label, value], i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="admin-shadow-sm rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className={cn("mt-1 text-2xl font-bold tracking-tight", label === "Need services" && value > 0 && "text-warning")}>
                <Counter value={value} fontSize={26} padding={4} gap={0} horizontalPadding={0} fontWeight={700} gradientHeight={0} gradientFrom="transparent" />
              </p>
            </motion.div>
          ))}
        </div>

        <p className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <KeyRound className="mt-0.5 size-3.5 shrink-0 text-primary" />
          Booking availability depends on each stylist's allowed services. Unisex does not mean "all services".
        </p>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <BorderBeam className="w-full lg:w-80" radius="0.75rem">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search name, email or phone" aria-label="Search stylists" className="h-10 w-full rounded-xl border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground" />
            </div>
          </BorderBeam>
          <SegmentedControl label="Stylist type" options={SEGMENTS} value={segment} onChange={setSegment} />
          <label className="flex items-center gap-2 text-sm lg:ml-auto">
            <Switch checked={activeOnly} onChange={setActiveOnly} label="Active stylists only" />
            Active only
          </label>
        </div>

        {loading && !stylists.length ? (
          <LoadingOrb compact label="Loading stylists…" />
        ) : !filteredStylists.length ? (
          <EmptyState icon={Users} title="No stylists found" description="Try a different search or type, or include inactive stylists." />
        ) : (
          <motion.div layout className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredStylists.map((s, index) => {
                const count = (s.allowedServiceIds ?? []).length;
                return (
                  <motion.button
                    type="button"
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 380, damping: 32, delay: Math.min(index, 8) * 0.025 }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => dispatch(startEditStaff(s))}
                    className="admin-shadow-sm group rounded-2xl border border-border/70 bg-card p-4 text-left outline-none transition-colors hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <div className="flex items-start gap-3">
                      <AvatarBadge name={s.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium">{s.name}</p>
                          <StatusPill status={s.isActive ? "Active" : "Inactive"} />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{`${s.genderType ?? "UNISEX"}`.charAt(0) + `${s.genderType ?? "UNISEX"}`.slice(1).toLowerCase()} stylist</p>
                      </div>
                      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <CoverageBar count={count} total={totalServices} />
                    {s.isActive && !count ? <p className="mt-2 text-[11px] font-medium text-warning">No services assigned: customers cannot book this stylist.</p> : null}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <SlideOver
        open={Boolean(editId)}
        onOpenChange={(open) => !open && dispatch(clearEditStaff())}
        title={editing ? editing.name : "Edit stylist"}
        description="Set the stylist type, availability and the services they can perform."
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{selected.length}</span> of {totalServices} services selected
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => dispatch(clearEditStaff())} disabled={mutating}>
                Cancel
              </Button>
              <BorderBeam size="sm" active={!mutating}>
                <Button disabled={mutating} onClick={() => void save()}>
                  {mutating ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {mutating ? "Saving…" : "Save permissions"}
                </Button>
              </BorderBeam>
            </div>
          </div>
        }
      >
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Stylist type</p>
              <SegmentedControl fluid label="Stylist gender type" options={GENDER_TYPES} value={editForm.genderType ?? "UNISEX"} onChange={(value) => dispatch(setEditFormField({ field: "genderType", value }))} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Availability</p>
              <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                <span className="text-sm">{editForm.isActive ? "Active: can be booked" : "Inactive: hidden from booking"}</span>
                <Switch checked={Boolean(editForm.isActive)} onChange={(value) => dispatch(setEditFormField({ field: "isActive", value }))} label="Stylist active" />
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Allowed services</p>
                <p className="text-xs text-muted-foreground">Tap to allow or remove a service.</p>
              </div>
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => setSelected(servicesCatalog.map((s) => s.id))}>
                  Select all
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelected([])}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={serviceQuery} onChange={(e) => setServiceQuery(e.target.value)} placeholder="Filter services" aria-label="Filter services" className="h-9 w-full rounded-lg border bg-background pl-9 pr-8 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" />
              {serviceQuery ? (
                <button type="button" aria-label="Clear filter" onClick={() => setServiceQuery("")} className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-muted">
                  <X className="size-3" />
                </button>
              ) : null}
            </div>
            {!servicesCatalog.length ? <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">Create services first.</p> : null}
            {grouped.map(([category, services]) => {
              const ids = services.map((s) => s.id);
              const all = ids.every((id) => selected.includes(id));
              return (
                <motion.div key={category} layout className="rounded-xl border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {category} <span className="font-normal">({ids.filter((id) => selected.includes(id)).length}/{ids.length})</span>
                    </p>
                    <button type="button" onClick={() => setSelected(all ? selected.filter((id) => !ids.includes(id)) : [...selected, ...ids])} className="text-xs font-medium text-primary hover:underline">
                      {all ? "Remove all" : "Add all"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map((service) => (
                      <ToggleChip key={service.id} size="sm" selected={selected.includes(service.id)} onClick={() => toggleService(service.id)}>
                        {service.name}
                      </ToggleChip>
                    ))}
                  </div>
                </motion.div>
              );
            })}
            {servicesCatalog.length && !grouped.length ? <p className="py-4 text-center text-sm text-muted-foreground">No services match "{serviceQuery}".</p> : null}
          </section>
        </div>
      </SlideOver>
    </AdminLayout>
  );
}
