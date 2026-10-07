"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronRight, KeyRound, Scissors, Search, TriangleAlert, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatedTabBar, ButtonLoadingMorph, ErrorState, ProgressRing, StatCard, StatusChip, useAsyncAction } from "@/components/kit";
import { interaction, spring } from "@/components/motion";
import { useAuth } from "@/components/auth/auth-provider";
import { AllowedServicesPicker } from "@/admin/components/allowed-services-picker";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { FilterTabs } from "@/admin/components/filter-tabs";
import { SkeletonCards } from "@/admin/components/skeleton";
import { SlideOver } from "@/admin/components/slide-over";
import { Switch } from "@/admin/components/switch";
import { notify } from "@/lib/notify";
import { iconForAudience } from "@/lib/service-icons";
import { clearEditStaff, fetchAdminDashboardData, setEditFormField, startEditStaff, updateStaffAsync } from "@/store/admin-dashboard-slice";
import { AdminLayout } from "../portal/admin-layout";

const SEGMENTS = [{ value: "ALL", label: "All" }, ...["MEN", "WOMEN", "UNISEX"].map((value) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase(), icon: iconForAudience(value) }))];
const GENDER_TYPES = SEGMENTS.filter((s) => s.value !== "ALL");

export default function AdminStaffPermissionsPage() {
  const reduce = useReducedMotion();
  const { appUser } = useAuth();
  const dispatch = useDispatch();
  const { staff, servicesCatalog, editId, editForm, loading, error } = useSelector((state) => state.adminDashboard);
  const [searchText, setSearchText] = useState("");
  const [segment, setSegment] = useState("ALL");
  const [activeOnly, setActiveOnly] = useState(true);
  const save = useAsyncAction({ successMs: 700 });

  const stylists = useMemo(() => staff.filter((s) => s.role === "STAFF"), [staff]);
  const filteredStylists = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return stylists.filter((s) => {
      if (activeOnly && !s.isActive) return false;
      if (segment !== "ALL" && `${s.genderType ?? "UNISEX"}`.toUpperCase() !== segment) return false;
      return !q || `${s.name ?? ""} ${s.email ?? ""} ${s.phone ?? ""}`.toLowerCase().includes(q);
    });
  }, [activeOnly, searchText, segment, stylists]);

  const totalServices = servicesCatalog.length;
  const unassigned = stylists.filter((s) => s.isActive && !(s.allowedServiceIds ?? []).length).length;

  useEffect(() => {
    if (appUser?.role !== "ADMIN") return;
    void dispatch(fetchAdminDashboardData());
  }, [appUser?.role, dispatch]);

  const selected = Array.isArray(editForm.allowedServiceIds) ? editForm.allowedServiceIds : [];
  const editing = stylists.find((s) => s.id === editId) ?? null;

  async function saveEdit() {
    if (!editId) return;
    const result = await dispatch(updateStaffAsync({ id: editId, payload: editForm }));
    if (updateStaffAsync.rejected.match(result)) {
      notify.error(result.payload ?? "Update failed");
      throw new Error("update failed");
    }
    notify.success("Permissions saved");
    setTimeout(() => dispatch(clearEditStaff()), 600);
    void dispatch(fetchAdminDashboardData());
  }

  if (!appUser || appUser.role !== "ADMIN") {
    return (
      <AdminLayout pageTitle="Permissions">
        <EmptyState illustration="search" title="Admins only" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Permissions" description="Which services each stylist can do">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Users} label="Stylists" value={stylists.length} tone="primary" loading={loading && !staff.length} />
          <StatCard icon={Scissors} label="Services" value={totalServices} tone="info" loading={loading && !staff.length} />
          <StatCard icon={TriangleAlert} label="Unbookable" value={unassigned} tone={unassigned ? "warning" : "neutral"} loading={loading && !staff.length} />
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <label className="relative block min-w-0 lg:w-80">
            <span className="sr-only">Search stylists</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-neutral" aria-hidden />
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Name, email or phone" className="h-11 w-full rounded-control bg-card pr-3 pl-10 text-sm shadow-soft ring-1 ring-inset ring-border/60 outline-none placeholder:text-ink-neutral focus-visible:ring-2 focus-visible:ring-portal" />
          </label>
          <FilterTabs label="Stylist type" options={SEGMENTS} value={segment} onChange={setSegment} />
          <label className="flex items-center gap-2.5 text-sm font-semibold lg:ml-auto">
            <Switch checked={activeOnly} onChange={setActiveOnly} label="Active stylists only" />
            Active only
          </label>
        </div>

        {error && !staff.length ? (
          <ErrorState title="Couldn't load stylists" description={error} onRetry={() => dispatch(fetchAdminDashboardData()).unwrap()} />
        ) : loading && !stylists.length ? (
          <SkeletonCards count={3} />
        ) : !filteredStylists.length ? (
          <EmptyState illustration="search" icon={KeyRound} title="No stylists here" description="Try another filter." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredStylists.map((s, index) => {
                const count = (s.allowedServiceIds ?? []).length;
                return (
                  <motion.li key={s.id} layout={!reduce} initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ ...spring.soft, delay: Math.min(index, 10) * 0.04 }}>
                    <motion.button
                      type="button"
                      whileHover={reduce ? undefined : interaction.cardHover}
                      whileTap={reduce ? undefined : interaction.press}
                      onClick={() => dispatch(startEditStaff(s))}
                      className="group flex w-full items-center gap-4 rounded-card border border-border/60 bg-card p-4 text-left shadow-soft outline-none transition-shadow hover:shadow-lift focus-visible:ring-2 focus-visible:ring-portal"
                    >
                      <ProgressRing value={count} max={Math.max(1, totalServices)} size={64} stroke={6} tone={s.isActive && !count ? "warning" : "portal"} label={`${s.name}: ${count} of ${totalServices} services`} showValue={false}>
                        <AvatarBadge name={s.name} size="md" />
                      </ProgressRing>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold">{s.name}</span>
                          <StatusChip status={s.isActive ? "ACTIVE" : "INACTIVE"} size="sm" iconOnly />
                        </span>
                        <span className="block text-caption text-ink-neutral tabular-nums">
                          {count}/{totalServices} services · {`${s.genderType ?? "UNISEX"}`.charAt(0) + `${s.genderType ?? "UNISEX"}`.slice(1).toLowerCase()}
                        </span>
                        {s.isActive && !count ? <span className="mt-1 block text-[11px] font-semibold text-ink-warning">Can't be booked yet</span> : null}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-ink-neutral transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </motion.button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <SlideOver
        open={Boolean(editId)}
        onOpenChange={(open) => !open && dispatch(clearEditStaff())}
        title={editing ? editing.name : "Stylist"}
        description={`${selected.length} of ${totalServices} services`}
        icon={KeyRound}
        footer={
          <ButtonLoadingMorph icon={Check} state={save.state} loadingLabel="Saving…" successLabel="Saved" onClick={() => save.run(saveEdit)}>
            Save
          </ButtonLoadingMorph>
        }
      >
        <div className="space-y-4">
          <AnimatedTabBar fullWidth label="Stylist type" items={GENDER_TYPES} value={editForm.genderType ?? "UNISEX"} onChange={(value) => dispatch(setEditFormField({ field: "genderType", value }))} />
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3">
            <span className="text-sm font-semibold">{editForm.isActive ? "Bookable" : "Hidden from booking"}</span>
            <Switch checked={Boolean(editForm.isActive)} onChange={(value) => dispatch(setEditFormField({ field: "isActive", value }))} label="Stylist active" />
          </div>
          <AllowedServicesPicker services={servicesCatalog} selected={selected} onChange={(ids) => dispatch(setEditFormField({ field: "allowedServiceIds", value: Array.from(new Set(ids)) }))} />
        </div>
      </SlideOver>
    </AdminLayout>
  );
}
