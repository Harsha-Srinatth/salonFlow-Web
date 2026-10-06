"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HoldButton } from "@/components/fx/hold-button";

/**
 * Animated replacement for window.confirm(). Pass `hold: true` for irreversible actions: the
 * confirm button then has to be pressed and held.
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (!(await confirm({ title: "Delete staff?", description: "…", confirmLabel: "Delete" }))) return;
 *   …render {confirmDialog} once in the page.
 */
export function useConfirm() {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);

  const settle = useCallback((value) => {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setRequest(options);
      }),
    []
  );

  const confirmDialog = (
    <DialogPrimitive.Root open={Boolean(request)} onOpenChange={(open) => !open && settle(false)}>
      <AnimatePresence>
        {request ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className="fixed left-1/2 top-1/2 z-[60] w-[min(26rem,calc(100vw-2rem))] rounded-2xl border bg-card p-5 text-card-foreground shadow-2xl outline-none"
                initial={{ opacity: 0, scale: 0.92, x: "-50%", y: "-46%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-48%" }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              >
                <div className="flex gap-3">
                  <motion.span initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.08 }} className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                    <AlertTriangle className="size-5" />
                  </motion.span>
                  <div className="min-w-0">
                    <DialogPrimitive.Title className="font-display text-base font-semibold">{request.title}</DialogPrimitive.Title>
                    {request.description ? <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{request.description}</DialogPrimitive.Description> : null}
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => settle(false)}>
                    {request.cancelLabel ?? "Cancel"}
                  </Button>
                  {request.hold ? (
                    <HoldButton className="bg-destructive text-white" holdingLabel="Keep holding…" onConfirm={() => settle(true)}>
                      {`Hold to ${`${request.confirmLabel ?? "confirm"}`.toLowerCase()}`}
                    </HoldButton>
                  ) : (
                    <Button type="button" variant={request.destructive === false ? "default" : "destructive"} onClick={() => settle(true)}>
                      {request.confirmLabel ?? "Confirm"}
                    </Button>
                  )}
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );

  return { confirm, confirmDialog };
}
