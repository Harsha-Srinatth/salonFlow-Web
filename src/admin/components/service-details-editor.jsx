"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/api-json";
import { MAX_GALLERY_IMAGES, SERVICE_DETAIL_LIMITS, SERVICE_DETAIL_SECTIONS } from "@/lib/service-details";
import { serviceImageUrl } from "@/lib/service-image";
import { updateAdminServiceAsync, uploadAdminServiceImageAsync } from "@/store/admin-portal-slice";
import { FileText, ImagePlus, Loader2, Sparkles, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

const MAX_PHOTOS = 1 + MAX_GALLERY_IMAGES;
const MAX_FILE_BYTES = 6 * 1024 * 1024;

function readAsDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(`${reader.result ?? ""}`);
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Edits what customers see in the service details view: the photo set (first = cover) and the
 * long-form sections. "Draft with AI" proposes text; nothing is stored until Save.
 */
export function ServiceDetailsEditor({ service, aiAvailable }) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [details, setDetails] = useState({});
  const [uploading, setUploading] = useState(0);
  const [drafting, setDrafting] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  function reset() {
    const list = [service.image, ...(Array.isArray(service.gallery) ? service.gallery : [])].filter(
      (url, i, all) => url && all.indexOf(url) === i
    );
    setPhotos(list);
    setDetails({ ...(service.details ?? {}) });
    setOverwrite(false);
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`At most ${MAX_PHOTOS} photos per service`);
      return;
    }
    const accepted = files.slice(0, room);
    if (files.length > room) toast.message(`Only ${room} more photo${room === 1 ? "" : "s"} can be added`);
    for (const file of accepted) {
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
        else if (result.payload?.imageUrl) setPhotos((current) => (current.includes(result.payload.imageUrl) ? current : [...current, result.payload.imageUrl]));
      } catch {
        toast.error(`Could not read ${file.name}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function draft() {
    if (drafting) return;
    setDrafting(true);
    try {
      const data = await apiJson(`/api/admin/agents/service-content/${service.id}`, { method: "POST", auth: true, body: {}, timeoutMs: 90_000 });
      let filled = 0;
      setDetails((current) => {
        const next = { ...current };
        for (const { key } of SERVICE_DETAIL_SECTIONS) {
          const proposal = data.draft?.[key];
          if (!proposal) continue;
          if (overwrite || !`${current[key] ?? ""}`.trim()) {
            next[key] = proposal;
            filled += 1;
          }
        }
        return next;
      });
      toast.success(filled ? "Draft added. Review and edit it before saving." : "Nothing changed: all sections already have text.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDrafting(false);
    }
  }

  async function save() {
    setSaving(true);
    const [cover = "", ...gallery] = photos;
    const result = await dispatch(
      updateAdminServiceAsync({
        id: service.id,
        payload: {
          name: service.name,
          category: service.category,
          gender: service.gender,
          basePrice: Number(service.basePrice ?? 0),
          duration: Number(service.duration ?? 45),
          description: service.description ?? "",
          image: cover,
          gallery,
          details,
          variants: Array.isArray(service.variants) ? service.variants : [],
          isActive: Boolean(service.isActive),
        },
      })
    );
    setSaving(false);
    if (updateAdminServiceAsync.rejected.match(result)) {
      toast.error(result.payload ?? "Could not save details");
      return;
    }
    toast.success("Service details saved");
    setOpen(false);
  }

  const filledCount = SERVICE_DETAIL_SECTIONS.filter(({ key }) => `${service.details?.[key] ?? ""}`.trim()).length;
  const photoCount = Array.isArray(service.images) ? service.images.length : service.image ? 1 : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="flex-1 sm:flex-none">
          <FileText className="size-4" />
          Details &amp; photos
          <span className="text-xs text-muted-foreground">
            {filledCount}/{SERVICE_DETAIL_SECTIONS.length} · {photoCount} photo{photoCount === 1 ? "" : "s"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{service.name}: customer details</DialogTitle>
          <DialogDescription>What customers see when they open this service. Empty sections are hidden.</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>
              Photos ({photos.length}/{MAX_PHOTOS})
            </Label>
            <Button type="button" size="sm" variant="outline" disabled={photos.length >= MAX_PHOTOS || uploading > 0} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {uploading ? "Uploading…" : "Add photos"}
            </Button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} />
          </div>
          {photos.length ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((url, index) => (
                <li key={url} className="group relative aspect-square overflow-hidden rounded-lg border">
                  <img src={serviceImageUrl(url, 240)} alt="" className="size-full object-cover" />
                  {index === 0 ? (
                    <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Cover</span>
                  ) : null}
                  <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1">
                    {index > 0 ? (
                      <button
                        type="button"
                        aria-label="Make cover photo"
                        onClick={() => setPhotos((current) => [url, ...current.filter((item) => item !== url)])}
                        className="grid size-7 place-items-center rounded-full bg-card/90 shadow"
                      >
                        <Star className="size-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => setPhotos((current) => current.filter((item) => item !== url))}
                      className="grid size-7 place-items-center rounded-full bg-card/90 text-destructive shadow"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No photos yet. The first photo is the cover.</p>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Description sections</Label>
            <div className="flex items-center gap-3">
              {aiAvailable ? (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                  Replace existing text
                </label>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!aiAvailable || drafting}
                title={aiAvailable ? "Suggest text for empty sections" : "Configure ANTHROPIC_API_KEY on the server to enable drafting"}
                onClick={() => void draft()}
              >
                {drafting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {drafting ? "Drafting…" : "Draft with AI"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Write in short sentences; start a line with "- " for a bullet. AI drafts are general guidance: check precautions carefully before saving.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {SERVICE_DETAIL_SECTIONS.map(({ key, label, hint }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`sd-${service.id}-${key}`}>{label}</Label>
                <textarea
                  id={`sd-${service.id}-${key}`}
                  rows={3}
                  maxLength={SERVICE_DETAIL_LIMITS[key]}
                  placeholder={hint}
                  value={details[key] ?? ""}
                  onChange={(e) => setDetails((current) => ({ ...current, [key]: e.target.value }))}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
            ))}
          </div>
        </section>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving || uploading > 0}>
            {saving ? "Saving…" : "Save details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
