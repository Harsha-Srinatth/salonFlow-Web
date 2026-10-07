"use client";
import { Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { ConfirmSheet } from "@/components/kit";

/**
 * The kit's ConfirmSheet driven imperatively. Destructive requests get SlideToConfirm; the action
 * runs while the thumb shows a loader, and the sheet closes on success. `action` should throw (after
 * telling the user why) when it fails, so the slider springs back and the sheet stays open.
 *   const { ask, confirmSheet } = useConfirm();
 *   ask({ title: "Delete offer?", description, confirmLabel: "Slide to delete", action: async () => … });
 *   …render {confirmSheet} once in the page.
 */
export function useConfirm() {
  const [request, setRequest] = useState(null);
  const [open, setOpen] = useState(false);

  const ask = useCallback((options) => {
    setRequest(options);
    setOpen(true);
  }, []);

  const confirmSheet = request ? (
    <ConfirmSheet
      open={open}
      onOpenChange={setOpen}
      kind={request.kind ?? "destructive"}
      icon={request.icon ?? Trash2}
      title={request.title}
      description={request.description}
      confirmLabel={request.confirmLabel}
      cancelLabel={request.cancelLabel ?? "Keep it"}
      onConfirm={request.action}
    >
      {request.body ?? null}
    </ConfirmSheet>
  ) : null;

  return { ask, confirmSheet };
}
