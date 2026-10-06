"use client";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { BorderBeam } from "border-beam";
import { Clock, Images, Pencil, Plus, Scissors, Search, Tag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { ServiceEditorDrawer, Switch } from "@/admin/components/service-editor-drawer";
import { PixelImage } from "@/components/fx/pixel-image";
import { LoadingOrb } from "@/components/shared/loading-orb";
import { apiJson } from "@/lib/api-json";
import { serviceImages } from "@/lib/service-details";
import { serviceImageUrl } from "@/lib/service-image";
import { cn } from "@/lib/utils";
import { connectAdminRealtime, disconnectAdminRealtime, fetchAdminServices, updateAdminServiceAsync } from "@/store/admin-portal-slice";
import { AdminLayout } from "../portal/admin-layout";

const AUDIENCE_LABEL = { MEN: "Men", WOMEN: "Women", UNISEX: "Unisex", BOY: "Boy", GIRL: "Girl" };
const categoryOf = (service) => `${service.category ?? "GENERAL"}`.trim().toUpperCase() || "GENERAL";

function ServiceCard({ service, index, busy, onEdit, onToggle }) {
  const photos = serviceImages(service).length;
  const price = Number(service.basePrice ?? 0);
  const member = service.memberPrice == null || service.memberPrice === "" ? null : Number(service.memberPrice);
  const variants = Array.isArray(service.variants) ? service.variants.length : 0;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay: Math.min(index, 8) * 0.03 }}
      whileHover={{ y: -3 }}
      className={cn("admin-shadow-sm group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card", !service.isActive && "opacity-75")}
    >
      <button type="button" onClick={onEdit} aria-label={`Edit ${service.name}`} className="relative block aspect-[16/10] w-full overflow-hidden text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <PixelImage
          src={serviceImageUrl(service.image, 640, 400)}
          alt={service.name}
          className="size-full"
          imgClassName="transition-transform duration-500 group-hover:scale-105"
          fallback={
            <div className="grid size-full place-items-center bg-gradient-to-br from-secondary to-muted text-primary/60">
              <Scissors className="size-9" />
            </div>
          }
        />
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">{categoryOf(service)}</span>
        {photos > 1 ? (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
            <Images className="size-3" /> {photos}
          </span>
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow">
            <Pencil className="size-3.5" /> Edit
          </span>
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold">{service.name}</h3>
          <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-muted-foreground">{service.description || "No description yet"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <Tag className="size-3.5 text-primary" /> Rs {price.toLocaleString("en-IN")}
          </span>
          {member != null && member < price ? <span className="rounded-full bg-accent/15 px-2 py-0.5 font-medium text-foreground">Member Rs {member.toLocaleString("en-IN")}</span> : null}
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {service.duration ?? 30} min
          </span>
          <span>{AUDIENCE_LABEL[service.gender] ?? "Unisex"}</span>
          {variants ? <span>{variants} variant{variants === 1 ? "" : "s"}</span> : null}
        </div>
        <div className="mt-auto flex items-center justify-between border-t pt-3">
          <label className="flex items-center gap-2 text-xs font-medium">
            <Switch checked={Boolean(service.isActive)} onChange={onToggle} label={service.isActive ? "Deactivate service" : "Activate service"} />
            <span className={service.isActive ? "text-success" : "text-muted-foreground"}>{service.isActive ? "Live" : "Hidden"}</span>
          </label>
          <Button type="button" size="sm" variant="outline" onClick={onEdit} disabled={busy}>
            <Pencil className="size-3.5" /> Edit
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

export default function AdminServicesPage() {
  const dispatch = useDispatch();
  const { services, appointmentsMutating, appointmentsError, realtimeConnected } = useSelector((state) => state.adminPortal);
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [aiAvailable, setAiAvailable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editor, setEditor] = useState({ open: false, serviceId: null });

  useEffect(() => {
    apiJson("/api/admin/agents", { auth: true }).then((data) => setAiAvailable(Boolean(data.llmConfigured))).catch(() => setAiAvailable(false));
  }, []);

  useEffect(() => {
    void dispatch(connectAdminRealtime());
    void dispatch(fetchAdminServices()).finally(() => setLoaded(true));
    return () => {
      void dispatch(disconnectAdminRealtime());
    };
  }, [dispatch]);

  useEffect(() => {
    if (appointmentsError) toast.error(appointmentsError);
  }, [appointmentsError]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const service of services) counts[categoryOf(service)] = (counts[categoryOf(service)] ?? 0) + 1;
    return counts;
  }, [services]);

  const filteredServices = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return services.filter((service) => {
      if (activeCategory !== "ALL" && categoryOf(service) !== activeCategory) return false;
      if (!query) return true;
      return `${service.name ?? ""} ${service.category ?? ""} ${service.gender ?? ""}`.toLowerCase().includes(query);
    });
  }, [activeCategory, searchText, services]);

  const editing = editor.serviceId ? services.find((s) => s.id === editor.serviceId) ?? null : null;
  const activeCount = services.filter((s) => s.isActive).length;

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
    if (updateAdminServiceAsync.rejected.match(result)) toast.error(result.payload ?? "Could not update service");
    else toast.success(next ? `${service.name} is now live` : `${service.name} is hidden from customers`);
  }

  return (
    <AdminLayout
      pageTitle="Services"
      description="Menu, pricing, photos and details for every service you offer."
      actions={
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
            <span className={`admin-live-dot relative inline-flex size-1.5 rounded-full ${realtimeConnected ? "bg-emerald-500 text-emerald-500" : "bg-muted-foreground text-muted-foreground"}`} />
            {realtimeConnected ? "Live" : "Offline"}
          </span>
          <BorderBeam size="sm">
            <Button type="button" onClick={() => setEditor({ open: true, serviceId: null })}>
              <Plus className="size-4" /> Add service
            </Button>
          </BorderBeam>
        </div>
      }
    >
      <div className="space-y-5">
        <ErrorBanner message={appointmentsError} onRetry={() => void dispatch(fetchAdminServices())} />

        <div className="grid grid-cols-3 gap-3">
          {[
            ["Services", services.length],
            ["Live", activeCount],
            ["Categories", Object.keys(categoryCounts).length],
          ].map(([label, value], i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="admin-shadow-sm rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <LayoutGroup id="svc-cats">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Category">
              {[["ALL", services.length], ...Object.entries(categoryCounts)].map(([category, count]) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                  className={cn("relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors", activeCategory === category ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                >
                  {activeCategory === category ? <motion.span layoutId="svc-cat-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 500, damping: 36 }} /> : null}
                  <span className="relative">
                    {category === "ALL" ? "All" : category} <span className="opacity-70">{count}</span>
                  </span>
                </button>
              ))}
            </div>
          </LayoutGroup>
          <BorderBeam className="w-full lg:w-80" radius="0.75rem">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search services"
                aria-label="Search services"
                className="h-10 w-full rounded-xl border bg-card pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground"
              />
              <AnimatePresence>
                {searchText ? (
                  <motion.button initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} type="button" aria-label="Clear search" onClick={() => setSearchText("")} className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-muted">
                    <X className="size-3" />
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </div>
          </BorderBeam>
        </div>

        {!loaded && !services.length ? (
          <LoadingOrb compact label="Loading services…" />
        ) : !filteredServices.length ? (
          <EmptyState
            icon={Scissors}
            title={services.length ? "No services match" : "No services yet"}
            description={services.length ? "Try a different search or category." : "Add your first service to start taking bookings."}
            actionLabel={services.length ? undefined : "Add service"}
            onAction={() => setEditor({ open: true, serviceId: null })}
          />
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service, index) => (
                <ServiceCard key={service.id} service={service} index={index} busy={appointmentsMutating} onEdit={() => setEditor({ open: true, serviceId: service.id })} onToggle={() => void toggleActive(service)} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <ServiceEditorDrawer
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        service={editing}
        categories={Object.keys(categoryCounts).filter((c) => c !== "GENERAL")}
        aiAvailable={aiAvailable}
      />
    </AdminLayout>
  );
}
