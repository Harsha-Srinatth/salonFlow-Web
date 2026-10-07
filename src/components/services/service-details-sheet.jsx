"use client";

import { motion, useReducedMotion } from "motion/react";
import { Clock, Crown, Tag, Users } from "lucide-react";
import { ServicePhotoCarousel } from "@/components/services/service-photo-carousel";
import { SERVICE_DETAIL_SECTIONS, sectionBlocks, serviceImages } from "@/lib/service-details";
import { AUDIENCE_LABEL, formatRupees, resolveServicePrice, serviceVariants } from "@/lib/service-pricing";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { haptic, spring } from "@/components/motion/presets";
import { SkeletonShimmer } from "@/components/motion/skeleton-shimmer";
import { EmptyState } from "@/components/kit/empty-state";
import { MorphDialog } from "@/components/kit/morph-dialog";
import { SpringBottomSheet } from "@/components/kit/spring-bottom-sheet";
import { UserCartToggle } from "@/components/kit-extra/user-cart-toggle";

const titleCase = (value) => `${value ?? ""}`.charAt(0) + `${value ?? ""}`.slice(1).toLowerCase();

function Section({ icon: Icon, label, text }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold">
        <Icon className="size-[18px] text-portal" aria-hidden />
        {label}
      </h3>
      <div className="space-y-2 text-sm leading-6 text-ink-neutral">
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

function Pill({ icon: Icon, children, className }) {
  return (
    <span className={cn("inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-caption font-semibold", className)}>
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}

function DetailsBody({ service, priced, fallbackIcon, variant, membershipSegment, onSelectVariant }) {
  const reduce = useReducedMotion();
  const images = serviceImages(service);
  const variants = serviceVariants(service);
  const resolved = resolveServicePrice(service, variant, membershipSegment);
  const percent = Number(priced?.appliedPercent) > 0 ? Number(priced.appliedPercent) : 0;
  const final = Math.max(0, Math.round(resolved.price * (1 - percent / 100) * 100) / 100);
  const sections = SERVICE_DETAIL_SECTIONS.filter((section) => `${service.details?.[section.key] ?? ""}`.trim());
  const duration = Number(resolved.variant?.duration) > 0 ? resolved.variant.duration : service.duration;
  const audience = AUDIENCE_LABEL[`${service.gender ?? ""}`.toUpperCase()];

  return (
    <div className="space-y-6">
      <div className="-mx-5 overflow-hidden sm:-mx-6">
        <ServicePhotoCarousel images={images} alt={service.name} fallbackIcon={fallbackIcon} />
      </div>
      <header className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-display text-display-lg leading-none font-bold tabular-nums">{formatRupees(final)}</span>
          {final < resolved.price ? <span className="text-sm text-ink-neutral line-through">{formatRupees(resolved.price)}</span> : null}
          {percent ? <span className="rounded-full bg-success/12 px-2 py-0.5 text-micro font-bold text-ink-success">−{percent.toFixed(0)}%</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill icon={Clock}>{duration} min</Pill>
          {service.category ? <Pill icon={Tag}>{titleCase(service.category)}</Pill> : null}
          {audience ? <Pill icon={Users}>{audience}</Pill> : null}
          {!variants.length && resolved.memberPrice != null && resolved.memberPrice < resolved.listPrice ? (
            <Pill icon={Crown} className="bg-gold/16 text-ink-warning">
              Members {formatRupees(resolved.memberPrice)}
            </Pill>
          ) : null}
        </div>
        {service.description ? <p className="text-[15px] leading-7">{service.description}</p> : null}
      </header>

      {variants.length ? (
        <section className="space-y-2">
          <h3 className="font-display text-base font-semibold">Choose an option</h3>
          <div role="radiogroup" aria-label="Options" className="grid gap-2 sm:grid-cols-2">
            {variants.map((item) => {
              const active = (resolved.variant?.name ?? "") === item.name;
              const price = resolveServicePrice({ ...service, variants: [item] }, item.name, membershipSegment).price;
              return (
                <button
                  key={item.name}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    haptic("tap");
                    onSelectVariant?.(service.id, item.name);
                  }}
                  className={cn("relative flex items-center justify-between gap-3 rounded-2xl p-3.5 text-left text-sm", active ? "text-foreground" : "bg-muted/60 hover:bg-muted")}
                >
                  {active ? <motion.span layoutId={`variant-pill-${service.id}`} transition={reduce ? { duration: 0 } : spring.snappy} className="absolute inset-0 rounded-2xl bg-portal/12 ring-2 ring-inset ring-portal" /> : null}
                  <span className="relative font-semibold">{item.name}</span>
                  <span className="relative flex shrink-0 flex-col items-end">
                    <span className="font-bold tabular-nums">{formatRupees(price)}</span>
                    {item.duration ? <span className="text-micro text-ink-neutral">{item.duration} min</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {sections.map((section) => (
        <Section key={section.key} icon={section.icon} label={section.label} text={service.details[section.key]} />
      ))}

      {sections.some((section) => ["precautions", "notRecommendedFor"].includes(section.key)) ? (
        <p className="text-caption text-ink-neutral">General guidance, not medical advice. Tell your stylist about allergies or skin and scalp conditions.</p>
      ) : null}
    </div>
  );
}

/**
 * Full details for one catalog service. Opening it never changes the booking; only the explicit
 * add/remove control does. Desktop: a MorphDialog that expands from the card (`layoutId`).
 * Phones: a drag-to-dismiss bottom sheet.
 *
 * `state`: "ready" | "loading" | "missing"
 */
export function ServiceDetailsSheet({ open, state, service, selected, priced, fallbackIcon, variant, membershipSegment, layoutId, onToggle, onSelectVariant, onClose }) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const ready = state === "ready" && service;
  const title = ready ? service.name : state === "loading" ? "Loading service" : "Service unavailable";
  const onOpenChange = (next) => (!next ? onClose() : null);
  const resolved = ready ? resolveServicePrice(service, variant, membershipSegment) : null;
  const percent = Number(priced?.appliedPercent) > 0 ? Number(priced.appliedPercent) : 0;
  const final = resolved ? Math.max(0, Math.round(resolved.price * (1 - percent / 100) * 100) / 100) : 0;

  const footer = ready ? (
    <div className="flex w-full items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{selected ? "In your booking" : "Add to your booking"}</p>
        <p className="text-caption text-ink-neutral tabular-nums">{formatRupees(final)}</p>
      </div>
      <UserCartToggle added={selected} onChange={(next) => onToggle(service.id, next)} label={service.name} showText />
    </div>
  ) : null;

  const body =
    state === "loading" ? (
      <div className="space-y-4">
        <SkeletonShimmer className="aspect-[4/3] w-full rounded-2xl" />
        <SkeletonShimmer className="h-8 w-1/3" />
        <SkeletonShimmer className="h-20 w-full" />
      </div>
    ) : !ready ? (
      <EmptyState illustration="search" title="Not on the menu" description="Pick another service from the list." compact className="bg-transparent" />
    ) : (
      <DetailsBody service={service} priced={priced} fallbackIcon={fallbackIcon} variant={variant} membershipSegment={membershipSegment} onSelectVariant={onSelectVariant} />
    );

  if (desktop) {
    return (
      <MorphDialog open={open} onOpenChange={onOpenChange} title={title} size="lg" layoutId={ready ? layoutId : undefined} footer={footer}>
        {body}
      </MorphDialog>
    );
  }
  return (
    <SpringBottomSheet open={open} onOpenChange={onOpenChange} title={title} footer={footer}>
      {body}
    </SpringBottomSheet>
  );
}
