"use client";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { BorderBeam } from "border-beam";
import { Check, ChevronLeft, ChevronRight, GripVertical, ImagePlus, Loader2, Plus, Sparkles, Star, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PixelImage } from "@/components/fx/pixel-image";
import { SlideOver } from "@/admin/components/slide-over";
import { apiJson } from "@/lib/api-json";
import { cn } from "@/lib/utils";
import { MAX_GALLERY_IMAGES, SERVICE_DETAIL_LIMITS, SERVICE_DETAIL_SECTIONS } from "@/lib/service-details";
import { serviceImageUrl } from "@/lib/service-image";
import { createAdminServiceAsync, updateAdminServiceAsync, uploadAdminServiceImageAsync } from "@/store/admin-portal-slice";

const STEPS = [
  { id: "basics", label: "Basics", hint: "Name, category and who it is for" },
  { id: "pricing", label: "Pricing", hint: "Price, duration and variants" },
  { id: "media", label: "Photos & details", hint: "What customers see" },
];
const AUDIENCES = [
  ["UNISEX", "Unisex"],
  ["WOMEN", "Women"],
  ["MEN", "Men"],
  ["GIRL", "Girl"],
  ["BOY", "Boy"],
];
const DURATIONS = [15, 30, 45, 60, 90, 120];
const MAX_PHOTOS = 1 + MAX_GALLERY_IMAGES;
const MAX_FILE_BYTES = 6 * 1024 * 1024;
const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const textareaClass =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function readAsDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(`${reader.result ?? ""}`);
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function emptyForm() {
  return { name: "", category: "", gender: "UNISEX", basePrice: "", memberPrice: "", duration: "30", description: "", isActive: true, variants: [], photos: [], details: {} };
}

function formFromService(service) {
  const photos = [service.image, ...(Array.isArray(service.gallery) ? service.gallery : [])].filter((u, i, all) => u && all.indexOf(u) === i);
  return {
    name: service.name ?? "",
    category: service.category ?? "",
    gender: service.gender ?? "UNISEX",
    basePrice: `${service.basePrice ?? ""}`,
    memberPrice: service.memberPrice == null ? "" : `${service.memberPrice}`,
    duration: `${service.duration ?? 30}`,
    description: service.description ?? "",
    isActive: service.isActive !== false,
    variants: (Array.isArray(service.variants) ? service.variants : []).map((v) => ({
      _id: uid(),
      name: v?.name ?? "",
      price: `${v?.price ?? ""}`,
      memberPrice: `${v?.memberPrice ?? ""}`,
      duration: `${v?.duration ?? ""}`,
    })),
    photos,
    details: { ...(service.details ?? {}) },
  };
}

/** Animated on/off switch. */
export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors", checked ? "justify-end bg-primary" : "justify-start bg-muted-foreground/30")}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 700, damping: 32 }} className="size-5 rounded-full bg-white shadow" />
    </button>
  );
}

