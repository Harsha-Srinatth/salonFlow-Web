"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Right-hand slide-over (bottom sheet on phones) that springs in, replacing static pop-up dialogs
 * for long admin forms. Focus trap, Escape and aria come from Radix.
 */
export function SlideOver({ open, onOpenChange, title, description, children, footer, className }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className={cn(
                  "fixed z-50 flex flex-col overflow-hidden bg-card text-card-foreground shadow-2xl outline-none",
                  "inset-x-0 bottom-0 max-h-[94dvh] rounded-t-3xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(640px,100vw)] sm:rounded-l-3xl sm:rounded-tr-none",
                  className
                )}
                initial={{ opacity: 0.6, x: 48, y: 48 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 48, y: 48 }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
              >
                <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
                  <div className="min-w-0">
                    <DialogPrimitive.Title className="truncate font-display text-lg font-semibold">{title}</DialogPrimitive.Title>
                    {description ? <DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">{description}</DialogPrimitive.Description> : null}
                  </div>
                  <DialogPrimitive.Close asChild>
                    <motion.button type="button" whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground">
                      <X className="size-4" />
                    </motion.button>
                  </DialogPrimitive.Close>
                </header>
                {children}
                {footer ? <footer className="border-t bg-card/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer> : null}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
