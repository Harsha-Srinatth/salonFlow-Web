"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ConciergeBell, Hourglass, Mail, Pencil, Phone, Scissors, Search, Trash2, UserPlus, UserRound, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatedTabBar, ButtonLoadingMorph, ErrorState, FloatingLabelInput, IconButton, StatCard, StatusChip, useAsyncAction } from "@/components/kit";
import { interaction, spring } from "@/components/motion";
import { useAuth } from "@/components/auth/auth-provider";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { useConfirm } from "@/admin/components/confirm-dialog";
import { EmptyState } from "@/admin/components/empty-state";
import { FilterTabs } from "@/admin/components/filter-tabs";
import { SkeletonCards } from "@/admin/components/skeleton";
import { SlideOver } from "@/admin/components/slide-over";
import { Switch } from "@/admin/components/switch";
import { AllowedServicesPicker } from "@/admin/components/allowed-services-picker";
import { formatPhone } from "@/lib/format";
import { notify } from "@/lib/notify";
import { iconForAudience } from "@/lib/service-icons";
import { clearEditStaff, deleteStaffAsync, fetchAdminDashboardData, setEditFormField, startEditStaff, updateStaffAsync } from "@/store/admin-dashboard-slice";
import { AdminLayout } from "../portal/admin-layout";

const ROLE_FILTERS = [
  { value: "ALL", label: "Everyone", icon: Users },
  { value: "STAFF", label: "Stylists", icon: Scissors },
  { value: "RECEPTIONIST", label: "Reception", icon: ConciergeBell },
];
const ROLE_OPTIONS = ROLE_FILTERS.filter((r) => r.value !== "ALL");
const GENDER_TYPES = ["UNISEX", "WOMEN", "MEN"].map((value) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase(), icon: iconForAudience(value) }));
const roleLabel = (role) => (role === "STAFF" ? "Stylist" : role === "RECEPTIONIST" ? "Reception" : role);

