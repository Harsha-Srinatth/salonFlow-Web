"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ConciergeBell, Mail, Phone, Scissors, ShieldCheck, User, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedTabBar, ButtonLoadingMorph, FloatingLabelInput, ProgressRing, useAsyncAction } from "@/components/kit";
import { haptic, interaction, spring } from "@/components/motion";
import { useAuth } from "@/components/auth/auth-provider";
import { AllowedServicesPicker } from "@/admin/components/allowed-services-picker";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { Panel } from "@/admin/components/panel";
import { Switch } from "@/admin/components/switch";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { notify } from "@/lib/notify";
import { iconForAudience } from "@/lib/service-icons";
import { cn } from "@/lib/utils";
import { AdminLayout } from "../portal/admin-layout";

const ROLES = [
  { value: "STAFF", title: "Stylist", description: "Does services, can be booked", icon: Scissors },
  { value: "RECEPTIONIST", title: "Reception", description: "Desk, walk-ins, payments", icon: ConciergeBell },
];
const GENDER_TYPES = ["UNISEX", "WOMEN", "MEN"].map((value) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase(), icon: iconForAudience(value) }));
const E164 = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function CreateStaffPage() {
  const reduce = useReducedMotion();
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
  const [touched, setTouched] = useState({});
  const [servicesError, setServicesError] = useState("");
  const submitAction = useAsyncAction({ successMs: 900 });

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
      throw new Error(data.error ?? "Could not load services");
    } catch (error) {
      setServicesError(error.message ?? "Could not load services");
      throw error;
    }
  }, []);

  useEffect(() => {
    loadServices().catch(() => {});
  }, [loadServices]);

  const nameOk = name.trim().length >= 2;
  const emailOk = EMAIL.test(email.trim());
  const phoneOk = E164.test(phone.replace(/\s/g, ""));
  const formOk = nameOk && emailOk && phoneOk;
  const mark = (field) => setTouched((t) => ({ ...t, [field]: true }));
  const isStylist = role === "STAFF";
  const steps = [nameOk, emailOk, phoneOk, !isStylist || allowedServiceIds.length > 0];
  const done = steps.filter(Boolean).length;

  if (!appUser || appUser.role !== "ADMIN") {
    return (
      <AdminLayout pageTitle="Add staff">
        <EmptyState illustration="search" title="Admins only" />
      </AdminLayout>
    );
  }

  async function submit() {
    setTouched({ name: true, email: true, phone: true });
    if (!formOk) {
      notify.warning("Fix the highlighted fields");
      throw new Error("invalid");
    }
    const token = await getFirebaseIdToken().catch(() => null);
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    let res;
    let data = {};
    try {
      res = await fetch(toApiUrl("/api/admin/staff"), {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.replace(/\s/g, ""), role, genderType, allowedServiceIds: isStylist ? allowedServiceIds : [], isActive }),
      });
      data = await res.json().catch(() => ({}));
    } catch (error) {
      notify.error("Request failed", { description: "Check your connection and try again." });
      throw error;
    }
    if (!res.ok) {
      notify.error(data.error ?? "Failed to create staff");
      throw new Error(data.error);
    }
    notify.success(data.message ?? "Staff created", { description: "They verify their phone on first sign-in." });
    setTimeout(() => navigate("/admin-dashboard/staff"), 900);
  }

  return (
    <AdminLayout pageTitle="Add staff" description="Stylist or reception">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitAction.run(submit);
        }}
        noValidate
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="min-w-0 space-y-5">
          <ErrorBanner message={servicesError} onRetry={loadServices} />

          <Panel title="Who" icon={User} subtitle="They verify by SMS on first sign-in" bodyClassName="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            <FloatingLabelInput className="sm:col-span-2" label="Full name" icon={User} autoFocus autoComplete="off" value={name} onBlur={() => mark("name")} onChange={(e) => setName(e.target.value)} success={nameOk} error={touched.name && !nameOk ? "Enter their full name" : undefined} />
            <FloatingLabelInput label="Work email" icon={Mail} type="email" autoComplete="off" value={email} onBlur={() => mark("email")} onChange={(e) => setEmail(e.target.value)} success={emailOk} error={touched.email && !emailOk ? "Enter a valid email" : undefined} />
            <FloatingLabelInput label="Phone (+91…)" icon={Phone} type="tel" inputMode="tel" autoComplete="off" value={phone} onBlur={() => mark("phone")} onChange={(e) => setPhone(e.target.value)} success={phoneOk} error={touched.phone && !phoneOk ? "Use +919876543210" : undefined} />
          </Panel>

          <Panel title="Role" icon={ShieldCheck} bodyClassName="space-y-5 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Role">
              {ROLES.map((r) => {
                const active = role === r.value;
                const Icon = r.icon;
                return (
                  <motion.button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    whileTap={reduce ? undefined : interaction.press}
                    onClick={() => {
                      haptic("tap");
                      setRole(r.value);
                    }}
                    className={cn("relative rounded-2xl p-4 text-left ring-1 ring-inset transition-colors", active ? "bg-portal/8 ring-portal/30" : "bg-card ring-border hover:bg-muted/60")}
                  >
                    {active ? <motion.span layoutId="staff-role-ring" className="absolute inset-0 rounded-2xl ring-2 ring-portal" transition={reduce ? { duration: 0 } : spring.snappy} /> : null}
                    <span className={cn("relative grid size-10 place-items-center rounded-xl", active ? "bg-portal text-portal-foreground" : "bg-muted text-ink-neutral")}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <p className="relative mt-3 font-semibold">{r.title}</p>
                    <p className="relative text-caption text-ink-neutral">{r.description}</p>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence initial={false}>
              {isStylist ? (
                <motion.div key="stylist" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.soft} className="space-y-4">
                  <AnimatedTabBar fullWidth label="Stylist type" items={GENDER_TYPES} value={genderType} onChange={setGenderType} />
                  <AllowedServicesPicker services={services} selected={allowedServiceIds} onChange={setAllowedServiceIds} />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3">
              <span className="text-sm font-semibold">{isActive ? "Active from day one" : "Created switched off"}</span>
              <Switch checked={isActive} onChange={setIsActive} label="Active from day one" />
            </div>
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--topbar-h)+1rem)] lg:self-start">
          <Panel bodyClassName="space-y-4 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <ProgressRing value={done} max={steps.length} size={64} stroke={6} label="Form progress" showValue={false}>
                <AvatarBadge name={name || "New"} size="md" />
              </ProgressRing>
              <div className="min-w-0">
                <p className="truncate font-display text-headline font-semibold">{name.trim() || "New teammate"}</p>
                <p className="text-caption text-ink-neutral">{isStylist ? `${GENDER_TYPES.find((g) => g.value === genderType)?.label} stylist` : "Reception"}</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                ["Name", nameOk],
                ["Email", emailOk],
                ["Phone", phoneOk],
                ...(isStylist ? [[allowedServiceIds.length ? `${allowedServiceIds.length} services` : "No services yet", allowedServiceIds.length > 0]] : []),
              ].map(([label, ok]) => (
                <li key={label} className="flex items-center gap-2">
                  <motion.span animate={{ scale: ok && !reduce ? [1, 1.25, 1] : 1 }} transition={spring.bouncy} className={cn("grid size-5 place-items-center rounded-full", ok ? "bg-success/15 text-ink-success" : "bg-muted text-ink-neutral")}>
                    <Check className="size-3" aria-hidden />
                  </motion.span>
                  <span className={ok ? "font-semibold" : "text-ink-neutral"}>{label}</span>
                </li>
              ))}
            </ul>
            <ButtonLoadingMorph type="submit" fullWidth icon={UserPlus} state={submitAction.state} loadingLabel="Creating…" successLabel="Created" errorLabel="Fix and retry">
              Create
            </ButtonLoadingMorph>
            <ButtonLoadingMorph variant="ghost" fullWidth onClick={() => navigate(-1)}>
              Cancel
            </ButtonLoadingMorph>
          </Panel>
        </aside>
      </form>
    </AdminLayout>
  );
}
