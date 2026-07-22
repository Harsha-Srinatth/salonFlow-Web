"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AdminLayout } from "../portal/admin-layout";
export default function CreateStaffPage() {
    const { appUser } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState("STAFF");
    const [genderType, setGenderType] = useState("UNISEX");
    const [allowedServiceIds, setAllowedServiceIds] = useState([]);
    const [isActive, setIsActive] = useState(true);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        void (async () => {
            const token = await getFirebaseIdToken().catch(() => null);
            const headers = {};
            if (token)
                headers.Authorization = `Bearer ${token}`;
            const res = await fetch(toApiUrl("/api/admin/services"), {
                credentials: "include",
                headers,
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok)
                setServices(data.services ?? []);
        })();
    }, []);
    function toggleAllowedService(serviceId, checked) {
        setAllowedServiceIds((current) => checked ? Array.from(new Set([...current, serviceId])) : current.filter((id) => id !== serviceId));
    }
    if (!appUser)
        return <div className="p-4">Sign in as admin first.</div>;
    if (appUser.role !== "ADMIN")
        return <div className="p-4">Admin only.</div>;
    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const token = await getFirebaseIdToken().catch(() => null);
            const headers = {
                "Content-Type": "application/json",
            };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            const res = await fetch(toApiUrl("/api/admin/staff"), {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify({ name, email, phone, role, genderType, allowedServiceIds, isActive }),
            });
            const data = (await res.json());
            if (!res.ok) {
                toast.error(data.error ?? "Failed to create staff");
                return;
            }
            toast.success(data.message ?? "Staff created");
            navigate("/admin-dashboard");
        }
        catch {
            toast.error("Request failed");
        }
        finally {
            setLoading(false);
        }
    }
    return (<AdminLayout pageTitle="Create Staff" actions={<Button asChild variant="outline" size="sm">
          <Link to="/admin-dashboard">Back to dashboard</Link>
        </Button>}>
      <Card>
        <CardHeader>
          <CardTitle>Create staff</CardTitle>
          <CardDescription>
            Employee maps to role STAFF. They verify the phone with Firebase SMS on /staff/verify-otp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Full name</Label>
              <Input id="staff-name" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Work email</Label>
              <Input id="staff-email" type="email" placeholder="Work email" value={email} onChange={e => setEmail(e.target.value)} required/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone (E.164)</Label>
              <Input id="staff-phone" placeholder="Phone E.164 e.g. +919876543210" value={phone} onChange={e => setPhone(e.target.value)} required/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-role">Role</Label>
              <Select value={role} onValueChange={value => setRole(value)}>
                <SelectTrigger id="staff-role" className="w-full">
                  <SelectValue placeholder="Select role"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Employee (STAFF)</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-gender-type">Stylist gender type</Label>
              <Select value={genderType} onValueChange={value => setGenderType(value)}>
                <SelectTrigger id="staff-gender-type" className="w-full">
                  <SelectValue placeholder="Select stylist gender type"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEN">Men</SelectItem>
                  <SelectItem value="WOMEN">Women</SelectItem>
                  <SelectItem value="UNISEX">Unisex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded border p-3">
              <p className="text-sm font-medium">Allowed services</p>
              {!services.length ? <p className="text-xs text-muted-foreground">Create services first.</p> : null}
              {services.map((service) => {
                  const checked = allowedServiceIds.includes(service.id);
                  return (<label key={service.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={checked} onCheckedChange={(value) => toggleAllowedService(service.id, Boolean(value))}/>
                    <span>{service.name}</span>
                  </label>);
              })}
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-active-select">Availability</Label>
              <Select value={isActive ? "ACTIVE" : "INACTIVE"} onValueChange={value => setIsActive(value === "ACTIVE")}>
                <SelectTrigger id="staff-active-select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create staff"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>);
}
