"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Award,
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
import { Link } from "react-router-dom";
import { UserLayout } from "../portal/user-layout";

export default function UserProfilePage() {
  const { appUser, loading, logout } = useAuth();

  if (loading) {
    return (
      <UserLayout pageTitle="Profile">
        <div className="flex items-center justify-center h-96">
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
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
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Personal information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="pb-4 border-b border-border/50 last:border-0 last:pb-0">
              <p className="text-sm text-muted-foreground font-medium mb-1">Full name</p>
              <p className="text-base font-semibold text-foreground">{appUser.name}</p>
            </div>
            <div className="pb-4 border-b border-border/50 last:border-0 last:pb-0">
              <p className="text-sm text-muted-foreground font-medium mb-1">Email address</p>
              <p className="text-base font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                {appUser.email}
              </p>
            </div>
            {appUser.phone && (
              <div className="pb-4 border-b border-border/50 last:border-0 last:pb-0">
                <p className="text-sm text-muted-foreground font-medium mb-1">Phone number</p>
                <p className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {appUser.phone}
                </p>
              </div>
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
