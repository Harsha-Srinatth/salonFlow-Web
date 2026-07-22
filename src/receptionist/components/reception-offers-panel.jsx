"use client";

import { Badge } from "@/components/ui/badge";
import { CustomerOffersPanel } from "@/components/offers/customer-offers-panel";
import { membershipSegmentBadgeClass, membershipSegmentLabel } from "@/lib/offers/offer-pricing";
import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";

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

  if (loading && !offers) {
    return <div className="h-32 animate-pulse rounded-2xl bg-muted/40" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn("gap-1.5 px-3 py-1", membershipSegmentBadgeClass(segment))}>
          <Crown className="size-3.5" />
          {planLabel}
        </Badge>
        <p className="text-xs text-muted-foreground">
          Prices and offers below match what this customer qualifies for. Share combos and discounts at the desk.
        </p>
      </div>
      <CustomerOffersPanel
        offers={offers}
        selectedComboId={selectedComboId}
        onApplyCombo={onApplyCombo}
        onClearCombo={onClearCombo}
        title="Offers for this customer"
        description="Global salon offers, service discounts, membership rates, and combo deals."
      />
    </div>
  );
}
