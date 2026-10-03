"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateAge, updateCustomerProfile } from "@/lib/customer-profile";
import { Cake, Check, Crown, Loader2, LogOut, Mail, Pencil, Phone, User, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { notify } from "@/lib/notify";
import { UserLayout } from "../portal/user-layout";

const GENDER_LABELS = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };

/** Today as YYYY-MM-DD, to cap the date picker — a birthday can't be in the future. */
function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="truncate text-[15px] font-semibold">{children}</div>
      </div>
    </div>
  );
}

const Unset = ({ children }) => <span className="text-sm font-normal text-muted-foreground">{children}</span>;

export default function UserProfilePage() {
  const { appUser, loading, logout, refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", gender: "", dateOfBirth: "" });

  // Re-seed the draft whenever the editor opens or the saved profile changes,
  // so a cancelled edit never leaves stale text in the inputs.
  useEffect(() => {
    if (!appUser) return;
    setForm({
      name: appUser.name ?? "",
      gender: GENDER_LABELS[appUser.gender] ? appUser.gender : "",
      dateOfBirth: appUser.dateOfBirth ?? "",
    });
  }, [appUser, editing]);

  // Enabled as soon as the name is valid and something actually changed.
  const dirty = useMemo(
    () =>
      form.name.trim() !== (appUser?.name ?? "") ||
      form.gender !== (GENDER_LABELS[appUser?.gender] ? appUser.gender : "") ||
      form.dateOfBirth !== (appUser?.dateOfBirth ?? ""),
    [appUser, form]
  );
  const canSave = form.name.trim().length > 0 && dirty && !saving;

  async function handleSave() {
    setSaving(true);
    try {
      await updateCustomerProfile({
        name: form.name.trim(),
        // Omit rather than send "": the endpoint treats a missing key as "leave
        // alone", and there is no way to un-answer gender once it's set.
        ...(form.gender ? { gender: form.gender } : {}),
        dateOfBirth: form.dateOfBirth,
      });
      await refresh();
      setEditing(false);
      notify.success("Profile saved");
    } catch (error) {
      notify.error("Couldn't save your profile", { description: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <UserLayout pageTitle="Profile">
        <Skeleton className="h-96 max-w-2xl rounded-3xl" />
      </UserLayout>
    );
  }

  if (!appUser || appUser.role !== "USER") {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <p>Sign in as a customer to view profile.</p>
        <Button asChild>
          <Link to="/auth/login">Customer login</Link>
        </Button>
      </div>
    );
  }

  const segment = `${appUser.membershipSegment ?? "FREE"}`.toUpperCase();
  const age = calculateAge(form.dateOfBirth);

  return (
    <UserLayout pageTitle="Profile" width="md">
      <div className="space-y-4">
        <section className="flex flex-wrap items-center gap-4 rounded-3xl bg-primary p-5 text-primary-foreground sm:p-6">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-card font-display text-3xl font-bold text-primary">
            {appUser.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 basis-40">
            <h2 className="truncate font-display text-xl font-bold sm:text-2xl">{appUser.name}</h2>
            <p className="truncate text-sm opacity-80">{appUser.email}</p>
          </div>
          <Link
            to="/user-dashboard/membership"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-sm font-semibold"
          >
            <Crown className="size-4" />
            {segment === "FREE" ? "Free" : segment}
          </Link>
        </section>

        <section className="rounded-3xl bg-card p-5 sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Details</h2>
            {editing ? null : (
              <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label htmlFor="profileName" className="flex items-center gap-2">
                  <User className="size-4 text-primary" /> Name
                </Label>
                <Input
                  id="profileName"
                  value={form.name}
                  autoComplete="name"
                  className="h-12 rounded-xl"
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileGender" className="flex items-center gap-2">
                  <UserRound className="size-4 text-primary" /> Gender
                </Label>
                <Select
                  value={form.gender || undefined}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger id="profileGender" className="h-12 w-full rounded-xl">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileDob" className="flex items-center gap-2">
                  <Cake className="size-4 text-primary" /> Birthday
                  {age !== null ? <span className="font-normal text-muted-foreground">· {age} yrs</span> : null}
                </Label>
                <Input
                  id="profileDob"
                  type="date"
                  max={todayIso()}
                  min="1900-01-01"
                  value={form.dateOfBirth}
                  className="h-12 rounded-xl"
                  onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" className="h-11 flex-1 rounded-full" disabled={!canSave} onClick={() => void handleSave()}>
                  {saving ? <Loader2 className="animate-spin" /> : <Check />}
                  Save
                </Button>
                <Button type="button" variant="secondary" className="h-11 rounded-full" disabled={saving} onClick={() => setEditing(false)}>
                  <X /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <InfoRow icon={Mail} label="Email">
                {appUser.email}
              </InfoRow>
              {appUser.phone ? (
                <InfoRow icon={Phone} label="Phone">
                  {appUser.phone}
                </InfoRow>
              ) : null}
              <InfoRow icon={UserRound} label="Gender">
                {GENDER_LABELS[appUser.gender] ?? <Unset>Add gender</Unset>}
              </InfoRow>
              <InfoRow icon={Cake} label="Birthday">
                {appUser.dateOfBirth ? (
                  new Date(`${appUser.dateOfBirth}T00:00:00`).toLocaleDateString([], {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                ) : (
                  <Unset>Add birthday</Unset>
                )}
              </InfoRow>
            </div>
          )}
        </section>

        <Button variant="secondary" className="h-12 w-full rounded-full text-destructive" onClick={() => void logout()}>
          <LogOut /> Sign out
        </Button>
      </div>
    </UserLayout>
  );
}
