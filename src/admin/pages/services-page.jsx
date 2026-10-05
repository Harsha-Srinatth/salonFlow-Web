"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { StatusPill } from "@/admin/components/status-pill";
import { ServiceDetailsEditor } from "@/admin/components/service-details-editor";
import { apiJson } from "@/lib/api-json";
import { useRevealOnReady } from "@/admin/lib/motion";
import {
    connectAdminRealtime,
    createAdminServiceAsync,
    disconnectAdminRealtime,
    fetchAdminServices,
    resetServiceDraft,
    setServiceDraftField,
    setServiceField,
    uploadAdminServiceImageAsync,
    updateAdminServiceAsync,
} from "@/store/admin-portal-slice";
import { Clock, ImagePlus, PlusCircle, Scissors, Tag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { AdminLayout } from "../portal/admin-layout";

export default function AdminServicesPage() {
    const dispatch = useDispatch();
    const { services, serviceDraft, appointmentsMutating, appointmentsError, realtimeConnected } = useSelector((state) => state.adminPortal);
    const [searchText, setSearchText] = useState("");
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [aiAvailable, setAiAvailable] = useState(false);
    useEffect(() => {
        apiJson("/api/admin/agents", { auth: true }).then((data) => setAiAvailable(Boolean(data.llmConfigured))).catch(() => setAiAvailable(false));
    }, []);
    const gridRef = useRevealOnReady([services.length, activeCategory, searchText], { selector: ":scope > *" });

    const categoryCounts = useMemo(() => {
        const counts = {};
        for (const service of services) {
            const category = `${service.category ?? "GENERAL"}`.trim().toUpperCase() || "GENERAL";
            counts[category] = (counts[category] ?? 0) + 1;
        }
        return counts;
    }, [services]);

    const filteredServices = useMemo(() => {
        const query = searchText.trim().toLowerCase();
        return services.filter((service) => {
            const category = `${service.category ?? "GENERAL"}`.trim().toUpperCase() || "GENERAL";
            const categoryMatch = activeCategory === "ALL" || category === activeCategory;
            if (!categoryMatch)
                return false;
            if (!query)
                return true;
            const haystack = `${service.name ?? ""} ${service.category ?? ""} ${service.gender ?? ""}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [activeCategory, searchText, services]);

    useEffect(() => {
        void dispatch(connectAdminRealtime());
        void dispatch(fetchAdminServices());
        return () => {
            void dispatch(disconnectAdminRealtime());
        };
    }, [dispatch]);

    useEffect(() => {
        if (appointmentsError)
            toast.error(appointmentsError);
    }, [appointmentsError]);

    async function fileToDataUri(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(`${reader.result ?? ""}`);
            reader.onerror = () => reject(new Error("Could not read image file"));
            reader.readAsDataURL(file);
        });
    }

    async function uploadDraftImage(file) {
        if (!file)
            return;
        try {
            const imageDataUri = await fileToDataUri(file);
            const result = await dispatch(uploadAdminServiceImageAsync({ imageDataUri }));
            if (uploadAdminServiceImageAsync.rejected.match(result)) {
                toast.error(result.payload ?? "Could not upload image");
                return;
            }
            dispatch(setServiceDraftField({ field: "image", value: result.payload?.imageUrl ?? "" }));
            toast.success("Service image uploaded");
        } catch {
            toast.error("Could not read the selected image file");
        }
    }

    async function uploadServiceImage(service, file) {
        if (!file)
            return;
        try {
            const imageDataUri = await fileToDataUri(file);
            const result = await dispatch(uploadAdminServiceImageAsync({ imageDataUri }));
            if (uploadAdminServiceImageAsync.rejected.match(result)) {
                toast.error(result.payload ?? "Could not upload image");
                return;
            }
            dispatch(setServiceField({ id: service.id, field: "image", value: result.payload?.imageUrl ?? "" }));
            toast.success("Service image uploaded");
        } catch {
            toast.error("Could not read the selected image file");
        }
    }

    async function createService() {
        if (!`${serviceDraft.name ?? ""}`.trim()) {
            toast.error("Service name is required");
            return;
        }
        const payload = {
            ...serviceDraft,
            basePrice: Number(serviceDraft.basePrice ?? 0),
            memberPrice: serviceDraft.memberPrice === "" || serviceDraft.memberPrice == null ? null : Number(serviceDraft.memberPrice),
            duration: Number(serviceDraft.duration || 30),
            variants: Array.isArray(serviceDraft.variants) ? serviceDraft.variants : [],
        };
        const result = await dispatch(createAdminServiceAsync(payload));
        if (createAdminServiceAsync.rejected.match(result)) {
            toast.error(result.payload ?? "Could not create service");
            return;
        }
        toast.success("Service created");
        dispatch(resetServiceDraft());
    }

    async function saveService(service) {
        const payload = {
            name: service.name,
            category: service.category,
            gender: service.gender,
            basePrice: Number(service.basePrice ?? 0),
            memberPrice: service.memberPrice === "" || service.memberPrice == null ? null : Number(service.memberPrice),
            duration: Number(service.duration || 30),
            description: service.description ?? "",
            image: service.image ?? "",
            variants: Array.isArray(service.variants) ? service.variants : [],
            isActive: Boolean(service.isActive),
        };
        const result = await dispatch(updateAdminServiceAsync({ id: service.id, payload }));
        if (updateAdminServiceAsync.rejected.match(result)) {
            toast.error(result.payload ?? "Could not update service");
            return;
        }
        toast.success("Service updated");
    }

    function addVariant(service) {
        const next = [...(Array.isArray(service.variants) ? service.variants : []), { name: "", price: "", memberPrice: "", duration: "30" }];
        dispatch(setServiceField({ id: service.id, field: "variants", value: next }));
    }

    function setVariantField(service, index, field, value) {
        const variants = Array.isArray(service.variants) ? [...service.variants] : [];
        variants[index] = {
            ...(variants[index] ?? {}),
            [field]: value,
        };
        dispatch(setServiceField({ id: service.id, field: "variants", value: variants }));
    }

    function removeVariant(service, index) {
        const variants = (Array.isArray(service.variants) ? service.variants : []).filter((_, idx) => idx !== index);
        dispatch(setServiceField({ id: service.id, field: "variants", value: variants }));
    }

    function retryLoad() {
        void dispatch(fetchAdminServices());
    }

    return (<AdminLayout
        pageTitle="Services"
        description="Menu, pricing, and variants for every service you offer."
        actions={
          <span className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
            <span className={`admin-live-dot relative inline-flex size-1.5 rounded-full ${realtimeConnected ? "bg-emerald-500 text-emerald-500" : "bg-muted-foreground text-muted-foreground"}`} />
            {realtimeConnected ? "Live" : "Offline"}
          </span>
        }>
      <div className="space-y-4">
        <ErrorBanner message={appointmentsError} onRetry={retryLoad} />

        <Card className="admin-shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2">
              <Scissors className="size-5"/>
              Service Management
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Admin adds services here first. Discount campaigns can be announced later.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border px-3 py-1 font-medium">Total services: {services.length}</span>
              <Button type="button" size="sm" variant={activeCategory === "ALL" ? "default" : "outline"} onClick={() => setActiveCategory("ALL")}>
                ALL ({services.length})
              </Button>
              {Object.entries(categoryCounts).map(([category, count]) => (<Button key={category} type="button" size="sm" variant={activeCategory === category ? "default" : "outline"} onClick={() => setActiveCategory(category)}>
                  {category} ({count})
                </Button>))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 md:p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <PlusCircle className="size-4 text-primary" />
                Add a new service
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="serviceName">Service name</Label>
                  <Input id="serviceName" value={serviceDraft.name} onChange={(e) => dispatch(setServiceDraftField({ field: "name", value: e.target.value }))}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceCategory">Category</Label>
                  <Input id="serviceCategory" value={serviceDraft.category} onChange={(e) => dispatch(setServiceDraftField({ field: "category", value: e.target.value }))}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceGender">Audience</Label>
                  <Select value={serviceDraft.gender} onValueChange={(value) => dispatch(setServiceDraftField({ field: "gender", value }))}>
                    <SelectTrigger id="serviceGender" className="w-full">
                      <SelectValue placeholder="Select gender"/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEN">Men</SelectItem>
                      <SelectItem value="WOMEN">Women</SelectItem>
                      <SelectItem value="UNISEX">Unisex</SelectItem>
                      <SelectItem value="BOY">Boy</SelectItem>
                      <SelectItem value="GIRL">Girl</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servicePrice">Base price</Label>
                  <Input id="servicePrice" type="number" min="1" value={serviceDraft.basePrice} onChange={(e) => dispatch(setServiceDraftField({ field: "basePrice", value: e.target.value }))}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceMemberPrice">Member price (optional)</Label>
                  <Input id="serviceMemberPrice" type="number" min="1" placeholder="Leave empty if no member rate" value={serviceDraft.memberPrice ?? ""} onChange={(e) => dispatch(setServiceDraftField({ field: "memberPrice", value: e.target.value }))}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceDuration">Duration (minutes)</Label>
                  <Input id="serviceDuration" type="number" min="10" value={serviceDraft.duration} onChange={(e) => dispatch(setServiceDraftField({ field: "duration", value: e.target.value }))}/>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="serviceDescription">Description</Label>
                  <Input id="serviceDescription" value={serviceDraft.description} onChange={(e) => dispatch(setServiceDraftField({ field: "description", value: e.target.value }))}/>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="serviceImageFile" className="flex items-center gap-1.5">
                    <ImagePlus className="size-3.5" /> Service image
                  </Label>
                  <Input id="serviceImageFile" type="file" accept="image/*" onChange={(e) => void uploadDraftImage(e.target.files?.[0] ?? null)}/>
                  {serviceDraft.image ? <p className="text-xs text-emerald-600 dark:text-emerald-400">Uploaded image ready.</p> : null}
                </div>
                <div className="md:col-span-2">
                  <Button type="button" disabled={appointmentsMutating} onClick={() => void createService()}>
                    {appointmentsMutating ? "Adding…" : "Add service"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Input className="w-full md:w-72" placeholder="Search service/category/gender" value={searchText} onChange={(e) => setSearchText(e.target.value)}/>
            </div>

            {!filteredServices.length ? (
              <EmptyState icon={Scissors} title="No services found" description="Try a different search or category, or add your first service above." />
            ) : null}
            <div ref={gridRef} className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {filteredServices.map((service) => (<div key={service.id} className="admin-card-hover admin-shadow-sm space-y-3 rounded-xl border border-border/70 bg-card p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted/20">
                      {service.image ? <img src={service.image} alt={service.name} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-muted-foreground"><Scissors className="size-6" /></div>}
                      <span className="absolute left-1 top-1">
                        <StatusPill status={service.isActive ? "ACTIVE" : "INACTIVE"} className="px-1.5 py-0.5 text-[9px]" />
                      </span>
                    </div>
                    <div className="grid flex-1 gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={service.name} onChange={(e) => dispatch(setServiceField({ id: service.id, field: "name", value: e.target.value }))}/>
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Input value={service.category ?? ""} onChange={(e) => dispatch(setServiceField({ id: service.id, field: "category", value: e.target.value }))}/>
                  </div>
                  <div className="space-y-1">
                    <Label>Audience</Label>
                    <Select value={service.gender ?? "UNISEX"} onValueChange={(value) => dispatch(setServiceField({ id: service.id, field: "gender", value }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEN">Men</SelectItem>
                        <SelectItem value="WOMEN">Women</SelectItem>
                        <SelectItem value="UNISEX">Unisex</SelectItem>
                        <SelectItem value="BOY">Boy</SelectItem>
                        <SelectItem value="GIRL">Girl</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1"><Tag className="size-3" /> Base price</Label>
                    <Input type="number" min="1" value={service.basePrice} onChange={(e) => dispatch(setServiceField({ id: service.id, field: "basePrice", value: e.target.value }))}/>
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1"><Tag className="size-3" /> Member price</Label>
                    <Input type="number" min="1" placeholder="No member rate" value={service.memberPrice ?? ""} onChange={(e) => dispatch(setServiceField({ id: service.id, field: "memberPrice", value: e.target.value }))}/>
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1"><Clock className="size-3" /> Duration (minutes)</Label>
                    <Input type="number" min="10" value={service.duration ?? 30} onChange={(e) => dispatch(setServiceField({ id: service.id, field: "duration", value: e.target.value }))}/>
                  </div>
                      <div className="space-y-1 md:col-span-2">
                    <Label>Description</Label>
                    <textarea rows={4} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" value={service.description ?? ""} onChange={(e) => dispatch(setServiceField({ id: service.id, field: "description", value: e.target.value }))}/>
                  </div>
                      <div className="space-y-1 md:col-span-2">
                    <Label className="flex items-center gap-1.5"><ImagePlus className="size-3.5" /> Service image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => void uploadServiceImage(service, e.target.files?.[0] ?? null)}/>
                    {service.image ? <p className="text-xs text-emerald-600 dark:text-emerald-400">Image uploaded for this service.</p> : null}
                  </div>
                    </div>
                  </div>
                <div className="space-y-2 rounded-lg border border-dashed p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Variants</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => addVariant(service)}>Add variant</Button>
                  </div>
                  {(Array.isArray(service.variants) ? service.variants : []).map((variant, index) => (<div key={`${service.id}-${index}`} className="grid gap-2 md:grid-cols-5">
                      <Input placeholder="Variant name" value={variant?.name ?? ""} onChange={(e) => setVariantField(service, index, "name", e.target.value)}/>
                      <Input type="number" min="1" placeholder="Regular price" value={variant?.price ?? ""} onChange={(e) => setVariantField(service, index, "price", e.target.value)}/>
                      <Input type="number" min="1" placeholder="Member price" value={variant?.memberPrice ?? ""} onChange={(e) => setVariantField(service, index, "memberPrice", e.target.value)}/>
                      <Input type="number" min="10" placeholder="Duration" value={variant?.duration ?? ""} onChange={(e) => setVariantField(service, index, "duration", e.target.value)}/>
                      <Button type="button" variant="ghost" onClick={() => removeVariant(service, index)}>
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    </div>))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="flex-1 sm:flex-none" disabled={appointmentsMutating} onClick={() => void saveService(service)}>
                    Save service
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 sm:flex-none" disabled={appointmentsMutating} onClick={() => void saveService({ ...service, isActive: !service.isActive })}>
                    {service.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <ServiceDetailsEditor service={service} aiAvailable={aiAvailable} />
                </div>
                </div>))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>);
}
