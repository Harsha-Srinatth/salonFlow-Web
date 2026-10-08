"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Baby, Clock, Images, Layers, Search, Sparkles, User, UserRound, Users, X } from "lucide-react";
import { memo, useDeferredValue, useMemo, useState } from "react";
import { serviceImageUrl } from "@/lib/service-image";
import { defaultVariantName, formatRupees, resolveServicePrice, serviceVariants } from "@/lib/service-pricing";
import { iconForCategory } from "@/lib/service-icons";
import { cn } from "@/lib/utils";
import { haptic, interaction, spring } from "@/components/motion/presets";
import { SkeletonShimmer } from "@/components/motion/skeleton-shimmer";
import { EmptyState } from "@/components/kit/empty-state";
import { UserCartToggle } from "@/components/kit-extra/user-cart-toggle";

// Category icons live in one shared map (src/lib/service-icons.js); re-exported for existing imports.
export { iconForCategory };

/**
 * Audience filters. These are driven by each service's `gender` field from the catalog API
 * (WOMEN | MEN | UNISEX | BOY | GIRL); a filter only shows when at least one service matches it,
 * so a catalog without that data simply shows no audience row. To add an audience, add it here and
 * to `matchesAudience` (and to AUDIENCE_LABEL in lib/service-pricing.js for the details sheet).
 */
const AUDIENCES = [
  { value: "ALL", label: "All", icon: Users },
  { value: "WOMEN", label: "Women", icon: UserRound },
  { value: "MEN", label: "Men", icon: User },
  { value: "CHILDREN", label: "Kids", icon: Baby },
];
const CHILD_FILTERS = [
  { value: "ALL", label: "All kids" },
  { value: "BOY", label: "Boy" },
  { value: "GIRL", label: "Girl" },
];
const KIDS_CATEGORY = "KIDS GROOMING";

const normalize = (value, fallback) => `${value ?? fallback}`.trim().toUpperCase() || fallback;
const titleCase = (value) =>
  value
    .toLowerCase()
    .replace(/(^|[\s&(/-])([a-z])/g, (_, lead, char) => `${lead}${char.toUpperCase()}`)
    .replace(/'S\b/g, "'s");

/** Women/Men include unisex services; Kids = anything for a boy or girl, plus kids services for both. */
function matchesAudience(service, audience, child) {
  const value = normalize(service.gender, "UNISEX");
  if (audience === "ALL") return true;
  if (audience !== "CHILDREN") return value === audience || (value === "UNISEX" && normalize(service.category, "GENERAL") !== KIDS_CATEGORY);
  const forBothKids = normalize(service.category, "GENERAL") === KIDS_CATEGORY && value === "UNISEX";
  if (child === "BOY") return value === "BOY" || forBothKids;
  if (child === "GIRL") return value === "GIRL" || forBothKids;
  return value === "BOY" || value === "GIRL" || forBothKids;
}

/** Price after the live offer for one service, in the customer's chosen option and plan. */
export function servicePriceView(service, priced, variantName, membershipSegment) {
  const resolved = resolveServicePrice(service, variantName, membershipSegment);
  const original = resolved.price;
  const percent = Number(priced?.appliedPercent) > 0 ? Number(priced.appliedPercent) : 0;
  const final = Math.max(0, Math.round(original * (1 - percent / 100) * 100) / 100);
  const duration = Number(resolved.variant?.duration) > 0 ? resolved.variant.duration : service.duration;
  return { ...resolved, original, final, percent, duration };
}

function FilterChip({ active, onClick, icon: Icon, children, layoutGroup }) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      onClick={() => {
        haptic("tap");
        onClick();
      }}
      aria-pressed={active}
      className={cn(
        "relative flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
        active ? "text-portal-foreground" : "bg-card text-foreground ring-1 ring-inset ring-border/70 hover:ring-portal/40"
      )}
    >
      {active ? <motion.span layoutId={`${layoutGroup}-pill`} className="absolute inset-0 rounded-full bg-portal shadow-glow" transition={reduce ? { duration: 0 } : spring.snappy} /> : null}
      {Icon ? <Icon className="relative size-4" aria-hidden /> : null}
      <span className="relative">{children}</span>
    </button>
  );
}

