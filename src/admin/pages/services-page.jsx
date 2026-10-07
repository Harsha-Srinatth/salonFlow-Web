"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Clock, Eye, EyeOff, Images, Layers, Pencil, Plus, Scissors, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { ButtonLoadingMorph, ErrorState, IconButton, PriceTag, StatCard } from "@/components/kit";
import { interaction, spring } from "@/components/motion";
import { EmptyState } from "@/admin/components/empty-state";
import { FilterTabs } from "@/admin/components/filter-tabs";
import { ServiceEditorDrawer } from "@/admin/components/service-editor-drawer";
import { SkeletonCards } from "@/admin/components/skeleton";
import { Switch } from "@/admin/components/switch";
import { apiJson } from "@/lib/api-json";
import { formatDuration, formatMoney } from "@/lib/format";
import { notify } from "@/lib/notify";
import { serviceImages } from "@/lib/service-details";
import { iconForAudience, iconForCategory, iconForService } from "@/lib/service-icons";
import { serviceImageUrl } from "@/lib/service-image";
import { cn } from "@/lib/utils";
import { connectAdminRealtime, disconnectAdminRealtime, fetchAdminServices, updateAdminServiceAsync } from "@/store/admin-portal-slice";
import { AdminLayout } from "../portal/admin-layout";

export const AUDIENCE_LABEL = { MEN: "Men", WOMEN: "Women", UNISEX: "Unisex", BOY: "Boy", GIRL: "Girl" };
const AUDIENCE_FILTERS = [
  { value: "ALL", label: "Everyone" },
  { value: "WOMEN", label: "Women", icon: iconForAudience("WOMEN") },
  { value: "MEN", label: "Men", icon: iconForAudience("MEN") },
  { value: "KIDS", label: "Kids", icon: iconForAudience("KIDS") },
  { value: "UNISEX", label: "Unisex", icon: iconForAudience("UNISEX") },
];
const isKids = (g) => g === "BOY" || g === "GIRL";
const categoryOf = (service) => `${service.category ?? "GENERAL"}`.trim().toUpperCase() || "GENERAL";

/** Cover photo with a shimmer until it loads and an icon tile when there is none. */
function Cover({ service }) {
  const [state, setState] = useState("loading");
  const src = serviceImageUrl(serviceImages(service)[0], 640, 400);
  const Icon = iconForService(service);
  if (!src || state === "error") {
    return (
      <div className="grid size-full place-items-center bg-gradient-to-br from-portal/14 to-muted text-portal">
        <Icon className="size-10" aria-hidden />
      </div>
    );
  }
  return (
    <>
      {state === "loading" ? <span aria-hidden className="kit-shimmer absolute inset-0" /> : null}
      <img src={src} alt="" loading="lazy" decoding="async" onLoad={() => setState("ready")} onError={() => setState("error")} className={cn("size-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-105", state === "ready" ? "opacity-100" : "opacity-0")} />
    </>
  );
}

