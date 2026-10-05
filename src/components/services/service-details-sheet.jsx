"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ServicePhotoCarousel } from "@/components/services/service-photo-carousel";
import { SERVICE_DETAIL_SECTIONS, sectionBlocks, serviceImages } from "@/lib/service-details";
import { cn } from "@/lib/utils";
import { Check, Clock, Plus, SearchX, Tag, Users, X } from "lucide-react";

const rupees = (value) => `₹${(Math.round(Number(value) * 100) / 100).toLocaleString("en-IN")}`;
const titleCase = (value) => `${value ?? ""}`.charAt(0) + `${value ?? ""}`.slice(1).toLowerCase();
const GENDER_LABEL = { MEN: "Men", WOMEN: "Women", UNISEX: "Everyone", BOY: "Boy", GIRL: "Girl" };

function Section({ icon: Icon, label, text }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold">
        <Icon className="size-[18px] text-primary" />
        {label}
      </h3>
      <div className="space-y-2 text-sm leading-6 text-muted-foreground">
        {sectionBlocks(text).map((block, i) =>
          block.type === "list" ? (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          ) : (
            <p key={i}>{block.text}</p>
          )
        )}
      </div>
    </section>
  );
}

/**
 * Full details for one catalog service. Opening it never changes the booking; only the explicit
 * "Add to booking" control does. Bottom sheet on phones, centred dialog on larger screens.
 *
 * `state`: "ready" | "loading" | "missing"
 */
export function ServiceDetailsSheet({ open, state, service, selected, priced, fallbackIcon, onToggle, onClose }) {
  const images = service ? serviceImages(service) : [];
  const original = Number(priced?.originalPrice ?? service?.basePrice ?? 0);
  const final = Number(priced?.finalPrice ?? service?.basePrice ?? 0);
  const hasOffer = final < original;
  const percent = Number(priced?.appliedPercent) > 0 ? Number(priced.appliedPercent) : 0;
  const sections = SERVICE_DETAIL_SECTIONS.filter((section) => `${service?.details?.[section.key] ?? ""}`.trim());
  const variants = Array.isArray(service?.variants) ? service.variants.filter((v) => v?.name) : [];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-card text-card-foreground shadow-2xl outline-none",
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88dvh] sm:w-[min(44rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-[state=open]:slide-in-from-bottom-4"
          )}
        >
          <DialogPrimitive.Close
            aria-label="Close details"
            className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-card/90 shadow-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>

          {state === "loading" ? (
            <div className="space-y-4 p-5">
              <DialogPrimitive.Title className="sr-only">Loading service</DialogPrimitive.Title>
              <Skeleton className="aspect-[4/3] w-full rounded-2xl sm:aspect-video" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : state === "missing" || !service ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <SearchX className="size-10 text-muted-foreground" />
              <DialogPrimitive.Title className="font-display text-lg font-semibold">This service isn't available</DialogPrimitive.Title>
              <p className="max-w-sm text-sm text-muted-foreground">It may have been removed from the menu. Pick another service from the list.</p>
              <Button className="mt-2 h-11 rounded-full px-6" onClick={onClose}>
                Back to services
              </Button>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <ServicePhotoCarousel images={images} alt={service.name} fallbackIcon={fallbackIcon} />
                <div className="space-y-6 p-5 sm:p-6">
                  <header className="space-y-3">
                    <DialogPrimitive.Title className="pr-8 font-display text-2xl font-bold leading-tight">{service.name}</DialogPrimitive.Title>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="flex items-baseline gap-2 rounded-full bg-primary/10 px-3 py-1">
                        {variants.length ? <span className="text-xs text-muted-foreground">from</span> : null}
                        <span className="text-lg font-bold text-primary">{rupees(final)}</span>
                        {hasOffer ? <span className="text-xs text-muted-foreground line-through">{rupees(original)}</span> : null}
                        {hasOffer && percent ? <span className="text-xs font-semibold text-success">{percent.toFixed(0)}% off</span> : null}
                      </span>
                      {!variants.length && service.memberPrice != null ? (
                        <span className="rounded-full bg-success/10 px-3 py-1.5 font-medium text-success">Members {rupees(service.memberPrice)}</span>
                      ) : null}
                      <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-medium">
                        <Clock className="size-4" /> {service.duration} min
                      </span>
                      {service.category ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-medium">
                          <Tag className="size-4" /> {titleCase(service.category)}
                        </span>
                      ) : null}
                      {service.gender ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-medium">
                          <Users className="size-4" /> {GENDER_LABEL[`${service.gender}`.toUpperCase()] ?? titleCase(service.gender)}
                        </span>
                      ) : null}
                    </div>
                    {service.description ? <p className="text-[15px] leading-7">{service.description}</p> : null}
                  </header>

                  {sections.map((section) => (
                    <Section key={section.key} icon={section.icon} label={section.label} text={service.details[section.key]} />
                  ))}

                  {variants.length ? (
                    <section className="space-y-2">
                      <h3 className="font-display text-base font-semibold">Options and prices</h3>
                      <ul className="divide-y divide-border rounded-2xl bg-secondary">
                        {variants.map((variant, i) => (
                          <li key={`${variant.name}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                            <span className="font-medium">{variant.name}</span>
                            <span className="flex shrink-0 flex-col items-end text-muted-foreground">
                              <span className="font-semibold text-foreground">{rupees(variant.price)}</span>
                              {variant.memberPrice != null ? (
                                <span className="text-xs text-success">Members {rupees(variant.memberPrice)}</span>
                              ) : null}
                              {variant.duration ? <span className="text-xs">{variant.duration} min</span> : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground">Pick your option on the services list when you add this to your booking.</p>
                    </section>
                  ) : null}

                  {!sections.length && !service.description ? (
                    <p className="rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
                      The salon hasn't added a detailed description for this service yet. Ask at reception if you have questions.
                    </p>
                  ) : null}
                  {sections.some((section) => ["precautions", "notRecommendedFor"].includes(section.key)) ? (
                    <p className="text-xs text-muted-foreground">
                      This information is general guidance, not medical advice. Tell your stylist about allergies, skin or scalp conditions before the service.
                    </p>
                  ) : null}
                </div>
              </div>

              <footer className="flex items-center gap-3 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{selected ? "Added to your booking" : "Not in your booking"}</p>
                  <p className="text-xs text-muted-foreground">{rupees(final)} · {service.duration} min</p>
                </div>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => onToggle(service.id, !selected)}
                  className={cn(
                    "flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold outline-none ring-2 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    selected ? "bg-primary/10 text-primary ring-primary" : "bg-primary text-primary-foreground ring-primary"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-md border-2",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-primary-foreground/80"
                    )}
                  >
                    {selected ? <Check className="size-3.5" strokeWidth={3} /> : <Plus className="size-3.5" strokeWidth={3} />}
                  </span>
                  {selected ? "Selected" : "Add to booking"}
                </button>
              </footer>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
