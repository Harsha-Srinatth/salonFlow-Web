"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Award,
  Cake,
  Calendar,
  Clock,
  LogOut,
  Mail,
  Phone,
  User,
  Edit3,
  Zap,
  CheckCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { UserLayout } from "../portal/user-layout";
import { LoadingOrb } from "@/components/shared/loading-orb";

const GENDER_LABELS = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };

/** Today as YYYY-MM-DD, to cap the date picker — a birthday can't be in the future. */
function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
}

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

  async function handleSave() {
    setSaving(true);
    try {
      await updateCustomerProfile({
        name: form.name,
        // Omit rather than send "": the endpoint treats a missing key as "leave
        // alone", and there is no way to un-answer gender once it's set.
        ...(form.gender ? { gender: form.gender } : {}),
        dateOfBirth: form.dateOfBirth,
      });
      await refresh();
      setEditing(false);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.message ?? "Could not save your profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <UserLayout pageTitle="Profile">
        <LoadingOrb label="Loading your profile…" className="h-96" />
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

  const membershipSegment = `${appUser.membershipSegment ?? "FREE"}`.toUpperCase();
  const createdDate = new Date().toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <UserLayout
      pageTitle="My Profile"
      actions={
        <Button variant="destructive" onClick={() => void logout()}>
          <LogOut className="mr-2 w-4 h-4" />
          Sign out
        </Button>
      }
    >
      <div className="space-y-6 max-w-2xl">
        {/* Profile Header Card */}
        <Card className="border-primary/20 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />
          <CardContent className="pt-0 px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-6 -mt-12 mb-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-5xl font-bold shadow-lg ring-4 ring-card">
                {appUser.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 pb-1">
                <h1 className="text-3xl font-bold text-foreground">{appUser.name}</h1>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4" />
                  {appUser.email}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                <Award className="w-4 h-4" />
                {membershipSegment === "FREE" ? "Free member" : `${membershipSegment} member`}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Personal information
            </CardTitle>
            {editing ? null : (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit3 className="mr-2 w-4 h-4" />
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {editing ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="profileName">Full name</Label>
                  <Input
                    id="profileName"
                    value={form.name}
                    autoComplete="name"
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileGender">Gender</Label>
                  <Select
                    value={form.gender || undefined}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger id="profileGender" className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Decides which services, stylists and reward cards you're shown.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileDob">Date of birth</Label>
                  <Input
                    id="profileDob"
                    type="date"
                    max={todayIso()}
                    min="1900-01-01"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {calculateAge(form.dateOfBirth) !== null
                      ? `You're ${calculateAge(form.dateOfBirth)} — we'll use this for birthday offers.`
                      : "Optional. We'll use it for birthday offers."}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    Email and phone are verified when you sign in and can't be changed here — contact the salon if
                    they're wrong.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                  <Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="pb-4 border-b border-border/50">
                  <p className="text-sm text-muted-foreground font-medium mb-1">Full name</p>
                  <p className="text-base font-semibold text-foreground">{appUser.name}</p>
                </div>
                <div className="pb-4 border-b border-border/50">
                  <p className="text-sm text-muted-foreground font-medium mb-1">Email address</p>
                  <p className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {appUser.email}
                  </p>
                </div>
                {appUser.phone && (
                  <div className="pb-4 border-b border-border/50">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Phone number</p>
                    <p className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {appUser.phone}
                    </p>
                  </div>
                )}
                <div className="pb-4 border-b border-border/50">
                  <p className="text-sm text-muted-foreground font-medium mb-1">Gender</p>
                  {GENDER_LABELS[appUser.gender] ? (
                    <p className="text-base font-semibold text-foreground">{GENDER_LABELS[appUser.gender]}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Not set — add it so your services, stylists and reward cards match you.
                    </p>
                  )}
                </div>
                <div className="last:border-0 last:pb-0">
                  <p className="text-sm text-muted-foreground font-medium mb-1">Date of birth</p>
                  {appUser.dateOfBirth ? (
                    <p className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Cake className="w-4 h-4 text-muted-foreground" />
                      {new Date(`${appUser.dateOfBirth}T00:00:00`).toLocaleDateString([], {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {appUser.age !== null && appUser.age !== undefined ? (
                        <span className="text-sm font-normal text-muted-foreground">({appUser.age} years old)</span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not set — add it to get birthday offers.</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-accent" />
              Account status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-2">Membership plan</p>
                <p className="text-2xl font-bold text-primary">
                  {membershipSegment === "FREE" ? "Free" : membershipSegment}
                </p>
                {membershipSegment === "FREE" && (
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to="/user-dashboard/membership">Upgrade to premium</Link>
                  </Button>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground font-medium mb-2">Member since</p>
                <p className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {createdDate}
                </p>
              </div>
            </div>

            {membershipSegment !== "FREE" && (
              <div className="rounded-lg bg-success/10 border border-success/30 p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-success text-sm">Member benefits active</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You're enjoying exclusive discounts and offers on every visit!
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline" size="lg">
              <Link to="/user-dashboard/appointments">
                <span className="text-lg mr-3">📅</span>
                <span className="font-medium">Book an appointment</span>
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline" size="lg">
              <Link to="/user-dashboard/offers">
                <span className="text-lg mr-3">🎁</span>
                <span className="font-medium">View available offers</span>
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline" size="lg">
              <Link to="/user-dashboard/booking-history">
                <span className="text-lg mr-3">📜</span>
                <span className="font-medium">View booking history</span>
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline" size="lg">
              <Link to="/user-dashboard/membership">
                <span className="text-lg mr-3">👑</span>
                <span className="font-medium">Membership details</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out Section */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-destructive flex items-center gap-2">
              <LogOut className="w-5 h-5" />
              Sign out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign out of your account on this device. You'll need to log in again to access your profile.
            </p>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              size="lg"
              onClick={() => void logout()}
            >
              <LogOut className="mr-2 w-4 h-4" />
              Sign out now
            </Button>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
