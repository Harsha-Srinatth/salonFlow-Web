"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Building2, Calendar, Users } from "lucide-react";
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
export default function AdminDashboardPage() {
    const { appUser, logout } = useAuth();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { staff, salons, servicesCatalog, newSalon, editId, editForm, loading, mutating } = useSelector((state) => state.adminDashboard);
    const kpis = [
        { label: "Active Staff", value: String(staff.length) },
        { label: "Salons", value: String(salons.length) },
        { label: "Pending Setup", value: String(staff.filter(s => s.accountStatus !== "ACTIVE").length) },
    ];
    const isAdmin = appUser?.role === "ADMIN";
    useEffect(() => {
        if (!isAdmin)
            return;
        void dispatch(fetchAdminDashboardData());
    }, [dispatch, isAdmin]);
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
    return (<AdminLayout pageTitle="Admin Dashboard" actions={<Button variant="destructive" size="sm" onClick={() => void adminLogout()}>
        Sign Out
      </Button>}>
      <div className="space-y-5 text-sm md:space-y-6">
      {loading ? <div className="rounded-md border p-3 text-xs text-muted-foreground">Loading dashboard data...</div> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map(kpi => (<Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold md:text-2xl">{kpi.value}</p>
            </CardContent>
          </Card>))}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5"/>
              Booking management
            </CardTitle>
            <CardDescription>
              Track appointments, status changes, and booking details from the admin side.
            </CardDescription>
          </div>
          <Button asChild>
            <Link to="/admin-dashboard/appointments">Open bookings</Link>
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Service management</CardTitle>
            <CardDescription>
              Add new services first. Discounts can be announced later as a separate admin action.
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link to="/admin-dashboard/services">Open services</Link>
          </Button>
        </CardHeader>
      </Card>

      <Card id="staff-management">
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
            <Link to="/admin-dashboard/staff/new">Create staff</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
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
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell>{s.phone}</TableCell>
                    <TableCell>{roleLabel(s.role)}</TableCell>
                    <TableCell>{s.accountStatus ?? "—"}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(s)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void deleteStaff(s.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>))}
              </TableBody>
            </Table>
          </div>

          {editId ? (<div className="max-w-xl space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Edit staff</p>
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
              <div className="space-y-2 rounded border p-3">
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
              <div className="flex gap-2">
                <Button onClick={() => void saveEdit()}>Save</Button>
                <Button variant="ghost" onClick={() => dispatch(clearEditStaff())}>
                  Cancel
                </Button>
              </div>
            </div>) : null}
        </CardContent>
      </Card>

      <Card id="salon-management">
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
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            Preview: {buildSalonAddress(newSalon) || "Address preview will appear here"}
          </div>
          <Button onClick={() => void createSalon()} disabled={mutating}>Create Salon</Button>
          <div className="space-y-2">
            {salons.map(salon => (<div key={salon.id} className="rounded border p-3 text-sm">
                <p className="font-semibold">{salon.name}</p>
                <p>{salon.address}</p>
                <p>{salon.pincode}</p>
              </div>))}
          </div>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>);
}
