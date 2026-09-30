"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorBanner } from "@/admin/components/error-banner";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { Mail, Phone, ShieldCheck, User, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    const [servicesError, setServicesError] = useState("");
    async function loadServices() {
        setServicesError("");
        try {
            const token = await getFirebaseIdToken().catch(() => null);
            const headers = {};
            if (token)
                headers.Authorization = `Bearer ${token}`;
            const res = await fetch(toApiUrl("/api/admin/services"), {
                credentials: "include",
                headers,
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setServices(data.services ?? []);
                return;
            }
            const message = data.error ?? "Could not load services";
            setServicesError(message);
            toast.error(message);
        }
        catch {
            const message = "Could not load services";
            setServicesError(message);
            toast.error(message);
        }
    }
    useEffect(() => {
        void loadServices();
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
        if (!name.trim() || !email.trim() || !phone.trim()) {
            toast.error("Name, email, and phone are required");
            return;
        }
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
            toast.error("Request failed. Check your connection and try again.");
        }
        finally {
            setLoading(false);
        }
    }
    return (<AdminLayout pageTitle="Create Staff" description="Onboard a new employee or receptionist.">
      <Card className="admin-shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            Create staff
          </CardTitle>
          <CardDescription>
            Employee maps to role STAFF. They verify the phone with Firebase SMS on /staff/verify-otp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorBanner message={servicesError} onRetry={loadServices} className="mb-4" />
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="staff-name" className="flex items-center gap-1.5">
                  <User className="size-3.5" /> Full name
                </Label>
                <Input id="staff-name" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-email" className="flex items-center gap-1.5">
                  <Mail className="size-3.5" /> Work email
                </Label>
                <Input id="staff-email" type="email" placeholder="Work email" value={email} onChange={e => setEmail(e.target.value)} required/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-phone" className="flex items-center gap-1.5">
                  <Phone className="size-3.5" /> Phone (E.164)
                </Label>
                <Input id="staff-phone" placeholder="+919876543210" value={phone} onChange={e => setPhone(e.target.value)} required/>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-medium">Allowed services</p>
              {!services.length ? <p className="text-xs text-muted-foreground">Create services first.</p> : null}
              <div className="grid gap-2 sm:grid-cols-2">
                {services.map((service) => {
                    const checked = allowedServiceIds.includes(service.id);
                    return (<label key={service.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={checked} onCheckedChange={(value) => toggleAllowedService(service.id, Boolean(value))}/>
                      <span>{service.name}</span>
                    </label>);
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-active-select" className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" /> Availability
              </Label>
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
              <UserPlus className="size-4" />
              {loading ? "Creating…" : "Create staff"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>);
}
