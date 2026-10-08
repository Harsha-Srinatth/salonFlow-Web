import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/components/motion/presets";
import { TONE_CLASSES } from "./status-meta";

const SIZES = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

/**
 * Centered dialog (desktop confirmations, forms, details): a 160ms fade + slight scale, no blur.
 * `layoutId` is accepted for older call sites but no longer morphs from the trigger.
 * @param {{ open: boolean, onOpenChange: (o:boolean)=>void, title: string, description?: string, icon?: any,
 *   tone?: keyof TONE_CLASSES, layoutId?: string, size?: keyof SIZES, footer?: React.ReactNode, hideClose?: boolean, className?: string }} props
 */
// eslint-disable-next-line no-unused-vars
export function MorphDialog({ open, onOpenChange, title, description, icon: Icon, tone = "primary", layoutId, size = "md", footer, hideClose = false, className, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-modal bg-[hsl(var(--scrim))]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration.fast, ease: ease.out }}
              />
            </Dialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-modal grid place-items-center p-4 pt-[calc(1rem+var(--safe-top))] pb-[calc(1rem+var(--safe-bottom))]">
              <Dialog.Content asChild forceMount>
                <motion.div
                  className={cn("glass-strong pointer-events-auto flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-sheet outline-none", SIZES[size] ?? SIZES.md, className)}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: duration.instant, ease: ease.out } }}
                  transition={{ duration: 0.16, ease: ease.out }}
                >
                  <div className="flex items-start gap-3 px-5 pt-5 pb-3 sm:px-6">
                    {Icon ? (
                      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset", TONE_CLASSES[tone])}>
                        <Icon className="size-5" aria-hidden />
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <Dialog.Title className="font-display text-headline font-semibold">{title}</Dialog.Title>
                      {description ? <Dialog.Description className="mt-1 text-caption text-ink-neutral">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
                    </div>
                    {hideClose ? null : (
                      <Dialog.Close className="tap -mr-1 grid size-9 shrink-0 place-items-center rounded-xl text-ink-neutral transition-colors hover:bg-muted hover:text-foreground" aria-label="Close">
                        <X className="size-4.5" aria-hidden />
                      </Dialog.Close>
                    )}
                  </div>
                  {children ? <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div> : null}
                  {footer ? <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div> : null}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
