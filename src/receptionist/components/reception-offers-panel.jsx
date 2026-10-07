"use client";

import { CustomerOffersPanel } from "@/components/offers/customer-offers-panel";
import { SkeletonCard } from "@/components/motion";
import { membershipSegmentBadgeClass, membershipSegmentLabel } from "@/lib/offers/offer-pricing";
import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";

/** Offers this walk-in customer qualifies for (membership tier, global and service discounts, combos). */
export function ReceptionOffersPanel({
  offers,
  membershipSegment,
  membershipPlanName,
  selectedComboId,
  onApplyCombo,
  onClearCombo,
  loading,
}) {
  const segment = `${membershipSegment ?? "FREE"}`.trim().toUpperCase();
  const planLabel = membershipPlanName ?? membershipSegmentLabel(segment);

  if (loading && !offers) return <SkeletonCard className="h-32" />;

  return (
    <div className="space-y-3">
      <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-caption font-semibold", membershipSegmentBadgeClass(segment))}>
        <Crown className="size-3.5" aria-hidden />
        {planLabel} prices
      </span>
      <CustomerOffersPanel
        offers={offers}
        selectedComboId={selectedComboId}
        onApplyCombo={onApplyCombo}
        onClearCombo={onClearCombo}
        title="Offers for this customer"
        description="Discounts, member rates and combos."
      />
    </div>
  );
}
