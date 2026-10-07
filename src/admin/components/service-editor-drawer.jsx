"use client";
import { AnimatePresence, motion, Reorder, useReducedMotion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Clock, GripVertical, ImagePlus, IndianRupee, Layers, Plus, Scissors, Sparkles, Star, Tag, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "@/lib/notify";
import { AnimatedStepper, BrandLoader, ButtonLoadingMorph, FloatingLabelInput, IconButton, useAsyncAction } from "@/components/kit";
import { haptic, spring } from "@/components/motion";
import { SlideOver } from "@/admin/components/slide-over";
import { Switch } from "@/admin/components/switch";
import { formatMoney } from "@/lib/format";
import { iconForAudience } from "@/lib/service-icons";
import { apiJson } from "@/lib/api-json";
import { cn } from "@/lib/utils";
import { MAX_GALLERY_IMAGES, SERVICE_DETAIL_LIMITS, SERVICE_DETAIL_SECTIONS } from "@/lib/service-details";
import { serviceImageUrl } from "@/lib/service-image";
import { createAdminServiceAsync, updateAdminServiceAsync, uploadAdminServiceImageAsync } from "@/store/admin-portal-slice";

const STEPS = [
  { id: "basics", label: "Basics", icon: Scissors, hint: "Name, category, audience" },
  { id: "pricing", label: "Pricing", icon: Tag, hint: "Price, time, variants" },
  { id: "media", label: "Photos", icon: ImagePlus, hint: "Photos and details" },
];
// Audience is the service's `gender` field (the API's men / women / kids split: BOY and GIRL are kids).
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
const chip = (on) =>
  `tap inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-caption font-semibold ring-1 ring-inset transition-colors ${on ? "bg-portal text-portal-foreground ring-portal" : "bg-card ring-border hover:bg-muted"}`;

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

function Section({ title, hint, action, children }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {hint ? <p className="text-caption text-ink-neutral">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
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
  const saveAction = useAsyncAction({ successMs: 700 });
  const draftAction = useAsyncAction();
  const saving = saveAction.state === "loading";
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const reduce = useReducedMotion();
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
    if (!service) return;
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
      toast.error(error.message ?? "Could not draft");
      throw error;
    }
  }

  async function save() {
    if (!validate()) throw new Error("invalid");
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
    if (result.error || result.meta?.requestStatus === "rejected") {
      toast.error(result.payload ?? "Could not save service");
      throw new Error("save failed");
    }
    toast.success(isEdit ? "Service updated" : "Service created");
    setTimeout(() => onOpenChange(false), 650);
  }

  const memberSaves = form.memberPrice !== "" && Number(form.memberPrice) > 0 && Number(form.basePrice) > Number(form.memberPrice) ? Number(form.basePrice) - Number(form.memberPrice) : 0;
  const last = step === STEPS.length - 1;

  const footer = (
    <div className="flex w-full items-center gap-2">
      <IconButton icon={ChevronLeft} label="Previous step" variant="ghost" disabled={step === 0 || saving} onClick={() => goto(step - 1)} />
      <div className="ml-auto flex items-center gap-2">
        {!last ? (
          <ButtonLoadingMorph variant="outline" onClick={() => goto(step + 1)}>
            Next <ChevronRight className="size-4" aria-hidden />
          </ButtonLoadingMorph>
        ) : null}
        <ButtonLoadingMorph icon={Check} state={saveAction.state} disabled={uploading > 0} loadingLabel="Saving…" successLabel="Saved" errorLabel="Check fields" onClick={() => saveAction.run(save)}>
          {isEdit ? "Save" : "Create"}
        </ButtonLoadingMorph>
      </div>
    </div>
  );
  const AudienceIcon = (value) => iconForAudience(value);

  return (
    <SlideOver open={open} onOpenChange={onOpenChange} title={isEdit ? service.name : "New service"} description={STEPS[step].hint} icon={isEdit ? Scissors : Plus} footer={footer} size="lg">
      <AnimatedStepper steps={STEPS} current={step} onStepClick={goto} className="mb-5" />

      <div className="relative overflow-x-hidden">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            variants={{ enter: (d) => ({ opacity: 0, x: reduce ? 0 : 28 * d }), center: { opacity: 1, x: 0 }, exit: (d) => ({ opacity: 0, x: reduce ? 0 : -28 * d }) }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring.soft}
            className="space-y-5 pb-1"
          >
            {step === 0 ? (
              <>
                <FloatingLabelInput label="Service name" icon={Scissors} autoFocus value={form.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />
                <div className="space-y-2">
                  <FloatingLabelInput label="Category" icon={Layers} value={form.category} onChange={(e) => set("category", e.target.value)} hint="Pick one or type a new one" />
                  {categories.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((c) => (
                        <button key={c} type="button" onClick={() => set("category", c)} className={chip(form.category.trim().toUpperCase() === c)}>
                          {c.charAt(0) + c.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Section title="Who is it for?">
                  <div role="radiogroup" aria-label="Who is it for" className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                    {AUDIENCES.map(([value, label]) => {
                      const on = form.gender === value;
                      const Icon = AudienceIcon(value);
                      return (
                        <button key={value} type="button" role="radio" aria-checked={on} onClick={() => { haptic("tap"); set("gender", value); }} className={`relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-caption font-semibold ring-1 ring-inset transition-colors ${on ? "text-portal-foreground ring-portal" : "bg-card ring-border hover:bg-muted"}`}>
                          {on ? <motion.span layoutId="svc-audience" className="absolute inset-0 rounded-2xl bg-portal" transition={reduce ? { duration: 0 } : spring.snappy} /> : null}
                          <Icon className="relative size-4" aria-hidden />
                          <span className="relative">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </Section>
                <FloatingLabelInput as="textarea" label="Short description" value={form.description} onChange={(e) => set("description", e.target.value)} hint="One or two lines on the card" />
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3">
                  <span className="text-sm font-semibold">Visible to customers</span>
                  <Switch checked={form.isActive} onChange={(v) => set("isActive", v)} label="Visible to customers" />
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FloatingLabelInput label="Price (₹)" icon={IndianRupee} type="number" inputMode="numeric" min="1" value={form.basePrice} error={errors.basePrice} onChange={(e) => set("basePrice", e.target.value)} />
                  <FloatingLabelInput label="Member price (₹)" icon={Star} type="number" inputMode="numeric" min="1" value={form.memberPrice} error={errors.memberPrice} hint="Optional" success={memberSaves > 0} onChange={(e) => set("memberPrice", e.target.value)} />
                </div>
                <AnimatePresence initial={false}>
                  {memberSaves ? (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-gold/16 px-3 text-caption font-semibold text-ink-warning ring-1 ring-inset ring-gold/35">
                      <Star className="size-3.5" aria-hidden /> Members save {formatMoney(memberSaves)}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
                <Section title="Duration" hint={errors.duration}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {DURATIONS.map((d) => (
                      <button key={d} type="button" onClick={() => set("duration", `${d}`)} className={chip(Number(form.duration) === d)}>
                        {d >= 60 && d % 60 === 0 ? `${d / 60} hr` : `${d} min`}
                      </button>
                    ))}
                    <label className="inline-flex h-9 items-center gap-1.5 rounded-full bg-muted px-3 text-caption font-semibold">
                      <Clock className="size-3.5 text-ink-neutral" aria-hidden />
                      <input aria-label="Custom duration in minutes" type="number" min="10" value={form.duration} onChange={(e) => set("duration", e.target.value)} className="w-12 bg-transparent text-center tabular-nums outline-none" />
                      min
                    </label>
                  </div>
                </Section>

                <Section
                  title={`Variants · ${form.variants.length}`}
                  hint="Own price per length or size. Drag to reorder."
                  action={
                    <ButtonLoadingMorph size="sm" variant="outline" icon={Plus} onClick={() => set("variants", [...form.variants, { _id: uid(), name: "", price: "", memberPrice: "", duration: form.duration }])}>
                      Add
                    </ButtonLoadingMorph>
                  }
                >
                  <Reorder.Group axis="y" values={form.variants} onReorder={(v) => set("variants", v)} className="space-y-2" data-vaul-no-drag>
                    <AnimatePresence initial={false}>
                      {form.variants.map((variant, index) => (
                        <Reorder.Item key={variant._id} value={variant} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} whileDrag={{ scale: 1.02 }} className="rounded-2xl bg-muted/50 p-2 ring-1 ring-inset ring-border/60">
                          <div className="flex items-start gap-1">
                            <GripVertical className="mt-4 size-4 shrink-0 cursor-grab text-ink-neutral" aria-hidden />
                            <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
                              <FloatingLabelInput className="col-span-3" label="Variant name" value={variant.name} onChange={(e) => set("variants", form.variants.map((v, i) => (i === index ? { ...v, name: e.target.value } : v)))} />
                              {[
                                ["price", "Price"],
                                ["memberPrice", "Member"],
                                ["duration", "Min"],
                              ].map(([key, label]) => (
                                <FloatingLabelInput key={key} label={label} type="number" min="1" value={variant[key]} onChange={(e) => set("variants", form.variants.map((v, i) => (i === index ? { ...v, [key]: e.target.value } : v)))} />
                              ))}
                            </div>
                            <IconButton icon={Trash2} label="Remove variant" variant="ghost" className="text-ink-destructive" onClick={() => set("variants", form.variants.filter((_, i) => i !== index))} />
                          </div>
                        </Reorder.Item>
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>
                  {!form.variants.length ? <p className="rounded-2xl border border-dashed border-border py-3 text-center text-caption text-ink-neutral">Uses the price above</p> : null}
                </Section>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Section title={`Photos · ${form.photos.length}/${MAX_PHOTOS}`} hint="First is the cover. Drag to reorder.">
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
                      animate={{ scale: dragOver && !reduce ? 1.02 : 1 }}
                      transition={spring.snappy}
                      disabled={form.photos.length >= MAX_PHOTOS || uploading > 0}
                      onClick={() => fileRef.current?.click()}
                      className={`flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-5 text-sm transition-colors disabled:opacity-60 ${dragOver ? "border-portal bg-portal/8" : "border-border bg-muted/40"}`}
                    >
                      {uploading ? <BrandLoader variant="dots" size="sm" hideLabel /> : <UploadCloud className="size-6 text-portal" aria-hidden />}
                      <span className="font-semibold">{uploading ? `Uploading ${uploading}…` : form.photos.length >= MAX_PHOTOS ? "Photo limit reached" : "Drop or tap to add photos"}</span>
                      <span className="text-caption text-ink-neutral">JPG, PNG, WebP, GIF · 6 MB</span>
                    </motion.button>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} />
                  </div>
                  {form.photos.length ? (
                    <Reorder.Group axis="x" values={form.photos} onReorder={(p) => set("photos", p)} className="admin-scrollbar flex gap-2 overflow-x-auto pb-1" data-vaul-no-drag>
                      {form.photos.map((url, index) => (
                        <Reorder.Item key={url} value={url} whileDrag={{ scale: 1.06, zIndex: 5 }} className="group relative size-24 shrink-0 cursor-grab overflow-hidden rounded-2xl bg-muted ring-1 ring-inset ring-border/60 active:cursor-grabbing">
                          <img src={serviceImageUrl(url, 240)} alt={`Photo ${index + 1}`} draggable={false} loading="lazy" className="pointer-events-none size-full object-cover" />
                          {index === 0 ? <span className="absolute top-1 left-1 rounded-full bg-portal px-2 py-0.5 text-[10px] font-bold text-portal-foreground">Cover</span> : null}
                          <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1">
                            {index > 0 ? (
                              <button type="button" aria-label={`Make photo ${index + 1} the cover`} onClick={() => set("photos", [url, ...form.photos.filter((u) => u !== url)])} className="tap grid size-7 place-items-center rounded-full bg-card/90 shadow-soft">
                                <Star className="size-3.5" aria-hidden />
                              </button>
                            ) : null}
                            <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => set("photos", form.photos.filter((u) => u !== url))} className="tap grid size-7 place-items-center rounded-full bg-card/90 text-ink-destructive shadow-soft">
                              <Trash2 className="size-3.5" aria-hidden />
                            </button>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  ) : (
                    <p className="flex items-center justify-center gap-1.5 text-caption text-ink-neutral">
                      <ImagePlus className="size-3.5" aria-hidden /> No photos yet
                    </p>
                  )}
                </Section>

                <Section
                  title="Details"
                  hint={isEdit ? "Empty sections stay hidden. “- ” makes a bullet." : "AI drafting unlocks after creating."}
                  action={
                    isEdit ? (
                      <ButtonLoadingMorph size="sm" variant="secondary" icon={Sparkles} state={draftAction.state} disabled={!aiAvailable} loadingLabel="Drafting…" successLabel="Drafted" title={aiAvailable ? "Suggest text for empty sections" : "AI is not configured on the server"} onClick={() => draftAction.run(draftWithAi)}>
                        Draft
                      </ButtonLoadingMorph>
                    ) : null
                  }
                >
                  {isEdit && aiAvailable ? (
                    <label className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3 text-sm font-semibold">
                      Replace existing text
                      <Switch checked={overwrite} onChange={setOverwrite} label="Replace existing text when drafting" />
                    </label>
                  ) : null}
                  <AnimatePresence>
                    {draftAction.state === "loading" ? (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" className="flex items-center gap-2 rounded-2xl bg-portal/8 p-3 text-caption font-semibold text-portal">
                        <BrandLoader variant="dots" size="xs" hideLabel /> Writing a draft from the service…
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                  <div className="grid gap-3">
                    {SERVICE_DETAIL_SECTIONS.map(({ key, label, icon: Icon }) => (
                      <FloatingLabelInput key={key} as="textarea" icon={Icon} label={label} maxLength={SERVICE_DETAIL_LIMITS[key]} value={form.details[key] ?? ""} onChange={(e) => setForm((f) => ({ ...f, details: { ...f.details, [key]: e.target.value } }))} inputClassName="min-h-20" />
                    ))}
                  </div>
                  {isEdit ? <p className="text-caption text-ink-neutral">Check AI drafts, precautions especially.</p> : null}
                </Section>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </SlideOver>
  );
}
