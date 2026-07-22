"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerOffersPanel } from "@/components/offers/customer-offers-panel";
import {
  applyCustomerComboOffer,
  clearCustomerComboOffer,
  fetchCustomerOffers,
} from "@/store/customer-bookings-slice";
import { Gift, Sparkles, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UserLayout } from "../portal/user-layout";

export default function UserOffersPage() {
  const { appUser, loading, logout } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { offers, offersLoading, bookingForm } = useSelector((state) => state.customerBookings);

  useEffect(() => {
    if (!appUser || appUser.role !== "USER") return;
    void dispatch(fetchCustomerOffers());
  }, [appUser, dispatch]);

  function onApplyCombo(combo) {
    dispatch(applyCustomerComboOffer(combo));
    toast.success("Combo applied! Proceed to booking.");
    navigate("/user-dashboard/appointments");
  }

  if (loading) {
    return (
      <UserLayout pageTitle="Offers">
        <div className="flex items-center justify-center h-96">
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading offers...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!appUser || appUser.role !== "USER") {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <p>Sign in as a customer to view offers.</p>
        <Button asChild>
          <Link to="/auth/login">Customer login</Link>
        </Button>
      </div>
    );
  }

  return (
    <UserLayout
      pageTitle="Exclusive Offers"
      actions={
        <Button variant="destructive" onClick={() => void logout()}>
          Sign out
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Hero Header */}
        <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 via-primary/5 to-transparent p-8 overflow-hidden relative">
          <div className="absolute -right-20 -top-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-accent/20">
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  Save more with our offers
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Browse exclusive deals and apply combo offers to your next booking. Save up to 40% on your favorite services!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Offers Panel or Empty State */}
        {offersLoading ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted animate-pulse mb-4" />
              <p className="text-muted-foreground">Loading offers...</p>
            </CardContent>
          </Card>
        ) : !offers || offers.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="pt-16 pb-16 text-center">
              <Gift className="mx-auto w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-xl font-semibold text-foreground mb-2">No active offers right now</p>
              <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                Check back soon for exclusive deals, seasonal offers, and special promotions for our valued customers!
              </p>
              <Button asChild size="lg">
                <Link to="/user-dashboard/appointments">
                  Book anyway
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div>
            <h3 className="mb-4 text-xl font-semibold text-foreground">Available offers</h3>
            <CustomerOffersPanel
              offers={offers}
              selectedComboId={bookingForm.comboId}
              onApplyCombo={onApplyCombo}
              onClearCombo={() => dispatch(clearCustomerComboOffer())}
            />
          </div>
        )}

        {/* CTA Section */}
        {offers && offers.length > 0 && (
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="pt-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground font-medium mb-4">Ready to book?</p>
                <Button asChild size="lg">
                  <Link to="/user-dashboard/appointments">
                    Apply an offer and book now
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </UserLayout>
  );
}