export default function AdminTeamPage() {
  const reduce = useReducedMotion();
  const { appUser } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { ask, confirmSheet } = useConfirm();
  const { staff, servicesCatalog, editId, editForm, loading, error } = useSelector((state) => state.adminDashboard);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const save = useAsyncAction({ successMs: 700 });

  useEffect(() => {
    if (appUser?.role !== "ADMIN") return;
    void dispatch(fetchAdminDashboardData());
  }, [appUser?.role, dispatch]);

  // ⌘K deep link: ?edit=<staff id>
  useEffect(() => {
    const id = params.get("edit");
    const member = id && staff.find((s) => s.id === id);
    if (!member) return;
    dispatch(startEditStaff(member));
    setParams((p) => {
      p.delete("edit");
      return p;
    }, { replace: true });
  }, [params, staff, dispatch, setParams]);

  const pending = staff.filter((s) => s.accountStatus !== "ACTIVE").length;
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => (role === "ALL" || s.role === role) && (!q || `${s.name ?? ""} ${s.email ?? ""} ${s.phone ?? ""}`.toLowerCase().includes(q)));
  }, [staff, search, role]);
  const selected = Array.isArray(editForm.allowedServiceIds) ? editForm.allowedServiceIds : [];

  function removeStaff(member) {
    ask({
      title: `Remove ${member.name}?`,
      description: "Their account is deleted and they can't sign in.",
      confirmLabel: "Slide to remove",
      action: async () => {
        const result = await dispatch(deleteStaffAsync(member.id));
        if (deleteStaffAsync.rejected.match(result)) {
          notify.error(result.payload ?? "Delete failed");
          throw new Error("delete failed");
        }
        notify.success(`${member.name} removed`);
        dispatch(clearEditStaff());
      },
    });
  }

  async function saveEdit() {
    if (!editId) return;
    const result = await dispatch(updateStaffAsync({ id: editId, payload: editForm }));
    if (updateStaffAsync.rejected.match(result)) {
      notify.error(result.payload ?? "Update failed");
      throw new Error("update failed");
    }
    notify.success("Saved", { description: "Re-verify the phone if it changed." });
    setTimeout(() => dispatch(clearEditStaff()), 600);
    void dispatch(fetchAdminDashboardData());
  }

  if (!appUser || appUser.role !== "ADMIN") {
    return (
      <AdminLayout pageTitle="Team">
        <EmptyState illustration="search" title="Admins only" />
      </AdminLayout>
    );
  }

  const field = (name) => ({ value: editForm[name] ?? "", onChange: (e) => dispatch(setEditFormField({ field: name, value: e.target.value })) });

  return (
    <AdminLayout
      pageTitle="Team"
      description="Stylists and reception"
      actions={
        <Link to="/admin-dashboard/staff/new" className="inline-flex h-11 items-center gap-2 rounded-control bg-portal px-5 text-sm font-semibold text-portal-foreground shadow-soft transition-shadow hover:shadow-glow">
          <UserPlus className="size-4" aria-hidden /> Add staff
        </Link>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Users} label="Team" value={staff.length} tone="primary" loading={loading && !staff.length} />
          <StatCard icon={Scissors} label="Stylists" value={staff.filter((s) => s.role === "STAFF").length} tone="info" loading={loading && !staff.length} />
          <StatCard icon={Hourglass} label="Pending" value={pending} tone={pending ? "warning" : "neutral"} loading={loading && !staff.length} />
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <label className="relative block min-w-0 lg:w-80">
            <span className="sr-only">Search team</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-neutral" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or phone" className="h-11 w-full rounded-control bg-card pr-3 pl-10 text-sm shadow-soft ring-1 ring-inset ring-border/60 outline-none placeholder:text-ink-neutral focus-visible:ring-2 focus-visible:ring-portal" />
          </label>
          <FilterTabs label="Role" options={ROLE_FILTERS} value={role} onChange={setRole} />
        </div>

        {error && !staff.length ? (
          <ErrorState title="Couldn't load the team" description={error} onRetry={() => dispatch(fetchAdminDashboardData()).unwrap()} />
        ) : loading && !staff.length ? (
          <SkeletonCards count={3} />
        ) : !shown.length ? (
          <EmptyState
            illustration={staff.length ? "search" : "sparkle"}
            title={staff.length ? "No one matches" : "No team yet"}
            description={staff.length ? "Try another search." : "Add your first stylist or receptionist."}
            actionLabel={staff.length ? undefined : "Add staff"}
            actionIcon={UserPlus}
            onAction={() => navigate("/admin-dashboard/staff/new")}
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {shown.map((member, index) => (
                <motion.li
                  key={member.id}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  whileHover={reduce ? undefined : interaction.cardHover}
                  transition={{ ...spring.soft, delay: Math.min(index, 10) * 0.04 }}
                  className="flex flex-col rounded-card border border-border/60 bg-card p-4 shadow-soft transition-shadow hover:shadow-lift"
                >
                  <div className="flex items-start gap-3">
                    <AvatarBadge name={member.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{member.name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-muted px-2 text-[11px] font-semibold text-ink-neutral">
                          {member.role === "RECEPTIONIST" ? <ConciergeBell className="size-3" aria-hidden /> : <Scissors className="size-3" aria-hidden />} {roleLabel(member.role)}
                        </span>
                        <StatusChip status={member.accountStatus === "ACTIVE" ? (member.isActive ? "ACTIVE" : "INACTIVE") : "PENDING"} size="sm" />
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-caption text-ink-neutral">
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="size-3.5 shrink-0" aria-hidden /> {member.email}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="size-3.5 shrink-0" aria-hidden /> {formatPhone(member.phone) || "—"}
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <ButtonLoadingMorph size="md" variant="secondary" icon={Pencil} className="flex-1" onClick={() => dispatch(startEditStaff(member))}>
                      Edit
                    </ButtonLoadingMorph>
                    <IconButton icon={Trash2} label={`Remove ${member.name}`} variant="ghost" className="text-ink-destructive" onClick={() => removeStaff(member)} />
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <SlideOver
        open={Boolean(editId)}
        onOpenChange={(open) => !open && dispatch(clearEditStaff())}
        title="Edit teammate"
        icon={UserRound}
        footer={
          <ButtonLoadingMorph icon={Check} state={save.state} loadingLabel="Saving…" successLabel="Saved" onClick={() => save.run(saveEdit)}>
            Save
          </ButtonLoadingMorph>
        }
      >
        <div className="space-y-4">
          <FloatingLabelInput label="Full name" icon={UserRound} autoComplete="name" {...field("name")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <FloatingLabelInput label="Email" icon={Mail} type="email" autoComplete="email" {...field("email")} />
            <FloatingLabelInput label="Phone (+91…)" icon={Phone} type="tel" autoComplete="tel" {...field("phone")} />
          </div>
          <AnimatedTabBar fullWidth label="Role" items={ROLE_OPTIONS} value={editForm.role} onChange={(value) => dispatch(setEditFormField({ field: "role", value }))} />
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3">
            <span className="text-sm font-semibold">{editForm.isActive ? "Active" : "Switched off"}</span>
            <Switch checked={Boolean(editForm.isActive)} onChange={(value) => dispatch(setEditFormField({ field: "isActive", value }))} label="Active" />
          </div>
          <AnimatePresence initial={false}>
            {editForm.role === "STAFF" ? (
              <motion.div key="stylist" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <AnimatedTabBar fullWidth label="Stylist type" items={GENDER_TYPES} value={editForm.genderType ?? "UNISEX"} onChange={(value) => dispatch(setEditFormField({ field: "genderType", value }))} />
                <AllowedServicesPicker services={servicesCatalog} selected={selected} onChange={(ids) => dispatch(setEditFormField({ field: "allowedServiceIds", value: Array.from(new Set(ids)) }))} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </SlideOver>
      {confirmSheet}
    </AdminLayout>
  );
}
