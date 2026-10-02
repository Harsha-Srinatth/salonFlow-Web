"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Calendar,
  Crown,
  Sparkles,
  Tag,
  TrendingUp,
  Zap,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { UserLayout } from "../portal/user-layout";
import { LoadingOrb } from "@/components/shared/loading-orb";

export default function UserDashboardPage() {
  const { appUser, loading, logout } = useAuth();
  const isFreeMember = `${appUser?.membershipSegment ?? "FREE"}`.toUpperCase() === "FREE";

  if (loading) {
    return (
      <UserLayout pageTitle="Dashboard">
        <LoadingOrb label="Loading your dashboard…" className="h-96" />
      </UserLayout>
    );
  }

  if (!appUser || appUser.role !== "USER") {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <p>Sign in as a customer to view this page.</p>
        <Button asChild>
          <Link to="/auth/login">Customer login</Link>
        </Button>
      </div>
    );
  }

  return (
    <UserLayout
      pageTitle="Dashboard"
      actions={
        <Button variant="destructive" onClick={() => void logout()}>
          Sign out
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Hero Welcome Section */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-8 overflow-hidden relative">
          <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                <Sparkles className="w-4 h-4" />
                Welcome back
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                Hey, {appUser.name.split(" ")[0]}! 👋
              </h2>
              <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
                {isFreeMember
                  ? "Ready for your next pampering session? Book your appointment and discover exclusive member benefits."
                  : "You're all set! Book your next appointment and enjoy your premium member benefits."}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div>
          <h3 className="mb-4 text-xl font-semibold text-foreground">Quick actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Book Now */}
            <Button
              asChild
              className="h-auto flex-col items-start p-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
            >
              <Link to="/user-dashboard/appointments">
                <Calendar className="w-6 h-6 mb-3" />
                <span className="font-bold text-base">Book now</span>
                <span className="text-xs opacity-90 font-medium">Schedule your service</span>
              </Link>
            </Button>

            {/* View Offers */}
            <Button
              asChild
              variant="outline"
              className="h-auto flex-col items-start p-5 rounded-xl hover:bg-muted transition-all"
            >
              <Link to="/user-dashboard/offers">
                <Tag className="w-6 h-6 mb-3 text-accent" />
                <span className="font-bold text-base">View offers</span>
                <span className="text-xs opacity-75 font-medium">Save up to 40%</span>
              </Link>
            </Button>

            {/* Membership */}
            <Button
              asChild
              variant="outline"
              className="h-auto flex-col items-start p-5 rounded-xl hover:bg-muted transition-all"
            >
              <Link to="/user-dashboard/membership">
                <Crown className="w-6 h-6 mb-3 text-primary" />
                <span className="font-bold text-base">Membership</span>
                <span className="text-xs opacity-75 font-medium">Unlock benefits</span>
              </Link>
            </Button>

            {/* History */}
            <Button
              asChild
              variant="outline"
              className="h-auto flex-col items-start p-5 rounded-xl hover:bg-muted transition-all"
            >
              <Link to="/user-dashboard/booking-history">
                <TrendingUp className="w-6 h-6 mb-3 text-accent" />
                <span className="font-bold text-base">History</span>
                <span className="text-xs opacity-75 font-medium">Your bookings</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Membership CTA (Free users only) */}
        {isFreeMember && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 overflow-hidden relative">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-accent" />
                💎 Upgrade to premium
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Unlock exclusive member benefits on every visit:
              </p>
              <ul className="space-y-2">
                {[
                  "Up to 40% discount on services",
                  "Exclusive combo deals & seasonal offers",
                  "Priority booking & VIP support",
                ].map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-foreground font-medium">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full mt-4">
                <Link to="/user-dashboard/membership">
                  Explore membership plans
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div>
          <h3 className="mb-4 text-xl font-semibold text-foreground">Your stats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-primary">0</p>
                  <p className="text-sm text-muted-foreground font-medium">Upcoming appointments</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-accent">0</p>
                  <p className="text-sm text-muted-foreground font-medium">Total visits</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-success">₹0</p>
                  <p className="text-sm text-muted-foreground font-medium">Amount saved</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-primary">{isFreeMember ? "—" : "✓"}</p>
                  <p className="text-sm text-muted-foreground font-medium">Member status</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
