"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { serviceImageUrl } from "@/lib/service-image";
import { cn } from "@/lib/utils";
import {
  Brush,
  Check,
  Clock,
  Droplets,
  Flower2,
  Hand,
  Layers,
  Scissors,
  Search,
  SearchX,
  Sparkles,
  X,
} from "lucide-react";
import { memo, useDeferredValue, useMemo, useState } from "react";

const CATEGORY_ICONS = [
  [/hair|cut|style|colou?r/i, Scissors],
  [/skin|face|facial|clean/i, Sparkles],
  [/nail|mani|pedi/i, Hand],
  [/spa|massage|body|relax/i, Flower2],
  [/make|bridal/i, Brush],
  [/wax|thread|shave|beard/i, Droplets],
];
const iconForCategory = (category) => CATEGORY_ICONS.find(([re]) => re.test(category))?.[1] ?? Sparkles;

const GENDERS = [
  { value: "ALL", label: "All" },
  { value: "WOMEN", label: "Women" },
  { value: "MEN", label: "Men" },
  { value: "UNISEX", label: "Unisex" },
];

const normalize = (value, fallback) => `${value ?? fallback}`.trim().toUpperCase() || fallback;
const titleCase = (value) => value.charAt(0) + value.slice(1).toLowerCase();
const rupees = (value) => `₹${Math.round(Number(value) || 0)}`;

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

const ServiceCard = memo(function ServiceCard({ service, selected, priced, onToggle }) {
  const Icon = iconForCategory(service.category ?? "");
  const original = Number(priced?.originalPrice ?? service.basePrice ?? 0);
  const final = Number(priced?.finalPrice ?? service.basePrice ?? 0);
  const percent = Number(priced?.appliedPercent) > 0 ? Number(priced.appliedPercent) : 0;
  const hasOffer = final < original;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onToggle(service.id, !selected)}
      className={cn(
        "relative flex w-full gap-3 rounded-2xl p-3 text-left [contain-intrinsic-size:auto_112px] [content-visibility:auto]",
        selected ? "bg-primary/10 ring-2 ring-primary" : "bg-card ring-2 ring-transparent"
      )}
    >
      <span className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-primary">
        {service.image ? (
          <img
            src={serviceImageUrl(service.image)}
            alt=""
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <Icon className="size-8" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-between py-0.5 pr-7">
        <span>
          <span className="block truncate text-[15px] font-semibold">{service.name}</span>
          {service.description ? (
            <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">{service.description}</span>
          ) : null}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {service.duration} min
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-primary">{rupees(final)}</span>
            {hasOffer ? <span className="text-xs text-muted-foreground line-through">{rupees(original)}</span> : null}
            {hasOffer && percent ? <span className="text-xs font-semibold text-success">{percent.toFixed(0)}% off</span> : null}
          </span>
        </span>
      </span>
      <span
        className={cn(
          "absolute right-3 top-3 grid size-6 place-items-center rounded-full",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-transparent"
        )}
      >
        <Check className="size-4" />
      </span>
    </button>
  );
});

/** Customer-facing service chooser: image cards, icon chips, instant search. */
export function CustomerServicePicker({ services, loading, selectedIds, pricedServices, onToggle }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [gender, setGender] = useState("ALL");
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
      if (gender !== "ALL" && normalize(service.gender, "UNISEX") !== gender) return false;
      return !text || `${service.name} ${service.category} ${service.description ?? ""}`.toLowerCase().includes(text);
    });
  }, [category, deferredQuery, gender, services]);

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

      <div className="flex gap-1 rounded-full bg-card p-1 sm:w-fit" role="group" aria-label="Filter by gender">
        {GENDERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setGender(item.value)}
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
              onToggle={onToggle}
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
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
