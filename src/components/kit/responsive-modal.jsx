import { useMediaQuery } from "@/lib/use-media-query";
import { MorphDialog } from "./morph-dialog";
import { SpringBottomSheet } from "./spring-bottom-sheet";
import { SlideToConfirm } from "./slide-to-confirm";
import { ButtonLoadingMorph, useAsyncAction } from "./button-loading-morph";

/**
 * SpringBottomSheet below 768px, MorphDialog above. Same props as MorphDialog.
 */
export function ResponsiveModal({ open, onOpenChange, title, description, icon, tone, footer, size, layoutId, children, className }) {
  const desktop = useMediaQuery("(min-width: 768px)");
  if (desktop) {
    return (
      <MorphDialog open={open} onOpenChange={onOpenChange} title={title} description={description} icon={icon} tone={tone} footer={footer} size={size} layoutId={layoutId} className={className}>
        {children}
      </MorphDialog>
    );
  }
  return (
    <SpringBottomSheet open={open} onOpenChange={onOpenChange} title={title} description={description} icon={icon} footer={footer} className={className}>
      {children}
    </SpringBottomSheet>
  );
}

/**
 * THE confirmation pattern (contract item c).
 * - kind="default": a ButtonLoadingMorph confirm button.
 * - kind="destructive" | "payment": SlideToConfirm (mode="hold" available via `confirmMode`).
 * onConfirm may return a promise; the sheet closes after success.
 * @param {{ open: boolean, onOpenChange: (o:boolean)=>void, title: string, description?: string, icon?: any,
 *   kind?: "default"|"destructive"|"payment", confirmLabel?: string, cancelLabel?: string, confirmMode?: "slide"|"hold",
 *   onConfirm: ()=>any, children?: React.ReactNode }} props
 */
export function ConfirmSheet({ open, onOpenChange, title, description, icon, kind = "default", confirmLabel, cancelLabel = "Cancel", confirmMode = "slide", onConfirm, children }) {
  const { state, run } = useAsyncAction({ successMs: 700 });
  const tone = kind === "destructive" ? "destructive" : kind === "payment" ? "gold" : "primary";
  const close = () => setTimeout(() => onOpenChange(false), 650);
  const confirm = async () => {
    await onConfirm?.();
    close();
  };
  const footer =
    kind === "default" ? (
      <>
        <ButtonLoadingMorph variant="ghost" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </ButtonLoadingMorph>
        <ButtonLoadingMorph state={state} onClick={() => run(confirm)}>
          {confirmLabel ?? "Confirm"}
        </ButtonLoadingMorph>
      </>
    ) : (
      <div className="w-full">
        <SlideToConfirm
          tone={kind === "destructive" ? "danger" : "gold"}
          mode={confirmMode}
          label={confirmLabel ?? (kind === "destructive" ? "Slide to confirm" : "Slide to collect")}
          confirmedLabel={kind === "destructive" ? "Done" : "Collected"}
          onConfirm={confirm}
          resetAfter={null}
        />
        <button type="button" onClick={() => onOpenChange(false)} className="mt-2 h-11 w-full rounded-control text-sm font-semibold text-ink-neutral hover:bg-muted">
          {cancelLabel}
        </button>
      </div>
    );
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title={title} description={description} icon={icon} tone={tone} footer={footer} size="sm">
      {children}
    </ResponsiveModal>
  );
}
