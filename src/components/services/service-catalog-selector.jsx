"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupees, resolveServicePrice, serviceVariants } from "@/lib/service-pricing";
import { useMemo, useState } from "react";

function offerSourceLabel(source) {
  if (source === "SERVICE_DISCOUNT") return "Service offer";
  if (source === "GLOBAL_DISCOUNT") return "Salon-wide";
  if (source === "MEMBERSHIP_OFFER") return "Membership";
  return null;
}

function ServiceOfferPrice({ priced, service, hasOffer, originalPrice, finalPrice, showLegacyDiscount }) {
  const sourceLabel = offerSourceLabel(priced?.source);

  if (hasOffer) {
    return (
      <p className="text-xs">
        <span className="text-muted-foreground line-through">Rs {originalPrice.toFixed(2)}</span>
        {" → "}
        <span className="font-medium text-primary">Rs {finalPrice.toFixed(2)}</span>
        {Number(priced?.appliedPercent) > 0 ? (
          <span className="ml-1 text-success">({Number(priced.appliedPercent).toFixed(0)}% off)</span>
        ) : null}
        {sourceLabel ? (
          <Badge variant="outline" className="ml-1 align-middle text-[10px] font-normal">
            {sourceLabel}
          </Badge>
        ) : null}
      </p>
    );
  }

  return (
    <p className="text-xs">
      Rs {originalPrice.toFixed(2)}
      {showLegacyDiscount ? ` (${service.discountPercent ?? 0}% off)` : null}
    </p>
  );
}

function normalizeCategory(value) {
  return `${value ?? "GENERAL"}`.trim().toUpperCase() || "GENERAL";
}

function normalizeGender(value) {
  return `${value ?? "UNISEX"}`.trim().toUpperCase() || "UNISEX";
}

/**
 * Shared service catalog selector used across portals.
 *
 * Props:
 * - services: array of { id, name, category, gender, basePrice, discountPercent, duration, description, image }
 * - mode: "multi" | "single"
 * - selectedServiceIds: string[] (multi)
 * - selectedServiceId: string (single)
 * - onToggleServiceId: (id: string, checked: boolean) => void (multi)
 * - onSelectService: (service) => void (single)
 * - label: string
 */
export function ServiceCatalogSelector({
  services,
  mode,
  selectedServiceIds,
  selectedServiceId,
  onToggleServiceId,
  onSelectService,
  label,
  pricedServices,
  variantSelections,
  membershipSegment,
  onSelectVariant,
}) {
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeGender, setActiveGender] = useState("ALL");

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const service of services ?? []) {
      const category = normalizeCategory(service.category);
      counts[category] = (counts[category] ?? 0) + 1;
    }
    return counts;
  }, [services]);

  const pricedById = useMemo(() => {
    return new Map((pricedServices ?? []).map((item) => [item.serviceId, item]));
  }, [pricedServices]);

  const filteredServices = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return (services ?? []).filter((service) => {
      const category = normalizeCategory(service.category);
      const gender = normalizeGender(service.gender);
      if (activeCategory !== "ALL" && category !== activeCategory) return false;
      if (activeGender !== "ALL" && gender !== activeGender) return false;
      if (!query) return true;
      const haystack = `${service.name ?? ""} ${service.category ?? ""} ${service.gender ?? ""} ${service.description ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [activeCategory, activeGender, searchText, services]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        <Input
          className="w-full md:w-72"
          placeholder="Search by name, category, gender"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Button type="button" size="sm" variant={activeCategory === "ALL" ? "default" : "outline"} onClick={() => setActiveCategory("ALL")}>
          ALL ({(services ?? []).length})
        </Button>
        {Object.entries(categoryCounts).map(([category, count]) => (
          <Button
            key={category}
            type="button"
            size="sm"
            className="min-w-16"
            variant={activeCategory === category ? "default" : "outline"}
            onClick={() => setActiveCategory(category)}
          >
            {category} ({count})
          </Button>
        ))}

        <Button type="button" size="sm" variant={activeGender === "ALL" ? "default" : "outline"} onClick={() => setActiveGender("ALL")}>
          All genders
        </Button>
        <Button type="button" size="sm" variant={activeGender === "MEN" ? "default" : "outline"} onClick={() => setActiveGender("MEN")}>
          Men
        </Button>
        <Button type="button" size="sm" variant={activeGender === "WOMEN" ? "default" : "outline"} onClick={() => setActiveGender("WOMEN")}>
          Women
        </Button>
        <Button type="button" size="sm" variant={activeGender === "UNISEX" ? "default" : "outline"} onClick={() => setActiveGender("UNISEX")}>
          Unisex
        </Button>
        <Button type="button" size="sm" variant={activeGender === "BOY" ? "default" : "outline"} onClick={() => setActiveGender("BOY")}>
          Boy
        </Button>
        <Button type="button" size="sm" variant={activeGender === "GIRL" ? "default" : "outline"} onClick={() => setActiveGender("GIRL")}>
          Girl
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-md border p-3 xl:grid-cols-2">
        {!filteredServices.length ? (
          <p className="text-xs text-muted-foreground">No services found. Try changing filters.</p>
        ) : null}

        {filteredServices.map((service) => {
          const checked = mode === "multi" ? (selectedServiceIds ?? []).includes(service.id) : selectedServiceId === service.id;
          const cardClass = `rounded-md border p-3 transition-colors ${checked ? "border-primary bg-primary/5" : ""}`;
          const priced = pricedById.get(service.id);
          const variants = serviceVariants(service);
          const resolved = resolveServicePrice(service, variantSelections?.[service.id], membershipSegment);
          const originalPrice = resolved.price;
          const percent = Number(priced?.appliedPercent ?? 0);
          const finalPrice = Math.max(0, Math.round(originalPrice * (1 - percent / 100) * 100) / 100);
          const hasOffer = finalPrice < originalPrice;

          if (mode === "single") {
            return (
              <button
                key={service.id}
                type="button"
                className={`${cardClass} text-left`}
                onClick={() => onSelectService?.(service)}
              >
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted/20">
                    {service.image ? (
                      <img src={service.image} alt={service.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.description || "No description available."}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.category} | {service.gender} | {service.duration} mins
                    </p>
                    <ServiceOfferPrice
                      priced={priced}
                      service={service}
                      hasOffer={hasOffer}
                      originalPrice={originalPrice}
                      finalPrice={finalPrice}
                      showLegacyDiscount={!pricedServices?.length}
                    />
                  </div>
                </div>
              </button>
            );
          }

          return (
            <div key={service.id} className={cardClass}>
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox checked={checked} onCheckedChange={(value) => onToggleServiceId?.(service.id, Boolean(value))} />
                <div className="flex flex-1 items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted/20">
                    {service.image ? (
                      <img src={service.image} alt={service.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.description || "No description available."}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.category} | {service.gender} | {service.duration} mins
                    </p>
                    <ServiceOfferPrice
                      priced={priced}
                      service={service}
                      hasOffer={hasOffer}
                      originalPrice={originalPrice}
                      finalPrice={finalPrice}
                      showLegacyDiscount={!pricedServices?.length}
                    />
                  </div>
                </div>
              </label>
              {variants.length ? (
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  Option
                  <select
                    className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm text-foreground"
                    value={resolved.variant?.name ?? ""}
                    onChange={(e) => onSelectVariant?.(service.id, e.target.value)}
                    aria-label={`${service.name}: choose an option`}
                  >
                    {variants.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name} - {formatRupees(resolveServicePrice({ ...service, variants: [item] }, item.name, membershipSegment).price)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
