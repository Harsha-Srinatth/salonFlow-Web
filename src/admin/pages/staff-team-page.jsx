"use client";

import { AnimatePresence, motion } from "motion/react";
import { BorderBeam } from "border-beam";
import { Check, ConciergeBell, Loader2, Mail, Pencil, Phone, Scissors, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/lib/notify";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { useConfirm } from "@/admin/components/confirm-dialog";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { SlideOver } from "@/admin/components/slide-over";
import { Switch } from "@/admin/components/service-editor-drawer";
import { StatusPill } from "@/admin/components/status-pill";
import { ToggleChip } from "@/admin/components/toggle-chip";
import Counter from "@/components/fx/counter";
import { SegmentedControl } from "@/components/fx/segmented-control";
import { LoadingOrb } from "@/components/shared/loading-orb";
import { clearEditStaff, deleteStaffAsync, fetchAdminDashboardData, setEditFormField, startEditStaff, updateStaffAsync } from "@/store/admin-dashboard-slice";
import { cn } from "@/lib/utils";
import { AdminLayout } from "../portal/admin-layout";

const ROLE_FILTERS = [
  { value: "ALL", label: "Everyone" },
  { value: "STAFF", label: "Employees", icon: Scissors },
  { value: "RECEPTIONIST", label: "Receptionists", icon: ConciergeBell },
];
const ROLE_OPTIONS = ROLE_FILTERS.filter((r) => r.value !== "ALL");
const GENDER_TYPES = [
  { value: "UNISEX", label: "Unisex" },
  { value: "WOMEN", label: "Women" },
  { value: "MEN", label: "Men" },
];
const roleLabel = (role) => (role === "STAFF" ? "Employee" : role === "RECEPTIONIST" ? "Receptionist" : role);
const categoryOf = (service) => `${service.category ?? ""}`.trim() || "General";

export default function AdminTeamPage() {
  const { appUser } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirm();
  const { staff, servicesCatalog, editId, editForm, loading, mutating, error } = useSelector((state) => state.adminDashboard);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");

  useEffect(() => {
    if (appUser?.role !== "ADMIN") return;
    void dispatch(fetchAdminDashboardData());
  }, [appUser?.role, dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const pending = staff.filter((s) => s.accountStatus !== "ACTIVE").length;
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (role !== "ALL" && s.role !== role) return false;
      if (!q) return true;
      return `${s.name ?? ""} ${s.email ?? ""} ${s.phone ?? ""}`.toLowerCase().includes(q);
    });
  }, [staff, search, role]);

  const selected = Array.isArray(editForm.allowedServiceIds) ? editForm.allowedServiceIds : [];
  const grouped = useMemo(() => {
    const groups = new Map();
    for (const service of servicesCatalog) groups.set(categoryOf(service), [...(groups.get(categoryOf(service)) ?? []), service]);
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [servicesCatalog]);
  const setSelected = (ids) => dispatch(setEditFormField({ field: "allowedServiceIds", value: Array.from(new Set(ids)) }));

  async function removeStaff(member) {
    const ok = await confirm({ title: `Remove ${member.name}?`, description: "Their account is removed and they can no longer sign in.", confirmLabel: "Delete", hold: true });
    if (!ok) return;
    const result = await dispatch(deleteStaffAsync(member.id));
    if (deleteStaffAsync.rejected.match(result)) {
      toast.error(result.payload ?? "Delete failed");
      return;
    }
    toast.success("Removed");
    dispatch(clearEditStaff());
  }

  async function saveEdit() {
    if (!editId) return;
    const result = await dispatch(updateStaffAsync({ id: editId, payload: editForm }));
    if (updateStaffAsync.rejected.match(result)) {
      toast.error(result.payload ?? "Update failed");
      return;
    }
    toast.success("Staff updated. Re-verify the phone with Firebase if the number changed.");
    dispatch(clearEditStaff());
    void dispatch(fetchAdminDashboardData());
  }

  if (!appUser) return <div className="p-4">Please sign in first.</div>;
  if (appUser.role !== "ADMIN") return <div className="p-4">Admin only.</div>;

  return (
    <AdminLayout
      pageTitle="Team"
      description="Everyone who works at the salon: employees and receptionists."
      actions={
        <BorderBeam size="sm">
          <Button asChild>
            <Link to="/admin-dashboard/staff/new">
              <UserPlus className="size-4" /> Create staff
            </Link>
          </Button>
        </BorderBeam>
      }
    >
      <div className="space-y-5">
        <ErrorBanner message={error} onRetry={() => void dispatch(fetchAdminDashboardData())} />

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            ["Team members", staff.length, ""],
            ["Employees", staff.filter((s) => s.role === "STAFF").length, ""],
            ["Pending setup", pending, pending ? "text-warning" : ""],
          ].map(([label, value, tone], i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="admin-shadow-sm rounded-2xl border border-border/70 bg-card px-3 py-3 sm:px-4">
              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</p>
              <p className={cn("mt-1 text-2xl font-bold tracking-tight", tone)}>
                <Counter value={value} fontSize={26} padding={4} gap={0} horizontalPadding={0} fontWeight={700} gradientHeight={0} gradientFrom="transparent" />
              </p>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <BorderBeam className="w-full lg:w-80" radius="0.75rem">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" aria-label="Search team" className="h-10 w-full rounded-xl border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground" />
            </div>
          </BorderBeam>
          <div className="max-w-full overflow-x-auto pb-1">
            <SegmentedControl label="Role" options={ROLE_FILTERS} value={role} onChange={setRole} />
          </div>
        </div>

        {loading && !staff.length ? (
          <LoadingOrb compact label="Loading your team…" />
        ) : !shown.length ? (
          <EmptyState icon={Users} title={staff.length ? "No one matches" : "No team members yet"} description={staff.length ? "Try a different search or role." : "Create your first employee or receptionist account to get started."} actionLabel={staff.length ? undefined : "Create staff"} onAction={() => navigate("/admin-dashboard/staff/new")} />
        ) : (
          <motion.div layout className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {shown.map((member, index) => (
                <motion.article
                  key={member.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32, delay: Math.min(index, 8) * 0.025 }}
                  whileHover={{ y: -3 }}
                  className="admin-shadow-sm flex flex-col rounded-2xl border border-border/70 bg-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <AvatarBadge name={member.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-medium">{member.name}</p>
                        <StatusPill status={member.accountStatus ?? "—"} />
                      </div>
                      <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {member.role === "RECEPTIONIST" ? <ConciergeBell className="size-3" /> : <Scissors className="size-3" />} {roleLabel(member.role)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5 truncate"><Mail className="size-3.5 shrink-0" /> {member.email}</p>
                    <p className="flex items-center gap-1.5"><Phone className="size-3.5 shrink-0" /> {member.phone}</p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => dispatch(startEditStaff(member))}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Delete ${member.name}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void removeStaff(member)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <SlideOver
        open={Boolean(editId)}
        onOpenChange={(open) => !open && dispatch(clearEditStaff())}
        title="Edit team member"
        description="Update contact details, role and availability."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => dispatch(clearEditStaff())} disabled={mutating}>
              Cancel
            </Button>
            <BorderBeam size="sm" active={!mutating}>
              <Button disabled={mutating} onClick={() => void saveEdit()}>
                {mutating ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {mutating ? "Saving…" : "Save"}
              </Button>
            </BorderBeam>
          </div>
        }
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {[
            ["name", "Name", "text", "Full name"],
            ["email", "Email", "email", "name@salon.com"],
            ["phone", "Phone (E.164)", "tel", "+919876543210"],
          ].map(([field, label, type, placeholder]) => (
            <label key={field} className="block space-y-1.5 text-sm font-medium">
              {label}
              <input type={type} placeholder={placeholder} value={editForm[field] ?? ""} onChange={(e) => dispatch(setEditFormField({ field, value: e.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
            </label>
          ))}
          <div className="space-y-2">
            <p className="text-sm font-medium">Role</p>
            <SegmentedControl fluid label="Role" options={ROLE_OPTIONS} value={editForm.role} onChange={(value) => dispatch(setEditFormField({ field: "role", value }))} />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">{editForm.isActive ? "Can be booked / sign in." : "Switched off."}</p>
            </div>
            <Switch checked={Boolean(editForm.isActive)} onChange={(value) => dispatch(setEditFormField({ field: "isActive", value }))} label="Active" />
          </div>

          <AnimatePresence initial={false}>
            {editForm.role === "STAFF" ? (
              <motion.div key="stylist" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Stylist type</p>
                    <SegmentedControl fluid label="Stylist gender type" options={GENDER_TYPES} value={editForm.genderType ?? "UNISEX"} onChange={(value) => dispatch(setEditFormField({ field: "genderType", value }))} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Allowed services</p>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {selected.length} of {servicesCatalog.length}
                      </span>
                    </div>
                    {!servicesCatalog.length ? <p className="rounded-xl border border-dashed py-5 text-center text-sm text-muted-foreground">Create services first.</p> : null}
                    {grouped.map(([category, list]) => {
                      const ids = list.map((s) => s.id);
                      const all = ids.every((id) => selected.includes(id));
                      return (
                        <div key={category} className="rounded-xl border bg-muted/20 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
                            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setSelected(all ? selected.filter((id) => !ids.includes(id)) : [...selected, ...ids])}>
                              {all ? "Remove all" : "Add all"}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {list.map((service) => (
                              <ToggleChip key={service.id} size="sm" selected={selected.includes(service.id)} onClick={() => setSelected(selected.includes(service.id) ? selected.filter((id) => id !== service.id) : [...selected, service.id])}>
                                {service.name}
                              </ToggleChip>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </SlideOver>
      {confirmDialog}
    </AdminLayout>
  );
}
