"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Sparkles, Tag } from "lucide-react";

function formatOfferWindow(startAt, endAt) {
  if (!startAt && !endAt) return "Valid now";
  const start = startAt ? new Date(startAt).toLocaleDateString() : "Open";
  const end = endAt ? new Date(endAt).toLocaleDateString() : "No end date";
  return `${start} – ${end}`;
}

function formatCategory(category) {
  const value = `${category ?? ""}`.trim().toUpperCase();
  if (value === "MEN") return "Men";
  if (value === "WOMEN") return "Women";
  if (value === "CHILDREN") return "Children";
  return value || "—";
}

export function CustomerOffersPanel({
  offers,
  selectedComboId,
  onApplyCombo,
  onClearCombo,
  title = "Offers for you",
  description = "Save on services and combo packages available to you.",
}) {
  if (!offers) return null;

  const {
    globalDiscount,
    serviceOffers = [],
    membershipOffers = [],
    combos = [],
  } = offers;

  const hasAnyOffer = Boolean(globalDiscount) || serviceOffers.length || membershipOffers.length || combos.length;

  if (!hasAnyOffer) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="size-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active offers right now. Check back soon.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tag className="size-4" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {globalDiscount ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="font-medium">Salon-wide offer</p>
              <Badge variant="secondary">{globalDiscount.label}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{formatOfferWindow(globalDiscount.startAt, globalDiscount.endAt)}</p>
          </div>
        ) : null}

        {serviceOffers.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Service offers</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {serviceOffers.map((offer) => (
                <div key={offer.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{offer.serviceName}</p>
                  <p className="text-xs text-muted-foreground">{offer.discountPercent}% off</p>
                  <p className="text-xs">
                    <span className="text-muted-foreground line-through">Rs {Number(offer.originalPrice).toFixed(2)}</span>
                    {" → "}
                    <span className="font-medium text-primary">Rs {Number(offer.finalPrice).toFixed(2)}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {membershipOffers.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Exclusive offers</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {membershipOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-md border border-amber-300/50 bg-amber-50/40 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/20"
                >
                  <p className="font-medium">{offer.serviceName}</p>
                  <p className="text-xs text-muted-foreground">{offer.discountPercent}% off</p>
                  <p className="text-xs">
                    <span className="text-muted-foreground line-through">Rs {Number(offer.originalPrice).toFixed(2)}</span>
                    {" → "}
                    <span className="font-medium text-primary">Rs {Number(offer.finalPrice).toFixed(2)}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {combos.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Combo deals</p>
            <div className="grid gap-3 md:grid-cols-2">
              {combos.map((combo) => {
                const isSelected = selectedComboId === combo.id;
                return (
                  <div
                    key={combo.id}
                    className={`rounded-lg border p-3 ${isSelected ? "border-primary bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-1 font-medium">
                          <Gift className="size-4" />
                          {combo.name}
                        </p>
                        {combo.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">{combo.description}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">{(combo.serviceNames ?? []).join(", ")}</p>
                        <p className="mt-2 text-xs">
                          <span className="text-muted-foreground line-through">Rs {Number(combo.actualPrice).toFixed(2)}</span>
                          {" "}
                          <span className="font-semibold text-primary">Rs {Number(combo.offerPrice).toFixed(2)}</span>
                          {" "}
                          <span className="text-emerald-600">(save Rs {Number(combo.savings).toFixed(2)})</span>
                        </p>
                      </div>
                      <Badge variant="outline">{formatCategory(combo.category)}</Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => onApplyCombo?.(combo)}
                      >
                        {isSelected ? "Applied" : "Apply combo"}
                      </Button>
                      {isSelected ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => onClearCombo?.()}>
                          Clear
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