function Field({ label, htmlFor, hint, error, children, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
      </Label>
      {children}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p key="e" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs font-medium text-destructive">
            {error}
          </motion.p>
        ) : hint ? (
          <p key="h" className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Create or edit a service in three guided steps. `service` = null creates a new one. */
export function ServiceEditorDrawer({ open, onOpenChange, service, categories = [], aiAvailable }) {
  const dispatch = useDispatch();
  const isEdit = Boolean(service);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(service ? formFromService(service) : emptyForm());
    setErrors({});
    setStep(0);
    setOverwrite(false);
    // Re-seed only when the drawer opens for a (different) service, not on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service?.id]);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  function goto(next) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Give the service a name";
    if (!(Number(form.basePrice) > 0)) next.basePrice = "Enter a price above 0";
    if (form.memberPrice !== "" && Number(form.memberPrice) <= 0) next.memberPrice = "Member price must be above 0";
    if (!(Number(form.duration) >= 10)) next.duration = "At least 10 minutes";
    setErrors(next);
    if (next.name) goto(0);
    else if (next.basePrice || next.memberPrice || next.duration) goto(1);
    return !Object.keys(next).length;
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    const room = MAX_PHOTOS - form.photos.length;
    if (room <= 0) {
      toast.error(`At most ${MAX_PHOTOS} photos per service`);
      return;
    }
    if (files.length > room) toast.message(`Only ${room} more photo${room === 1 ? "" : "s"} can be added`);
    for (const file of files.slice(0, room)) {
      if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
        toast.error(`${file.name}: use a JPG, PNG, WebP or GIF image`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is larger than 6 MB`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const result = await dispatch(uploadAdminServiceImageAsync({ imageDataUri: await readAsDataUri(file) }));
        if (uploadAdminServiceImageAsync.rejected.match(result)) toast.error(result.payload ?? `Could not upload ${file.name}`);
        else if (result.payload?.imageUrl) setForm((f) => (f.photos.includes(result.payload.imageUrl) ? f : { ...f, photos: [...f.photos, result.payload.imageUrl] }));
      } catch {
        toast.error(`Could not read ${file.name}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function draftWithAi() {
    if (!service || drafting) return;
    setDrafting(true);
    try {
      const data = await apiJson(`/api/admin/agents/service-content/${service.id}`, { method: "POST", auth: true, body: {}, timeoutMs: 90_000 });
      let filled = 0;
      setForm((f) => {
        const details = { ...f.details };
        for (const { key } of SERVICE_DETAIL_SECTIONS) {
          const proposal = data.draft?.[key];
          if (proposal && (overwrite || !`${f.details[key] ?? ""}`.trim())) {
            details[key] = proposal;
            filled += 1;
          }
        }
        return { ...f, details };
      });
      toast.success(filled ? "Draft added. Review and edit it before saving." : "Nothing changed: all sections already have text.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDrafting(false);
    }
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    const [cover = "", ...gallery] = form.photos;
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      gender: form.gender,
      basePrice: Number(form.basePrice),
      memberPrice: form.memberPrice === "" ? null : Number(form.memberPrice),
      duration: Number(form.duration || 30),
      description: form.description,
      image: cover,
      gallery,
      details: form.details,
      variants: form.variants.filter((v) => `${v.name}`.trim()).map(({ _id, ...v }) => v),
      isActive: form.isActive,
    };
    const result = await dispatch(isEdit ? updateAdminServiceAsync({ id: service.id, payload }) : createAdminServiceAsync(payload));
    setSaving(false);
    if (result.error || result.meta?.requestStatus === "rejected") {
      toast.error(result.payload ?? "Could not save service");
      return;
    }
    toast.success(isEdit ? "Service updated" : "Service created");
    onOpenChange(false);
  }

  const memberSaves = form.memberPrice !== "" && Number(form.memberPrice) > 0 && Number(form.basePrice) > Number(form.memberPrice) ? Number(form.basePrice) - Number(form.memberPrice) : 0;
  const last = step === STEPS.length - 1;

  const footer = (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" disabled={step === 0 || saving} onClick={() => goto(step - 1)}>
        <ChevronLeft className="size-4" /> Back
      </Button>
      <div className="ml-auto flex items-center gap-2">
        {!last ? (
          <Button type="button" variant="outline" onClick={() => goto(step + 1)}>
            Next <ChevronRight className="size-4" />
          </Button>
        ) : null}
        <BorderBeam size="sm" active={!saving}>
          <Button type="button" onClick={() => void save()} disabled={saving || uploading > 0}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create service"}
          </Button>
        </BorderBeam>
      </div>
    </div>
  );

  return (
    <SlideOver open={open} onOpenChange={onOpenChange} title={isEdit ? `Edit ${service.name}` : "Add a service"} description={STEPS[step].hint} footer={footer}>
      <nav className="relative grid grid-cols-3 border-b px-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goto(i)}
            aria-current={i === step ? "step" : undefined}
            className={cn("relative flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors", i === step ? "text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <span className={cn("grid size-5 place-items-center rounded-full text-[11px] font-bold", i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/15 text-primary" : "bg-muted")}>
              {i < step ? <Check className="size-3" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
            <span className="sm:hidden">{s.label.split(" ")[0]}</span>
            {i === step ? <motion.span layoutId="svc-step-underline" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" /> : null}
          </button>
        ))}
      </nav>

      <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            variants={{ enter: (d) => ({ opacity: 0, x: 28 * d }), center: { opacity: 1, x: 0 }, exit: (d) => ({ opacity: 0, x: -28 * d }) }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-5"
          >
            {step === 0 ? (
              <>
                <Field label="Service name" htmlFor="sv-name" error={errors.name}>
                  <Input id="sv-name" autoFocus placeholder="e.g. Hydra facial" value={form.name} aria-invalid={Boolean(errors.name)} onChange={(e) => set("name", e.target.value)} />
                </Field>
                <Field label="Category" htmlFor="sv-cat" hint="Pick one or type a new category">
                  <Input id="sv-cat" placeholder="e.g. Hair, Skin, Nails" value={form.category} onChange={(e) => set("category", e.target.value)} />
                  {categories.length ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {categories.map((c) => (
                        <motion.button
                          key={c}
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          onClick={() => set("category", c)}
                          className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", form.category.trim().toUpperCase() === c ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}
                        >
                          {c}
                        </motion.button>
                      ))}
                    </div>
                  ) : null}
                </Field>
                <Field label="Who is it for?">
                  <div className="relative grid grid-cols-5 gap-1 rounded-xl bg-muted p-1" role="radiogroup">
                    {AUDIENCES.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={form.gender === value}
                        onClick={() => set("gender", value)}
                        className={cn("relative rounded-lg py-1.5 text-xs font-medium transition-colors", form.gender === value ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                      >
                        {form.gender === value ? <motion.span layoutId="svc-audience" className="absolute inset-0 rounded-lg bg-primary" transition={{ type: "spring", stiffness: 500, damping: 34 }} /> : null}
                        <span className="relative">{label}</span>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Short description" htmlFor="sv-desc" hint="One or two lines shown on the service card">
                  <textarea id="sv-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={textareaClass} />
                </Field>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="text-sm font-medium">Visible to customers</p>
                    <p className="text-xs text-muted-foreground">Turn off to hide it from booking without deleting it</p>
                  </div>
                  <Switch checked={form.isActive} onChange={(v) => set("isActive", v)} label="Visible to customers" />
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Price (Rs)" htmlFor="sv-price" error={errors.basePrice}>
                    <Input id="sv-price" type="number" inputMode="numeric" min="1" value={form.basePrice} aria-invalid={Boolean(errors.basePrice)} onChange={(e) => set("basePrice", e.target.value)} />
                  </Field>
                  <Field label="Member price (Rs)" htmlFor="sv-mprice" error={errors.memberPrice} hint="Optional. Leave empty if members pay the same">
                    <Input id="sv-mprice" type="number" inputMode="numeric" min="1" value={form.memberPrice} aria-invalid={Boolean(errors.memberPrice)} onChange={(e) => set("memberPrice", e.target.value)} />
                  </Field>
                </div>
                <AnimatePresence initial={false}>
                  {memberSaves ? (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-lg bg-accent/15 px-3 py-2 text-xs font-medium">
                      Members save Rs {memberSaves}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
                <Field label="Duration" error={errors.duration}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {DURATIONS.map((d) => (
                      <motion.button
                        key={d}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => set("duration", `${d}`)}
                        className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", Number(form.duration) === d ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                      >
                        {d >= 60 && d % 60 === 0 ? `${d / 60} hr` : `${d} min`}
                      </motion.button>
                    ))}
                    <Input aria-label="Custom duration in minutes" type="number" min="10" className="h-8 w-24" value={form.duration} onChange={(e) => set("duration", e.target.value)} />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </Field>

                <section className="space-y-2 rounded-xl border border-dashed p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Variants</p>
                      <p className="text-xs text-muted-foreground">Different lengths or sizes with their own price. Drag to reorder.</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => set("variants", [...form.variants, { _id: uid(), name: "", price: "", memberPrice: "", duration: form.duration }])}>
                      <Plus className="size-3.5" /> Add
                    </Button>
                  </div>
                  <Reorder.Group axis="y" values={form.variants} onReorder={(v) => set("variants", v)} className="space-y-2">
                    <AnimatePresence initial={false}>
                      {form.variants.map((variant, index) => (
                        <Reorder.Item
                          key={variant._id}
                          value={variant}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          whileDrag={{ scale: 1.02, boxShadow: "0 10px 30px -10px rgb(0 0 0 / .25)" }}
                          className="relative rounded-lg border bg-card"
                        >
                          <div className="flex items-start gap-2 p-2">
                            <GripVertical className="mt-2 size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                              <Input
                                className="col-span-2 sm:col-span-4"
                                aria-label="Variant name"
                                placeholder="Variant name (e.g. Long hair)"
                                value={variant.name}
                                onChange={(e) => set("variants", form.variants.map((v, i) => (i === index ? { ...v, name: e.target.value } : v)))}
                              />
                              {[
                                ["price", "Price"],
                                ["memberPrice", "Member"],
                                ["duration", "Minutes"],
                              ].map(([key, label]) => (
                                <Input
                                  key={key}
                                  type="number"
                                  min="1"
                                  aria-label={`Variant ${label.toLowerCase()}`}
                                  placeholder={label}
                                  value={variant[key]}
                                  onChange={(e) => set("variants", form.variants.map((v, i) => (i === index ? { ...v, [key]: e.target.value } : v)))}
                                />
                              ))}
                              <Button type="button" variant="ghost" size="icon" aria-label="Remove variant" onClick={() => set("variants", form.variants.filter((_, i) => i !== index))}>
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </Reorder.Item>
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>
                  {!form.variants.length ? <p className="py-2 text-center text-xs text-muted-foreground">No variants. The service uses the price above.</p> : null}
                </section>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      Photos ({form.photos.length}/{MAX_PHOTOS})
                    </Label>
                    <span className="text-xs text-muted-foreground">First photo is the cover. Drag to reorder.</span>
                  </div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      void addFiles(e.dataTransfer.files);
                    }}
                  >
                    <motion.button
                      type="button"
                      animate={{ scale: dragOver ? 1.02 : 1 }}
                      whileTap={{ scale: 0.99 }}
                      disabled={form.photos.length >= MAX_PHOTOS || uploading > 0}
                      onClick={() => fileRef.current?.click()}
                      className={cn("flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed bg-muted/30 px-4 py-5 text-sm text-muted-foreground transition-colors disabled:opacity-60", dragOver && "border-primary bg-primary/5")}
                    >
                      {uploading ? <Loader2 className="size-6 animate-spin text-primary" /> : <UploadCloud className="size-6 text-primary" />}
                      <span className="font-medium text-foreground">{uploading ? "Uploading…" : "Drop photos here or click to browse"}</span>
                      <span className="text-xs">JPG, PNG, WebP or GIF up to 6 MB</span>
                    </motion.button>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} />
                  </div>
                  {form.photos.length ? (
                    <Reorder.Group axis="x" values={form.photos} onReorder={(p) => set("photos", p)} className="admin-scrollbar flex gap-2 overflow-x-auto pb-1">
                      {form.photos.map((url, index) => (
                        <Reorder.Item key={url} value={url} whileDrag={{ scale: 1.08, zIndex: 5 }} className="group relative size-24 shrink-0 cursor-grab overflow-hidden rounded-xl border active:cursor-grabbing">
                          <PixelImage src={serviceImageUrl(url, 240)} className="size-full" imgClassName="pointer-events-none" draggable={false} />
                          {index === 0 ? <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Cover</span> : null}
                          <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                            {index > 0 ? (
                              <button type="button" aria-label="Make cover photo" onClick={() => set("photos", [url, ...form.photos.filter((u) => u !== url)])} className="grid size-6 place-items-center rounded-full bg-card/90 shadow">
                                <Star className="size-3" />
                              </button>
                            ) : null}
                            <button type="button" aria-label="Remove photo" onClick={() => set("photos", form.photos.filter((u) => u !== url))} className="grid size-6 place-items-center rounded-full bg-card/90 text-destructive shadow">
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  ) : (
                    <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <ImagePlus className="size-3.5" /> No photos yet
                    </p>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Description sections</Label>
                    {isEdit ? (
                      <div className="flex items-center gap-3">
                        {aiAvailable ? (
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} /> Replace existing text
                          </label>
                        ) : null}
                        <Button type="button" size="sm" variant="secondary" disabled={!aiAvailable || drafting} title={aiAvailable ? "Suggest text for empty sections" : "Configure ANTHROPIC_API_KEY on the server to enable drafting"} onClick={() => void draftWithAi()}>
                          {drafting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                          {drafting ? "Drafting…" : "Draft with AI"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Empty sections are hidden from customers. Start a line with "- " for a bullet.
                    {isEdit ? " Check AI drafts carefully (precautions especially)." : " AI drafting is available once the service is created."}
                  </p>
                  <div className="grid gap-3">
                    {SERVICE_DETAIL_SECTIONS.map(({ key, label, hint, icon: Icon }) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={`sd-${key}`} className="flex items-center gap-1.5 text-sm">
                          <Icon className="size-3.5 text-primary" /> {label}
                        </Label>
                        <textarea
                          id={`sd-${key}`}
                          rows={2}
                          maxLength={SERVICE_DETAIL_LIMITS[key]}
                          placeholder={hint}
                          value={form.details[key] ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, details: { ...f.details, [key]: e.target.value } }))}
                          className={textareaClass}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </SlideOver>
  );
}
