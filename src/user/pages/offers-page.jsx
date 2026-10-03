"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  applyCustomerComboOffer,
  clearCustomerComboOffer,
  fetchCustomerOffers,
} from "@/store/customer-bookings-slice";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, Crown, Gift, PackageOpen, Percent, Scissors, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { notify } from "@/lib/notify";
import { UserLayout } from "../portal/user-layout";

const rupees = (value) => `₹${Math.round(Number(value) || 0)}`;

function endsLabel(endAt) {
  if (!endAt) return null;
  return `Ends ${new Date(endAt).toLocaleDateString([], { day: "numeric", month: "short" })}`;
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
      <Icon className="size-5 text-primary" />
      {children}
    </h2>
  );
}

function PriceOffer({ offer, member }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-xl font-display text-sm font-bold",
          member ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"
        )}
      >
        {Math.round(offer.discountPercent)}%
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{offer.serviceName}</p>
        <p className="text-sm">
          <span className="font-bold text-primary">{rupees(offer.finalPrice)}</span>{" "}
          <span className="text-muted-foreground line-through">{rupees(offer.originalPrice)}</span>
        </p>
      </div>
      {member ? <Crown className="size-5 shrink-0 text-accent" /> : null}
    </div>
  );
}

function ComboCard({ combo, applied, onApply, onClear }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl bg-card p-4 ring-2", applied ? "ring-primary" : "ring-transparent")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            <Gift className="size-5 shrink-0 text-accent" />
            <span className="truncate">{combo.name}</span>
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Scissors className="mt-0.5 size-3.5 shrink-0" />
            {(combo.serviceNames ?? []).join(" · ")}
          </p>
        </div>
        {Number(combo.savings) > 0 ? (
          <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
            Save {rupees(combo.savings)}
          </span>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <p>
          <span className="font-display text-2xl font-bold text-primary">{rupees(combo.offerPrice)}</span>{" "}
          <span className="text-sm text-muted-foreground line-through">{rupees(combo.actualPrice)}</span>
        </p>
        <div className="flex gap-2">
          {applied ? (
            <Button type="button" size="icon" variant="secondary" className="rounded-full" aria-label="Remove combo" onClick={onClear}>
              <X />
            </Button>
          ) : null}
          <Button type="button" className="rounded-full" variant={applied ? "secondary" : "default"} onClick={() => onApply(combo)}>
            {applied ? (
              <>
                <Check /> Applied
              </>
            ) : (
              <>
                Apply <ArrowRight />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UserOffersPage() {
  const { appUser, loading } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { offers, offersLoading, bookingForm } = useSelector((state) => state.customerBookings);

  useEffect(() => {
    if (!appUser || appUser.role !== "USER") return;
    void dispatch(fetchCustomerOffers());
  }, [appUser, dispatch]);

  function onApplyCombo(combo) {
    dispatch(applyCustomerComboOffer(combo));
    notify.success("Combo applied", { description: "Pick a time to finish booking." });
    navigate("/user-dashboard/appointments");
  }

  if (loading) {
    return (
      <UserLayout pageTitle="Offers">
        <Skeleton className="h-96 rounded-3xl" />
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

  const globalDiscount = offers?.globalDiscount ?? null;
  const serviceOffers = offers?.serviceOffers ?? [];
  const membershipOffers = offers?.membershipOffers ?? [];
  const combos = offers?.combos ?? [];
  const hasAny = Boolean(globalDiscount) || serviceOffers.length || membershipOffers.length || combos.length;

  return (
    <UserLayout pageTitle="Offers">
      {offersLoading && !offers ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : !hasAny ? (
        <EmptyState
          icon={PackageOpen}
          title="No offers right now"
          description="New deals show up here."
          action={
            <Button asChild className="h-11 rounded-full px-6">
              <Link to="/user-dashboard/appointments">Book a visit</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {globalDiscount ? (
            <div className="flex items-center gap-4 rounded-3xl bg-primary p-5 text-primary-foreground sm:p-6">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15">
                <Sparkles className="size-7" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-xl font-bold">{globalDiscount.label}</p>
                {endsLabel(globalDiscount.endAt) ? <p className="text-sm opacity-80">{endsLabel(globalDiscount.endAt)}</p> : null}
              </div>
              <Button asChild className="ml-auto hidden rounded-full bg-card text-primary customer:hover:bg-card! sm:inline-flex">
                <Link to="/user-dashboard/appointments">
                  Book <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : null}

          {combos.length ? (
            <section>
              <SectionTitle icon={Gift}>Combos</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                {combos.map((combo) => (
                  <ComboCard
                    key={combo.id}
                    combo={combo}
                    applied={bookingForm.comboId === combo.id}
                    onApply={onApplyCombo}
                    onClear={() => dispatch(clearCustomerComboOffer())}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {membershipOffers.length ? (
            <section>
              <SectionTitle icon={Crown}>Member deals</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                {membershipOffers.map((offer) => (
                  <PriceOffer key={offer.id} offer={offer} member />
                ))}
              </div>
            </section>
          ) : null}

          {serviceOffers.length ? (
            <section>
              <SectionTitle icon={Percent}>Service deals</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                {serviceOffers.map((offer) => (
                  <PriceOffer key={offer.id} offer={offer} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </UserLayout>
  );
}
