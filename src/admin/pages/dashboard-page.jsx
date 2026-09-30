"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { SkeletonCards, SkeletonRows } from "@/admin/components/skeleton";
import { StatCard } from "@/admin/components/stat-card";
import { StatusPill } from "@/admin/components/status-pill";
import { useRevealOnReady } from "@/admin/lib/motion";
import {
    clearEditStaff,
    createSalonAsync,
    deleteStaffAsync,
    fetchAdminDashboardData,
    resetNewSalon,
    setEditFormField,
    setNewSalonField,
    startEditStaff,
    updateStaffAsync,
} from "@/store/admin-dashboard-slice";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import {
    Building2,
    Calendar,
    Hash,
    MapPin,
    Pencil,
    Scissors,
    Sparkles,
    Trash2,
    UserPlus,
    Users,
    UserX,
} from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AdminLayout } from "../portal/admin-layout";

function roleLabel(role) {
    if (role === "STAFF")
        return "Employee";
    return role;
}
function buildSalonAddress(addressForm) {
    return [
        addressForm.buildingNumber,
        addressForm.streetName,
        addressForm.areaName,
        addressForm.cityName,
        addressForm.stateName,
        addressForm.countryName,
    ]
        .map(value => `${value ?? ""}`.trim())
        .filter(Boolean)
        .join(", ");
}

const QUICK_LINKS = [
    { href: "/admin-dashboard/appointments", label: "Bookings", description: "Track appointments & status", icon: Calendar },
    { href: "/admin-dashboard/services", label: "Services", description: "Manage the service menu", icon: Scissors },
    { href: "/admin-dashboard/staff/new", label: "Create staff", description: "Onboard a new teammate", icon: UserPlus },
];

