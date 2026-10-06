"use client";

import { PixelImage } from "@/components/fx/pixel-image";
import { Skeleton } from "@/components/ui/skeleton";
import { serviceImageUrl } from "@/lib/service-image";
import { defaultVariantName, formatRupees, resolveServicePrice, serviceVariants } from "@/lib/service-pricing";
import { cn } from "@/lib/utils";
import {
  Check,
  Clock,
  Images,
  Info,
  Layers,
  Scissors,
  Search,
  SearchX,
  Sparkles,
  X,
} from "lucide-react";
import { iconForCategory } from "@/lib/service-icons";
import { memo, useDeferredValue, useMemo, useState } from "react";

// Category icons live in one shared map (src/lib/service-icons.js); re-exported for existing imports.
export { iconForCategory };

const GENDERS = [
  { value: "ALL", label: "All" },
  { value: "WOMEN", label: "Women" },
  { value: "MEN", label: "Men" },
  { value: "UNISEX", label: "Unisex" },
  { value: "CHILDREN", label: "Children" },
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
const rupees = (value) => formatRupees(value);

/** Children = anything for a boy or girl, plus kids services that are for both (e.g. Kids Cut). */
function matchesAudience(service, gender, child) {
  const audience = normalize(service.gender, "UNISEX");
  if (gender === "ALL") return true;
  if (gender !== "CHILDREN") return audience === gender;
  const forBothKids = normalize(service.category, "GENERAL") === KIDS_CATEGORY && audience === "UNISEX";
  if (child === "BOY") return audience === "BOY" || forBothKids;
  if (child === "GIRL") return audience === "GIRL" || forBothKids;
  return audience === "BOY" || audience === "GIRL" || forBothKids;
}

function Chip({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium",
        active ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
      )}
    >
      {Icon ? <Icon className="size-4" /> : null}
      {children}
    </button>
  );
}

const ServiceCard = memo(function ServiceCard({
  service,
  selected,
  priced,
  variant,
  membershipSegment,
  onToggle,
  onSelectVariant,
  onOpenDetails,
}) {
  const Icon = iconForCategory(service.category ?? "");
  const variants = serviceVariants(service);
  const resolved = resolveServicePrice(service, variant, membershipSegment);
  const original = resolved.price;
  const percent = Number(priced?.appliedPercent) > 0 ? Number(priced.appliedPercent) : 0;
  const final = Math.max(0, Math.round(original * (1 - percent / 100) * 100) / 100);
  const hasOffer = final < original;
  const duration = Number(resolved.variant?.duration) > 0 ? resolved.variant.duration : service.duration;
  const showMemberHint = resolved.memberPrice != null && resolved.memberPrice < resolved.listPrice && resolved.price === resolved.listPrice;
  const photoCount = Array.isArray(service.images) ? service.images.length : service.image ? 1 : 0;
  return (
    <div
      className={cn(
        "relative flex w-full flex-col rounded-2xl [contain-intrinsic-size:auto_112px] [content-visibility:auto]",
        selected ? "bg-primary/10 ring-2 ring-primary" : "bg-card ring-2 ring-transparent"
      )}
    >
      <div className="flex items-stretch">
        {/* Opens the details only. Adding to the booking is the separate control on the right. */}
        <button
          type="button"
          onClick={() => onOpenDetails(service.id)}
          aria-label={`${service.name}: view details`}
          className="flex min-w-0 flex-1 gap-3 rounded-2xl p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-primary">
            {service.image ? (
              <PixelImage src={serviceImageUrl(service.image)} alt="" className="size-full" />
            ) : (
              <Icon className="size-8" />
            )}
            {photoCount > 1 ? (
              <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <Images className="size-3" /> {photoCount}
              </span>
            ) : null}
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
            <span>
              <span className="block truncate text-[15px] font-semibold">{service.name}</span>
              {service.description ? (
                <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">{service.description}</span>
              ) : null}
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {duration} min
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-primary">{rupees(final)}</span>
                {hasOffer ? <span className="text-xs text-muted-foreground line-through">{rupees(original)}</span> : null}
                {hasOffer && percent ? <span className="text-xs font-semibold text-success">{percent.toFixed(0)}% off</span> : null}
              </span>
              {showMemberHint ? <span className="text-xs font-medium text-success">Members {rupees(resolved.memberPrice)}</span> : null}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-primary">
              <Info className="size-3.5" /> Details
            </span>
          </span>
        </button>
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={selected ? `Remove ${service.name} from booking` : `Add ${service.name} to booking`}
          onClick={() => onToggle(service.id, !selected)}
          className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-r-2xl border-l border-border/60 text-[11px] font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span
            className={cn(
              "grid size-7 place-items-center rounded-lg border-2 transition-colors",
              selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 bg-card text-transparent"
            )}
          >
            <Check className="size-4" strokeWidth={3} />
          </span>
          <span className={selected ? "text-primary" : "text-muted-foreground"}>{selected ? "Added" : "Add"}</span>
        </button>
      </div>
      {variants.length ? (
        <label className="flex items-center gap-2 px-3 pb-3 text-xs font-medium text-muted-foreground">
          <span className="shrink-0">Choose</span>
          <select
            value={resolved.variant?.name ?? ""}
            onChange={(e) => onSelectVariant(service.id, e.target.value)}
            aria-label={`${service.name}: choose an option`}
            className="h-9 min-w-0 flex-1 rounded-lg bg-secondary px-2 text-sm font-medium text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {variants.map((item) => {
              const price = resolveServicePrice({ ...service, variants: [item] }, item.name, membershipSegment).price;
              return (
                <option key={item.name} value={item.name}>
                  {item.name} - {formatRupees(price)}
                </option>
              );
            })}
          </select>
        </label>
      ) : null}
    </div>
  );
});