const ServiceCard = memo(function ServiceCard({ service, selected, priced, variant, membershipSegment, hidden, onToggle, onSelectVariant, onOpenDetails, index }) {
  const reduce = useReducedMotion();
  const Icon = iconForCategory(service.category ?? "");
  const variants = serviceVariants(service);
  const view = servicePriceView(service, priced, variant, membershipSegment);
  const hasOffer = view.final < view.original;
  const showMemberHint = view.memberPrice != null && view.memberPrice < view.listPrice && view.price === view.listPrice;
  const photoCount = Array.isArray(service.images) ? service.images.length : service.image ? 1 : 0;
  const [broken, setBroken] = useState(false);
  const image = service.image ?? service.images?.[0];

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ ...spring.soft, delay: reduce ? 0 : Math.min(index, 10) * 0.035 }}
      className="min-w-0 [contain-intrinsic-size:auto_300px] [content-visibility:auto]"
    >
      <motion.div
        layoutId={reduce ? undefined : `service-card-${service.id}`}
        style={{ visibility: hidden ? "hidden" : "visible", borderRadius: 24 }}
        whileHover={reduce ? undefined : interaction.cardHover}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden bg-card shadow-soft ring-1 ring-inset transition-shadow hover:shadow-lift",
          selected ? "ring-2 ring-portal shadow-glow" : "ring-border/60"
        )}
      >
        {/* Opens the details only; adding to the booking is the separate control. */}
        <button
          type="button"
          onClick={() => onOpenDetails(service.id)}
          aria-label={`${service.name}: view details`}
          className="flex flex-1 flex-col text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="relative block aspect-[4/3] w-full overflow-hidden bg-muted">
            {image && !broken ? (
              <img
                src={serviceImageUrl(image, 480, 360)}
                alt=""
                loading={index < 4 ? "eager" : "lazy"}
                decoding="async"
                onError={() => setBroken(true)}
                className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            ) : (
              <span className="relative overflow-hidden grid size-full place-items-center text-portal">
                <Icon className="relative z-[2] size-10 opacity-80" aria-hidden />
              </span>
            )}
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
            {hasOffer && view.percent ? (
              <span className="absolute top-2.5 left-2.5 rounded-full bg-card/95 px-2 py-1 text-micro font-bold text-ink-success shadow-soft">−{view.percent.toFixed(0)}%</span>
            ) : null}
            {photoCount > 1 ? (
              <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-micro font-semibold text-white">
                <Images className="size-3" aria-hidden /> {photoCount}
              </span>
            ) : null}
            <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-micro font-semibold text-white">
              <Clock className="size-3" aria-hidden /> {view.duration} min
            </span>
          </span>
          <span className="flex flex-1 flex-col gap-1 p-3 pb-2 sm:p-4 sm:pb-2">
            <span className="line-clamp-2 text-[15px] leading-snug font-semibold">{service.name}</span>
            <span className="mt-auto flex flex-wrap items-baseline gap-x-1.5 pr-12">
              <span className="font-display text-lg font-bold tabular-nums">{formatRupees(view.final)}</span>
              {hasOffer ? <span className="text-caption text-ink-neutral line-through">{formatRupees(view.original)}</span> : null}
            </span>
            {showMemberHint ? <span className="text-micro font-semibold text-ink-success">Members {formatRupees(view.memberPrice)}</span> : null}
          </span>
        </button>
        {variants.length ? (
          <label className="mx-3 mb-3 flex items-center sm:mx-4">
            <span className="sr-only">{service.name}: choose an option</span>
            <select
              value={view.variant?.name ?? ""}
              onChange={(e) => onSelectVariant(service.id, e.target.value)}
              className="h-9 w-full min-w-0 rounded-chip bg-muted px-2 pr-12 text-caption font-semibold text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {variants.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name} · {formatRupees(resolveServicePrice({ ...service, variants: [item] }, item.name, membershipSegment).price)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <UserCartToggle added={selected} onChange={(next) => onToggle(service.id, next)} label={service.name} className={cn("absolute right-3", variants.length ? "bottom-[3.25rem]" : "bottom-3")} />
      </motion.div>
    </motion.li>
  );
});

/**
 * Customer service catalog: search, category and audience chips, a photo grid with an animated
 * add/remove control per card. Cards share a layoutId with the details dialog (desktop) so opening
 * details expands the card in place; `expandedId` hides the source card while it is expanded.
 */
