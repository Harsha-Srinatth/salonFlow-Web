import { resolveServicePrice } from "@/lib/service-pricing";

export function computeOfferPriceSummary({ serviceIds, comboId, services, offers, variantSelections, membershipSegment }) {
  if (!serviceIds?.length) {
    return { totalAmount: 0, discountAmount: 0, payableAmount: 0, offerLabel: null };
  }

  if (comboId && offers?.combos?.length) {
    const combo = offers.combos.find((item) => item.id === comboId);
    const comboKey = combo ? [...combo.serviceIds].sort().join(",") : "";
    const selectedKey = [...serviceIds].sort().join(",");
    if (combo && comboKey === selectedKey) {
      const totalAmount = Number(combo.actualPrice ?? 0);
      const payableAmount = Number(combo.offerPrice ?? 0);
      return {
        totalAmount,
        discountAmount: Math.max(0, totalAmount - payableAmount),
        payableAmount,
        offerLabel: `Combo: ${combo.name}`,
      };
    }
  }

  const pricedById = new Map((offers?.pricedServices ?? []).map((item) => [item.serviceId, item]));
  const selected = (services ?? []).filter((service) => serviceIds.includes(service.id));
  let totalAmount = 0;
  let payableAmount = 0;
  let offerLabel = null;

  for (const service of selected) {
    // Chosen size/length and the member rate set the price; offers then apply as a percent.
    const originalPrice = resolveServicePrice(service, variantSelections?.[service.id], membershipSegment).price;
    const priced = pricedById.get(service.id);
    const percent = Number(priced?.appliedPercent ?? 0);
    const finalPrice = Math.max(0, Math.round((originalPrice - (originalPrice * percent) / 100) * 100) / 100);
    totalAmount += originalPrice;
    payableAmount += finalPrice;
    if (priced?.source && priced.source !== "NONE" && !offerLabel) {
      if (priced.source === "GLOBAL_DISCOUNT") offerLabel = "Global discount applied";
      else if (priced.source === "SERVICE_DISCOUNT") offerLabel = "Service offer applied";
      else if (priced.source === "MEMBERSHIP_OFFER") offerLabel = "Membership offer applied";
    }
  }

  return {
    totalAmount,
    discountAmount: Math.max(0, totalAmount - payableAmount),
    payableAmount,
    offerLabel,
  };
}

export function membershipSegmentLabel(segment) {
  const key = `${segment ?? "FREE"}`.trim().toUpperCase();
  if (key === "BASIC") return "Basic member";
  if (key === "PREMIUM") return "Premium member";
  return "Free member";
}

export function membershipSegmentBadgeClass(segment) {
  const key = `${segment ?? "FREE"}`.trim().toUpperCase();
  if (key === "BASIC") return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300";
  if (key === "PREMIUM") return "bg-amber-500/10 text-amber-800 border-amber-500/20 dark:text-amber-300";
  return "bg-muted text-muted-foreground border-border";
}
