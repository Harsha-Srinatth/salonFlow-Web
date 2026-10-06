"use client";
import { AnimatePresence, motion } from "motion/react";
import { BorderBeam } from "border-beam";
import { Check, CheckCircle2, ConciergeBell, Loader2, Mail, Phone, Scissors, Search, ShieldCheck, User, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { ErrorBanner } from "@/admin/components/error-banner";
import { Switch } from "@/admin/components/service-editor-drawer";
import { ToggleChip } from "@/admin/components/toggle-chip";
import { SegmentedControl } from "@/components/fx/segmented-control";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { cn } from "@/lib/utils";
import { AdminLayout } from "../portal/admin-layout";

const ROLES = [
  { value: "STAFF", title: "Employee", description: "Performs services and appears for booking.", icon: Scissors },
  { value: "RECEPTIONIST", title: "Receptionist", description: "Manages bookings, walk-ins and payments at the desk.", icon: ConciergeBell },
];
const GENDER_TYPES = [
  { value: "UNISEX", label: "Unisex" },
  { value: "WOMEN", label: "Women" },
  { value: "MEN", label: "Men" },
];
const E164 = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const categoryOf = (service) => `${service.category ?? ""}`.trim() || "General";

function Field({ id, icon: Icon, label, valid, error, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Icon className="size-3.5" /> {label}
        <AnimatePresence initial={false}>
          {valid ? (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="ml-auto text-success">
              <CheckCircle2 className="size-4" />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </Label>
      {children}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden text-xs font-medium text-destructive">
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

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
  const [serviceQuery, setServiceQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [servicesError, setServicesError] = useState("");

  const loadServices = useCallback(async () => {
    setServicesError("");
    try {
      const token = await getFirebaseIdToken().catch(() => null);
      const res = await fetch(toApiUrl("/api/admin/services"), { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setServices(data.services ?? []);
        return;
      }
      const message = data.error ?? "Could not load services";
      setServicesError(message);
      toast.error(message);
    } catch {
      const message = "Could not load services";
      setServicesError(message);
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const nameOk = name.trim().length >= 2;
  const emailOk = EMAIL.test(email.trim());
  const phoneOk = E164.test(phone.replace(/\s/g, ""));
  const formOk = nameOk && emailOk && phoneOk;
  const mark = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const grouped = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    const groups = new Map();
    for (const service of services) {
      if (q && !`${service.name ?? ""} ${service.category ?? ""}`.toLowerCase().includes(q)) continue;
      groups.set(categoryOf(service), [...(groups.get(categoryOf(service)) ?? []), service]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [services, serviceQuery]);

  if (!appUser) return <div className="p-4">Sign in as admin first.</div>;
  if (appUser.role !== "ADMIN") return <div className="p-4">Admin only.</div>;

  const isStylist = role === "STAFF";

  async function submit(e) {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true });
    if (!formOk) {
      toast.error("Fix the highlighted fields first");
      return;
    }
    setLoading(true);
    try {
      const token = await getFirebaseIdToken().catch(() => null);
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(toApiUrl("/api/admin/staff"), {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.replace(/\s/g, ""), role, genderType, allowedServiceIds: isStylist ? allowedServiceIds : [], isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create staff");
        return;
      }
      toast.success(data.message ?? "Staff created");
      navigate("/admin-dashboard");
    } catch {
      toast.error("Request failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout pageTitle="Create Staff" description="Onboard a new employee or receptionist.">
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <ErrorBanner message={servicesError} onRetry={() => void loadServices()} />

          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="admin-shadow-sm rounded-2xl border border-border/70 bg-card">
            <header className="border-b border-border/60 bg-muted/20 px-5 py-4">
              <h2 className="font-display text-base font-semibold">Who are they?</h2>
              <p className="text-xs text-muted-foreground">They verify the phone number by SMS the first time they sign in.</p>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="staff-name" icon={User} label="Full name" valid={nameOk} error={touched.name && !nameOk ? "Enter their full name" : ""}>
                  <Input id="staff-name" autoFocus placeholder="Full name" value={name} onBlur={() => mark("name")} onChange={(e) => setName(e.target.value)} />
                </Field>
              </div>
              <Field id="staff-email" icon={Mail} label="Work email" valid={emailOk} error={touched.email && !emailOk ? "Enter a valid email address" : ""}>
                <Input id="staff-email" type="email" placeholder="name@salon.com" value={email} onBlur={() => mark("email")} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field id="staff-phone" icon={Phone} label="Phone (with country code)" valid={phoneOk} error={touched.phone && !phoneOk ? "Use the format +919876543210" : ""}>
                <Input id="staff-phone" type="tel" placeholder="+919876543210" value={phone} onBlur={() => mark("phone")} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="admin-shadow-sm rounded-2xl border border-border/70 bg-card">
            <header className="border-b border-border/60 bg-muted/20 px-5 py-4">
              <h2 className="font-display text-base font-semibold">Role</h2>
            </header>
            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Role">
                {ROLES.map((r) => {
                  const active = role === r.value;
                  const Icon = r.icon;
                  return (
                    <motion.button key={r.value} type="button" role="radio" aria-checked={active} whileTap={{ scale: 0.98 }} onClick={() => setRole(r.value)} className={cn("relative rounded-xl border p-4 text-left transition-colors", active ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                      {active ? <motion.span layoutId="staff-role-ring" className="absolute inset-0 rounded-xl ring-2 ring-primary" transition={{ type: "spring", stiffness: 500, damping: 36 }} /> : null}
                      <span className={cn("relative grid size-9 place-items-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                        <Icon className="size-[18px]" />
                      </span>
                      <p className="relative mt-3 font-medium">{r.title}</p>
                      <p className="relative mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence initial={false}>
                {isStylist ? (
                  <motion.div key="stylist" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Stylist type</p>
                        <SegmentedControl label="Stylist gender type" options={GENDER_TYPES} value={genderType} onChange={setGenderType} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">Allowed services</p>
                            <p className="text-xs text-muted-foreground">Only these can be booked with this stylist. You can change them later.</p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {allowedServiceIds.length} of {services.length}
                          </span>
                        </div>
                        {services.length ? (
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input value={serviceQuery} onChange={(e) => setServiceQuery(e.target.value)} placeholder="Filter services" aria-label="Filter services" className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" />
                          </div>
                        ) : (
                          <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">Create services first.</p>
                        )}
                        {grouped.map(([category, list]) => {
                          const ids = list.map((s) => s.id);
                          const all = ids.every((id) => allowedServiceIds.includes(id));
                          return (
                            <div key={category} className="rounded-xl border bg-muted/20 p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
                                <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setAllowedServiceIds((cur) => (all ? cur.filter((id) => !ids.includes(id)) : Array.from(new Set([...cur, ...ids]))))}>
                                  {all ? "Remove all" : "Add all"}
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {list.map((service) => (
                                  <ToggleChip key={service.id} size="sm" selected={allowedServiceIds.includes(service.id)} onClick={() => setAllowedServiceIds((cur) => (cur.includes(service.id) ? cur.filter((id) => id !== service.id) : [...cur, service.id]))}>
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

              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Active from day one</p>
                    <p className="text-xs text-muted-foreground">{isActive ? "They can be booked or sign in once verified." : "Created but switched off until you activate them."}</p>
                  </div>
                </div>
                <Switch checked={isActive} onChange={setIsActive} label="Active from day one" />
              </div>
            </div>
          </motion.section>
        </div>

        {/* Live summary */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="admin-shadow-sm space-y-4 rounded-2xl border border-border/70 bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
            <div className="flex items-center gap-3">
              <AvatarBadge name={name || "New"} />
              <div className="min-w-0">
                <p className="truncate font-medium">{name.trim() || "New team member"}</p>
                <p className="text-xs text-muted-foreground">{isStylist ? `${GENDER_TYPES.find((g) => g.value === genderType)?.label} stylist` : "Receptionist"}</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                ["Name", nameOk],
                ["Email", emailOk],
                ["Phone", phoneOk],
              ].map(([label, ok]) => (
                <li key={label} className="flex items-center gap-2">
                  <span className={cn("grid size-5 place-items-center rounded-full", ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                    <Check className="size-3" />
                  </span>
                  <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
                </li>
              ))}
              {isStylist ? (
                <li className="flex items-center gap-2">
                  <span className={cn("grid size-5 place-items-center rounded-full", allowedServiceIds.length ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>
                    <Check className="size-3" />
                  </span>
                  <span className={allowedServiceIds.length ? "" : "text-muted-foreground"}>{allowedServiceIds.length ? `${allowedServiceIds.length} services allowed` : "No services yet (they cannot be booked)"}</span>
                </li>
              ) : null}
            </ul>
            <BorderBeam active={formOk && !loading} className="w-full">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                {loading ? "Creating…" : "Create staff"}
              </Button>
            </BorderBeam>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate(-1)} disabled={loading}>
              Cancel
            </Button>
          </motion.div>
        </aside>
      </form>
    </AdminLayout>
  );
}
