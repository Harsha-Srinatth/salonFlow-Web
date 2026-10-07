"use client";
import { ArrowRight, Crown, Gift, Percent, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState, ErrorState, IconButton, PullToRefresh } from "@/components/kit";
import { SkeletonCard } from "@/components/motion/skeleton-shimmer";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { notify } from "@/lib/notify";
import { applyCustomerComboOffer, clearCustomerComboOffer, fetchCustomerOffers } from "@/store/customer-bookings-slice";
import { UserLayout } from "../portal/user-layout";
import { SectionHeading } from "../components/section-heading";
import { ComboCard, DealCard, GlobalDiscountCard } from "../components/offer-cards";

export default function UserOffersPage() {
  const { appUser } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { offers, offersLoading, bookingForm } = useSelector((state) => state.customerBookings);
  const isUser = appUser?.role === "USER";

  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    const result = await dispatch(fetchCustomerOffers());
    setFailed(fetchCustomerOffers.rejected.match(result));
  }, [dispatch]);
  useEffect(() => {
    if (isUser) void load();
  }, [isUser, load]);

  function onApplyCombo(combo) {
    dispatch(applyCustomerComboOffer(combo));
    notify.success("Combo applied", { description: "Pick a time to finish booking." });
    navigate("/user-dashboard/appointments");
  }

  const globalDiscount = offers?.globalDiscount ?? null;
  const serviceOffers = offers?.serviceOffers ?? [];
  const membershipOffers = offers?.membershipOffers ?? [];
  const combos = offers?.combos ?? [];
  const hasAny = Boolean(globalDiscount) || serviceOffers.length || membershipOffers.length || combos.length;
  const bookCta = (
    <Link to="/user-dashboard/appointments" className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-control bg-portal px-4 text-sm font-semibold text-portal-foreground shadow-soft">
      Book <ArrowRight className="size-4" aria-hidden />
    </Link>
  );

  return (
    <UserLayout pageTitle="Offers" actions={<IconButton icon={RefreshCw} label="Refresh" className="hidden sm:inline-grid" onClick={() => void load()} />}>
      <PullToRefresh onRefresh={load}>
        {offersLoading && !offers ? (
          <div className="grid gap-4 md:grid-cols-2" aria-label="Loading offers">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : failed && !offers ? (
          <ErrorState title="Couldn't load offers" onRetry={load} />
        ) : !hasAny ? (
          <EmptyState illustration="gift" title="No offers right now" description="New deals show up here." action={bookCta} />
        ) : (
          <Stagger className="space-y-8">
            {globalDiscount ? (
              <StaggerItem>
                <GlobalDiscountCard discount={globalDiscount} action={bookCta} />
              </StaggerItem>
            ) : null}
            {combos.length ? (
              <StaggerItem as="section">
                <SectionHeading icon={Gift} title="Combos" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {combos.map((combo) => (
                    <ComboCard key={combo.id} combo={combo} applied={bookingForm.comboId === combo.id} onApply={onApplyCombo} onClear={() => dispatch(clearCustomerComboOffer())} />
                  ))}
                </div>
              </StaggerItem>
            ) : null}
            {membershipOffers.length ? (
              <StaggerItem as="section">
                <SectionHeading icon={Crown} title="Member deals" to="/user-dashboard/membership" linkLabel="Plans" />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {membershipOffers.map((offer) => (
                    <DealCard key={offer.id} offer={offer} member onClick={() => navigate("/user-dashboard/appointments")} />
                  ))}
                </div>
              </StaggerItem>
            ) : null}
            {serviceOffers.length ? (
              <StaggerItem as="section">
                <SectionHeading icon={Percent} title="Service deals" />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {serviceOffers.map((offer) => (
                    <DealCard key={offer.id} offer={offer} onClick={() => navigate("/user-dashboard/appointments")} />
                  ))}
                </div>
              </StaggerItem>
            ) : null}
          </Stagger>
        )}
      </PullToRefresh>
    </UserLayout>
  );
}