export default function AdminDashboardPage() {
    const { appUser, logout } = useAuth();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { staff, salons, servicesCatalog, newSalon, editId, editForm, loading, mutating, error } = useSelector((state) => state.adminDashboard);
    const pendingCount = staff.filter(s => s.accountStatus !== "ACTIVE").length;
    const isAdmin = appUser?.role === "ADMIN";
    const staffSectionRef = useRevealOnReady([loading, staff.length], { selector: ":scope > *" });
    const salonSectionRef = useRevealOnReady([loading, salons.length], { selector: ":scope > *" });

    useEffect(() => {
        if (!isAdmin)
            return;
        void dispatch(fetchAdminDashboardData());
    }, [dispatch, isAdmin]);

    useEffect(() => {
        if (error) toast.error(error);
    }, [error]);

    function retryLoad() {
        void dispatch(fetchAdminDashboardData());
    }

    async function createSalon() {
        const address = buildSalonAddress(newSalon);
        if (!newSalon.name.trim() || !address) {
            toast.error("Salon name and full address are required");
            return;
        }
        const result = await dispatch(createSalonAsync({
                name: newSalon.name.trim(),
                pincode: `${newSalon.pincode ?? ""}`.trim(),
                address,
                latitude: 0,
                longitude: 0,
            }));
        if (createSalonAsync.rejected.match(result)) {
            toast.error(result.payload ?? "Could not create salon");
            return;
        }
        dispatch(resetNewSalon());
        toast.success("Salon created");
    }
    async function deleteStaff(id) {
        if (!confirm("Delete this staff member?"))
            return;
        const result = await dispatch(deleteStaffAsync(id));
        if (deleteStaffAsync.rejected.match(result)) {
            toast.error(result.payload ?? "Delete failed");
            return;
        }
        toast.success("Removed");
        dispatch(clearEditStaff());
    }
    function startEdit(s) {
        dispatch(startEditStaff(s));
    }
    function toggleAllowedService(serviceId, checked) {
        const current = Array.isArray(editForm.allowedServiceIds) ? editForm.allowedServiceIds : [];
        const next = checked ? Array.from(new Set([...current, serviceId])) : current.filter((id) => id !== serviceId);
        dispatch(setEditFormField({ field: "allowedServiceIds", value: next }));
    }
    async function saveEdit() {
        if (!editId)
            return;
        const result = await dispatch(updateStaffAsync({ id: editId, payload: editForm }));
        if (updateStaffAsync.rejected.match(result)) {
            toast.error(result.payload ?? "Update failed");
            return;
        }
        toast.success("Staff updated — re-verify phone with Firebase if number changed");
        dispatch(clearEditStaff());
        void dispatch(fetchAdminDashboardData());
    }
    const adminLogout = async () => {
        try {
            await logout();
            navigate("/auth/login", { replace: true });
        }
        catch {
            toast.error("Logout failed. Please try again.");
        }
    };
    if (!appUser)
        return <div className="p-4">Please sign in first.</div>;
    if (!isAdmin)
        return <div className="p-4">You do not have admin access.</div>;
    return (<AdminLayout
        pageTitle="Admin Dashboard"
        description={`Welcome back${appUser?.name ? `, ${appUser.name.split(" ")[0]}` : ""} — here's what's happening today.`}
        actions={<Button variant="destructive" size="sm" onClick={() => void adminLogout()}>
        Sign Out
      </Button>}>
      <div className="space-y-5 md:space-y-6">

      <ErrorBanner message={error} onRetry={retryLoad} />

      {loading ? (
        <SkeletonCards count={3} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard icon={Users} label="Active Staff" value={staff.length} tone="primary" trendLabel="Employees & receptionists" />
          <StatCard icon={Building2} label="Salons" value={salons.length} tone="accent" delay={60} trendLabel="Locations onboarded" />
          <StatCard icon={UserX} label="Pending Setup" value={pendingCount} tone={pendingCount ? "destructive" : "success"} delay={120} trendLabel="Awaiting activation" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="admin-card-hover admin-shadow-sm group flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
              <link.icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{link.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{link.description}</span>
            </span>
          </Link>
        ))}
      </div>

      <Card id="staff-management" className="admin-shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5"/>
              Staff (Employee / Receptionist)
            </CardTitle>
            <CardDescription>
              Create accounts; staff verify phone via Firebase SMS on /staff/verify-otp, then set password and use
              /login.
            </CardDescription>
          </div>
          <Button asChild>
            <Link to="/admin-dashboard/staff/new">
              <UserPlus className="size-4" />
              Create staff
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <SkeletonRows count={4} />
          ) : !staff.length ? (
            <EmptyState
              icon={Users}
              title="No staff members yet"
              description="Create your first employee or receptionist account to get started."
              actionLabel="Create staff"
              onAction={() => navigate("/admin-dashboard/staff/new")}
            />
          ) : (
            <div ref={staffSectionRef}>
              {/* Table view — sm and up */}
              <div className="hidden overflow-x-auto rounded-lg border sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map(s => (<TableRow key={s.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2.5">
                            <AvatarBadge name={s.name} size="sm" />
                            <span>{s.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{s.email}</TableCell>
                        <TableCell>{s.phone}</TableCell>
                        <TableCell>{roleLabel(s.role)}</TableCell>
                        <TableCell><StatusPill status={s.accountStatus ?? "—"} /></TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(s)}>
                            <Pencil className="size-3.5" />
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => void deleteStaff(s.id)}>
                            <Trash2 className="size-3.5" />
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>))}
                  </TableBody>
                </Table>
              </div>

              {/* Card view — mobile */}
              <div className="space-y-2.5 sm:hidden">
                {staff.map((s) => (
                  <div key={s.id} className="admin-shadow-sm rounded-xl border border-border/70 bg-card p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <AvatarBadge name={s.name} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{s.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{roleLabel(s.role)}</p>
                        </div>
                      </div>
                      <StatusPill status={s.accountStatus ?? "—"} />
                    </div>
                    <div className="mt-2.5 space-y-1 text-xs text-muted-foreground">
                      <p className="truncate">{s.email}</p>
                      <p>{s.phone}</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(s)}>
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => void deleteStaff(s.id)}>
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editId ? (<div className="max-w-xl space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-primary" />
                Edit staff
              </p>
              <Input placeholder="Name" value={editForm.name} onChange={e => dispatch(setEditFormField({ field: "name", value: e.target.value }))}/>
              <Input type="email" placeholder="Email" value={editForm.email} onChange={e => dispatch(setEditFormField({ field: "email", value: e.target.value }))}/>
              <Input placeholder="Phone E.164" value={editForm.phone} onChange={e => dispatch(setEditFormField({ field: "phone", value: e.target.value }))}/>
              <Label htmlFor="role-select">Role</Label>
              <Select value={editForm.role} onValueChange={value => dispatch(setEditFormField({ field: "role", value }))}>
                <SelectTrigger id="role-select" className="w-full">
                  <SelectValue placeholder="Select role"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Employee</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                </SelectContent>
              </Select>
              <Label htmlFor="gender-type-select">Stylist gender type</Label>
              <Select value={editForm.genderType ?? "UNISEX"} onValueChange={value => dispatch(setEditFormField({ field: "genderType", value }))}>
                <SelectTrigger id="gender-type-select" className="w-full">
                  <SelectValue placeholder="Select stylist gender type"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEN">Men</SelectItem>
                  <SelectItem value="WOMEN">Women</SelectItem>
                  <SelectItem value="UNISEX">Unisex</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-2 rounded-lg border bg-card p-3">
                <p className="text-sm font-medium">Allowed services</p>
                {!servicesCatalog.length ? <p className="text-xs text-muted-foreground">Create services first.</p> : null}
                {servicesCatalog.map((service) => {
                    const checked = (editForm.allowedServiceIds ?? []).includes(service.id);
                    return (<label key={service.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={checked} onCheckedChange={(value) => toggleAllowedService(service.id, Boolean(value))}/>
                      <span>{service.name}</span>
                    </label>);
                })}
              </div>
              <div className="space-y-2">
                <Label htmlFor="is-active-select">Availability</Label>
                <Select value={editForm.isActive ? "ACTIVE" : "INACTIVE"} onValueChange={value => dispatch(setEditFormField({ field: "isActive", value: value === "ACTIVE" }))}>
                  <SelectTrigger id="is-active-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="sm:flex-1" disabled={mutating} onClick={() => void saveEdit()}>{mutating ? "Saving…" : "Save"}</Button>
                <Button variant="ghost" className="sm:flex-1" onClick={() => dispatch(clearEditStaff())}>
                  Cancel
                </Button>
              </div>
            </div>) : null}
        </CardContent>
      </Card>

      <Card id="salon-management" className="admin-shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5"/>
            Salons ({salons.length})
          </CardTitle>
          <CardDescription>Fill individual address fields; app combines them into one address string before submit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salon-name">Saloon name</Label>
              <Input id="salon-name" placeholder="Salon name" value={newSalon.name} onChange={e => dispatch(setNewSalonField({ field: "name", value: e.target.value }))}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salon-pincode">Pincode</Label>
              <Input id="salon-pincode" placeholder="Pincode" value={newSalon.pincode} onChange={e => dispatch(setNewSalonField({ field: "pincode", value: e.target.value }))}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salon-building-number">Building number</Label>
              <Input id="salon-building-number" placeholder="Building no." value={newSalon.buildingNumber} onChange={e => dispatch(setNewSalonField({ field: "buildingNumber", value: e.target.value }))}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salon-street-name">Street name</Label>
              <Input id="salon-street-name" placeholder="Street name" value={newSalon.streetName} onChange={e => dispatch(setNewSalonField({ field: "streetName", value: e.target.value }))}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salon-area-name">Area name</Label>
              <Input id="salon-area-name" placeholder="Area name" value={newSalon.areaName} onChange={e => dispatch(setNewSalonField({ field: "areaName", value: e.target.value }))}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salon-city-name">City name</Label>
              <Input id="salon-city-name" placeholder="City name" value={newSalon.cityName} onChange={e => dispatch(setNewSalonField({ field: "cityName", value: e.target.value }))}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salon-state-name">State name</Label>
              <Input id="salon-state-name" placeholder="State name" value={newSalon.stateName} onChange={e => dispatch(setNewSalonField({ field: "stateName", value: e.target.value }))}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salon-country-name">Country name</Label>
              <Input id="salon-country-name" placeholder="Country name" value={newSalon.countryName} onChange={e => dispatch(setNewSalonField({ field: "countryName", value: e.target.value }))}/>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <span>{buildSalonAddress(newSalon) || "Address preview will appear here"}</span>
          </div>
          <Button onClick={() => void createSalon()} disabled={mutating}>
            {mutating ? "Creating…" : "Create Salon"}
          </Button>
          {!salons.length ? (
            <EmptyState compact icon={Building2} title="No salons added yet" description="Create your first salon location above." />
          ) : (
            <div ref={salonSectionRef} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {salons.map(salon => (
                <div key={salon.id} className="admin-card-hover admin-shadow-sm rounded-xl border border-border/70 bg-card p-3.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                      <Building2 className="size-4" />
                    </span>
                    <p className="truncate font-semibold">{salon.name}</p>
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    <span>{salon.address}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Hash className="size-3.5 shrink-0" />
                    {salon.pincode}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>);
}