function ServiceCard({ service, index, onEdit, onToggle }) {
  const reduce = useReducedMotion();
  const photos = serviceImages(service).length;
  const price = Number(service.basePrice ?? 0);
  const member = service.memberPrice == null || service.memberPrice === "" ? null : Number(service.memberPrice);
  const variants = Array.isArray(service.variants) ? service.variants.length : 0;
  const AudienceIcon = iconForAudience(service.gender);
  const CategoryIcon = iconForCategory(service.category);
  return (
    <motion.article
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={reduce ? undefined : interaction.cardHover}
      transition={{ ...spring.soft, delay: Math.min(index, 10) * 0.04 }}
      className={cn("group relative flex flex-col overflow-hidden rounded-card border border-border/60 bg-card shadow-soft transition-shadow hover:shadow-lift", !service.isActive && "opacity-75")}
    >
      <button type="button" onClick={onEdit} aria-label={`Edit ${service.name}`} className="relative block aspect-[16/10] w-full overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-portal">
        <Cover service={service} />
        <span className="glass-strong absolute top-2 left-2 inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold">
          <CategoryIcon className="size-3.5" aria-hidden /> {categoryOf(service)}
        </span>
        {photos > 1 ? (
          <span className="glass-strong absolute right-2 bottom-2 inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold">
            <Images className="size-3.5" aria-hidden /> {photos}
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-headline font-semibold">{service.name}</h3>
          <p className="mt-0.5 line-clamp-2 min-h-9 text-caption text-ink-neutral">{service.description || "No description yet"}</p>
        </div>
        <PriceTag amount={price} size="md" />
        <ul className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-ink-neutral">
          {member != null && member < price ? <li className="inline-flex h-7 items-center rounded-full bg-gold/16 px-2.5 text-ink-warning ring-1 ring-inset ring-gold/35">Member {formatMoney(member)}</li> : null}
          <li className="inline-flex h-7 items-center gap-1 rounded-full bg-muted px-2.5">
            <Clock className="size-3.5" aria-hidden /> {formatDuration(service.duration ?? 30)}
          </li>
          <li className="inline-flex h-7 items-center gap-1 rounded-full bg-muted px-2.5">
            <AudienceIcon className="size-3.5" aria-hidden /> {AUDIENCE_LABEL[service.gender] ?? "Unisex"}
          </li>
          {variants ? (
            <li className="inline-flex h-7 items-center gap-1 rounded-full bg-muted px-2.5">
              <Layers className="size-3.5" aria-hidden /> {variants}
            </li>
          ) : null}
        </ul>
        <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3">
          <span className="flex items-center gap-2.5 text-caption font-semibold">
            <Switch checked={Boolean(service.isActive)} onChange={onToggle} label={service.isActive ? `Hide ${service.name}` : `Show ${service.name}`} />
            <span className={cn("inline-flex items-center gap-1", service.isActive ? "text-ink-success" : "text-ink-neutral")}>
              {service.isActive ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
              {service.isActive ? "Live" : "Hidden"}
            </span>
          </span>
          <IconButton icon={Pencil} label={`Edit ${service.name}`} variant="soft" onClick={onEdit} />
        </div>
      </div>
    </motion.article>
  );
}

export default function AdminServicesPage() {
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const { services, appointmentsError } = useSelector((state) => state.adminPortal);
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [audience, setAudience] = useState("ALL");
  const [aiAvailable, setAiAvailable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editor, setEditor] = useState({ open: false, serviceId: null });

  useEffect(() => {
    apiJson("/api/admin/agents", { auth: true })
      .then((data) => setAiAvailable(Boolean(data.llmConfigured)))
      .catch(() => setAiAvailable(false));
  }, []);

  const load = async () => {
    const result = await dispatch(fetchAdminServices());
    setLoaded(true);
    setLoadFailed(fetchAdminServices.rejected.match(result));
    if (fetchAdminServices.rejected.match(result)) throw new Error(result.payload);
  };

  useEffect(() => {
    void dispatch(connectAdminRealtime());
    load().catch(() => {});
    return () => {
      void dispatch(disconnectAdminRealtime());
    };
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep links: ?new=1 opens a blank editor, ?edit=<id> opens that service once it has loaded.
  useEffect(() => {
    const edit = params.get("edit");
    const create = params.get("new");
    if (!create && !(edit && services.some((s) => s.id === edit))) return;
    setEditor({ open: true, serviceId: create ? null : edit });
    setParams((p) => {
      p.delete("edit");
      p.delete("new");
      return p;
    }, { replace: true });
  }, [params, services, setParams]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const service of services) counts[categoryOf(service)] = (counts[categoryOf(service)] ?? 0) + 1;
    return counts;
  }, [services]);

  const filteredServices = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return services.filter((service) => {
      if (activeCategory !== "ALL" && categoryOf(service) !== activeCategory) return false;
      if (audience === "KIDS" ? !isKids(service.gender) : audience !== "ALL" && service.gender !== audience) return false;
      if (!query) return true;
      return `${service.name ?? ""} ${service.category ?? ""} ${service.gender ?? ""}`.toLowerCase().includes(query);
    });
  }, [activeCategory, audience, searchText, services]);

  const editing = editor.serviceId ? services.find((s) => s.id === editor.serviceId) ?? null : null;
  const activeCount = services.filter((s) => s.isActive).length;
  const photoless = services.filter((s) => !serviceImages(s).length).length;

  async function toggleActive(service) {
    const next = !service.isActive;
    const [cover = "", ...gallery] = serviceImages(service);
    const result = await dispatch(
      updateAdminServiceAsync({
        id: service.id,
        payload: {
          name: service.name,
          category: service.category,
          gender: service.gender,
          basePrice: Number(service.basePrice ?? 0),
          memberPrice: service.memberPrice === "" || service.memberPrice == null ? null : Number(service.memberPrice),
          duration: Number(service.duration || 30),
          description: service.description ?? "",
          image: cover,
          gallery,
          details: service.details ?? {},
          variants: Array.isArray(service.variants) ? service.variants : [],
          isActive: next,
        },
      })
    );
    if (updateAdminServiceAsync.rejected.match(result)) notify.error(result.payload ?? "Could not update service");
    else notify.success(next ? `${service.name} is live` : `${service.name} is hidden`);
  }

  const resetFilters = () => {
    setSearchText("");
    setActiveCategory("ALL");
    setAudience("ALL");
  };

  return (
    <AdminLayout
      pageTitle="Services"
      description="Menu, prices and photos"
      actions={
        <ButtonLoadingMorph icon={Plus} onClick={() => setEditor({ open: true, serviceId: null })}>
          Add service
        </ButtonLoadingMorph>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Scissors} label="Services" value={services.length} tone="primary" loading={!loaded && !services.length} />
          <StatCard icon={Eye} label="Live" value={activeCount} tone="success" loading={!loaded && !services.length} />
          <StatCard icon={Images} label="No photo" value={photoless} tone={photoless ? "warning" : "neutral"} loading={!loaded && !services.length} />
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <label className="relative block min-w-0 lg:w-80">
              <span className="sr-only">Search services</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-neutral" aria-hidden />
              <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search services" className="h-11 w-full rounded-control bg-card pr-10 pl-10 text-sm shadow-soft ring-1 ring-inset ring-border/60 outline-none placeholder:text-ink-neutral focus-visible:ring-2 focus-visible:ring-portal" />
              <AnimatePresence>
                {searchText ? (
                  <motion.button initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} type="button" aria-label="Clear search" onClick={() => setSearchText("")} className="tap absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-muted">
                    <X className="size-3.5" aria-hidden />
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </label>
            <FilterTabs label="Who it's for" options={AUDIENCE_FILTERS} value={audience} onChange={setAudience} className="min-w-0" />
          </div>
          <FilterTabs
            label="Category"
            options={[{ value: "ALL", label: "All", count: services.length }, ...Object.entries(categoryCounts).map(([value, count]) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase(), icon: iconForCategory(value), count }))]}
            value={activeCategory}
            onChange={setActiveCategory}
          />
        </div>

        {loadFailed && !services.length ? (
          <ErrorState title="Couldn't load services" description={appointmentsError ?? undefined} onRetry={load} />
        ) : !loaded && !services.length ? (
          <SkeletonCards count={6} />
        ) : !filteredServices.length ? (
          <EmptyState
            illustration={services.length ? "search" : "bag"}
            title={services.length ? "No matches" : "No services yet"}
            description={services.length ? "Try another filter." : "Add one to start taking bookings."}
            actionLabel={services.length ? "Clear filters" : "Add service"}
            actionIcon={services.length ? X : Plus}
            onAction={services.length ? resetFilters : () => setEditor({ open: true, serviceId: null })}
          />
        ) : (
          <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service, index) => (
                <ServiceCard key={service.id} service={service} index={index} onEdit={() => setEditor({ open: true, serviceId: service.id })} onToggle={() => void toggleActive(service)} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <ServiceEditorDrawer open={editor.open} onOpenChange={(open) => setEditor((e) => ({ ...e, open }))} service={editing} categories={Object.keys(categoryCounts).filter((c) => c !== "GENERAL")} aiAvailable={aiAvailable} />
    </AdminLayout>
  );
}