/** Customer-facing service chooser: image cards, icon chips, instant search. */
export function CustomerServicePicker({
  services,
  loading,
  selectedIds,
  pricedServices,
  variantSelections,
  membershipSegment,
  onToggle,
  onSelectVariant,
  onOpenDetails,
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [gender, setGender] = useState("ALL");
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

  const visible = useMemo(() => {
    const text = deferredQuery.trim().toLowerCase();
    return services.filter((service) => {
      if (category !== "ALL" && normalize(service.category, "GENERAL") !== category) return false;
      if (!matchesAudience(service, gender, child)) return false;
      return !text || `${service.name} ${service.category} ${service.description ?? ""}`.toLowerCase().includes(text);
    });
  }, [category, child, deferredQuery, gender, services]);

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

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services"
          aria-label="Search services"
          className="h-12 w-full rounded-full bg-card pl-12 pr-11 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-muted"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={category === "ALL"} onClick={() => setCategory("ALL")} icon={Layers}>
          All
        </Chip>
        {categories.map(([key, count]) => (
          <Chip key={key} active={category === key} onClick={() => setCategory(key)} icon={iconForCategory(key)}>
            {titleCase(key)} <span className="opacity-70">{count}</span>
          </Chip>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-full bg-card p-1 sm:w-fit" role="group" aria-label="Filter by audience">
        {GENDERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setGender(item.value);
              setChild("ALL");
            }}
            aria-pressed={gender === item.value}
            className={cn(
              "h-9 flex-1 rounded-full px-4 text-sm font-medium sm:flex-none",
              gender === item.value ? "bg-secondary text-foreground" : "text-muted-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {gender === "CHILDREN" ? (
        <div className="flex gap-1 rounded-full bg-card p-1 sm:w-fit" role="group" aria-label="Filter children's services">
          {CHILD_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setChild(item.value)}
              aria-pressed={child === item.value}
              className={cn(
                "h-9 flex-1 rounded-full px-4 text-sm font-medium sm:flex-none",
                child === item.value ? "bg-secondary text-foreground" : "text-muted-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {loading && !services.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[112px] rounded-2xl" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {visible.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              selected={selected.has(service.id)}
              priced={pricedById.get(service.id)}
              variant={variantFor(service)}
              membershipSegment={membershipSegment}
              onSelectVariant={handleSelectVariant}
              onToggle={handleToggle}
              onOpenDetails={onOpenDetails}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card py-12 text-center">
          <SearchX className="size-8 text-muted-foreground" />
          <p className="font-semibold">No matching services</p>
          <button
            type="button"
            className="text-sm font-medium text-primary underline"
            onClick={() => {
              setQuery("");
              setCategory("ALL");
              setGender("ALL");
              setChild("ALL");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
