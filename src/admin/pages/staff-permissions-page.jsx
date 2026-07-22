"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  clearEditStaff,
  fetchAdminDashboardData,
  setEditFormField,
  startEditStaff,
  updateStaffAsync,
} from "@/store/admin-dashboard-slice";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AdminLayout } from "../portal/admin-layout";

export default function AdminStaffPermissionsPage() {
  const { appUser, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { staff, servicesCatalog, editId, editForm, loading, mutating, error } = useSelector((state) => state.adminDashboard);

  const [searchText, setSearchText] = useState("");
  const [segment, setSegment] = useState("ALL"); // MEN/WOMEN/UNISEX
  const [activeOnly, setActiveOnly] = useState(true);

  const stylists = useMemo(() => staff.filter((s) => s.role === "STAFF"), [staff]);
  const filteredStylists = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return stylists.filter((s) => {
      if (activeOnly && !s.isActive) return false;
      if (segment !== "ALL" && `${s.genderType ?? "UNISEX"}`.toUpperCase() !== segment) return false;
      if (!q) return true;
      const hay = `${s.name ?? ""} ${s.email ?? ""} ${s.phone ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [activeOnly, searchText, segment, stylists]);

  useEffect(() => {
    if (appUser?.role !== "ADMIN") return;
    void dispatch(fetchAdminDashboardData());
  }, [appUser?.role, dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

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

  function toggleAllowedService(serviceId, checked) {
    const current = Array.isArray(editForm.allowedServiceIds) ? editForm.allowedServiceIds : [];
    const next = checked ? Array.from(new Set([...current, serviceId])) : current.filter((id) => id !== serviceId);
    dispatch(setEditFormField({ field: "allowedServiceIds", value: next }));
  }

  const adminLogout = async () => {
    await logout();
    navigate("/auth/login", { replace: true });
  };

  if (!appUser) return <div className="p-4">Please sign in first.</div>;
  if (appUser.role !== "ADMIN") return <div className="p-4">Admin only.</div>;

  return (
    <AdminLayout
      pageTitle="Staff Permissions"
      actions={
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin-dashboard">Dashboard</Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => void adminLogout()}>
            Sign out
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Assign services to stylists</CardTitle>
            <p className="text-xs text-muted-foreground">
              Booking availability depends on stylist <span className="font-medium">allowed services</span>. Unisex does not mean “all services”.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <div className="rounded-md border p-3 text-xs text-muted-foreground">Loading...</div> : null}
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="w-full md:w-80"
                placeholder="Search stylist name/email/phone"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Gender type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="MEN">Men</SelectItem>
                  <SelectItem value="WOMEN">Women</SelectItem>
                  <SelectItem value="UNISEX">Unisex</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={activeOnly} onCheckedChange={(v) => setActiveOnly(Boolean(v))} />
                Active only
              </label>
            </div>

            {!filteredStylists.length ? (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">No stylists found.</div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {filteredStylists.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className={`rounded-md border p-3 text-left transition-colors ${
                      editId === s.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => dispatch(startEditStaff(s))}
                  >
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.email} • {s.genderType ?? "UNISEX"} • {s.isActive ? "Active" : "Inactive"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Allowed services: {(s.allowedServiceIds ?? []).length}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {editId ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit stylist permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Stylist gender type</Label>
                  <Select value={editForm.genderType ?? "UNISEX"} onValueChange={(value) => dispatch(setEditFormField({ field: "genderType", value }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEN">Men</SelectItem>
                      <SelectItem value="WOMEN">Women</SelectItem>
                      <SelectItem value="UNISEX">Unisex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Availability</Label>
                  <Select value={editForm.isActive ? "ACTIVE" : "INACTIVE"} onValueChange={(value) => dispatch(setEditFormField({ field: "isActive", value: value === "ACTIVE" }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-sm font-medium">Allowed services</p>
                <p className="text-xs text-muted-foreground">Select the services this stylist can perform.</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {!servicesCatalog.length ? <p className="text-xs text-muted-foreground">Create services first.</p> : null}
                  {servicesCatalog.map((service) => {
                    const checked = (editForm.allowedServiceIds ?? []).includes(service.id);
                    return (
                      <label key={service.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={checked} onCheckedChange={(v) => toggleAllowedService(service.id, Boolean(v))} />
                        <span>{service.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button disabled={mutating} onClick={() => void save()}>
                  {mutating ? "Saving..." : "Save permissions"}
                </Button>
                <Button variant="ghost" onClick={() => dispatch(clearEditStaff())}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AdminLayout>
  );
}