export function CustomerServicePicker({ services, loading, selectedIds, pricedServices, variantSelections, membershipSegment, expandedId, onToggle, onSelectVariant, onOpenDetails }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [audience, setAudience] = useState("ALL");
  const [child, setChild] = useState("ALL");
  // Options picked on cards that are not in the booking yet; the booking's own choice wins once added.
  const [localChoice, setLocalChoice] = useState({});
  const deferredQuery = useDeferredValue(query);

  const pricedById = useMemo(() => new Map((pricedServices ?? []).map((item) => [item.serviceId, item])), [pricedServices]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const categories = useMemo(() => {
    const counts = new Map();
    for (const service of services) {
      const key = normalize(service.category, "GENERAL");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [services]);

  // Only offer audience filters the data can answer.
  const audiences = useMemo(() => {
    const available = AUDIENCES.filter((a) => a.value === "ALL" || services.some((s) => matchesAudience(s, a.value, "ALL")));
    return available.length > 1 && services.some((s) => s.gender) ? available : [];
  }, [services]);

  const visible = useMemo(() => {
    const text = deferredQuery.trim().toLowerCase();
    return services.filter((service) => {
      if (category !== "ALL" && normalize(service.category, "GENERAL") !== category) return false;
      if (!matchesAudience(service, audience, child)) return false;
      return !text || `${service.name} ${service.category} ${service.description ?? ""}`.toLowerCase().includes(text);
    });
  }, [category, child, deferredQuery, audience, services]);

  const variantFor = (service) => variantSelections?.[service.id] ?? localChoice[service.id] ?? "";
  const handleSelectVariant = (serviceId, name) => {
    setLocalChoice((current) => ({ ...current, [serviceId]: name }));
    if (selected.has(serviceId)) onSelectVariant?.(serviceId, name);
  };
  const handleToggle = (serviceId, checked) => {
    onToggle(serviceId, checked);
    const service = services.find((item) => item.id === serviceId);
    const chosen = localChoice[serviceId];
    if (checked && chosen && service && chosen !== defaultVariantName(service)) onSelectVariant?.(serviceId, chosen);
  };
  const clearFilters = () => {
    setQuery("");
    setCategory("ALL");
    setAudience("ALL");
    setChild("ALL");
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-neutral" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services"
          aria-label="Search services"
          className="h-12 w-full rounded-full bg-card pr-12 pl-12 text-base shadow-soft ring-1 ring-inset ring-border/70 outline-none transition-shadow focus-visible:shadow-glow focus-visible:ring-portal/50"
        />
        <AnimatePresence>
          {query ? (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={spring.bouncy}
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="tap absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-muted"
            >
              <X className="size-4" aria-hidden />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {audiences.length ? (
        <LayoutGroup id="svc-audience">
          <div className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] py-0.5" role="group" aria-label="Who is it for">
            {audiences.map((item) => (
              <FilterChip
                key={item.value}
                layoutGroup="svc-audience"
                icon={item.icon}
                active={audience === item.value}
                onClick={() => {
                  setAudience(item.value);
                  setChild("ALL");
                }}
              >
                {item.label}
              </FilterChip>
            ))}
          </div>
        </LayoutGroup>
      ) : null}

      <AnimatePresence initial={false}>
        {audience === "CHILDREN" ? (
          <motion.div key="kids" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring.snappy}>
            <LayoutGroup id="svc-child">
              <div className="flex gap-2" role="group" aria-label="Children's services">
                {CHILD_FILTERS.map((item) => (
                  <FilterChip key={item.value} layoutGroup="svc-child" active={child === item.value} onClick={() => setChild(item.value)}>
                    {item.label}
                  </FilterChip>
                ))}
              </div>
            </LayoutGroup>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {categories.length > 1 ? (
        <LayoutGroup id="svc-category">
          <div className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] py-0.5" role="group" aria-label="Categories">
            <FilterChip layoutGroup="svc-category" active={category === "ALL"} onClick={() => setCategory("ALL")} icon={Layers}>
              All
            </FilterChip>
            {categories.map(([key, count]) => (
              <FilterChip key={key} layoutGroup="svc-category" active={category === key} onClick={() => setCategory(key)} icon={iconForCategory(key)}>
                {titleCase(key)} <span className="opacity-70">{count}</span>
              </FilterChip>
            ))}
          </div>
        </LayoutGroup>
      ) : null}

      {loading && !services.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4" aria-label="Loading services">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="overflow-hidden rounded-card bg-card ring-1 ring-inset ring-border/60">
              <SkeletonShimmer className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-2 p-4">
                <SkeletonShimmer className="h-4 w-3/4" />
                <SkeletonShimmer className="h-5 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      ) : visible.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((service, index) => (
              <ServiceCard
                key={service.id}
                index={index}
                service={service}
                selected={selected.has(service.id)}
                hidden={expandedId === service.id}
                priced={pricedById.get(service.id)}
                variant={variantFor(service)}
                membershipSegment={membershipSegment}
                onSelectVariant={handleSelectVariant}
                onToggle={handleToggle}
                onOpenDetails={onOpenDetails}
              />
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <EmptyState
          illustration="search"
          title="No matching services"
          compact
          action={
            <button type="button" onClick={clearFilters} className="inline-flex h-11 items-center gap-2 rounded-control px-4 text-sm font-semibold text-portal hover:bg-portal/10">
              <Sparkles className="size-4" aria-hidden /> Clear filters
            </button>
          }
        />
      )}
    </div>
  );
}
