import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom sheet (vaul): drag-to-dismiss, optional snap points, dimmed scrim, safe-area footer.
 * On wide screens it stays a bottom sheet capped at max-w-lg — use <ResponsiveModal> when desktop
 * should get a centered dialog instead.
 * @param {{ open?: boolean, onOpenChange?: (o:boolean)=>void, trigger?: React.ReactNode, title: string, description?: string,
 *   icon?: any, hideHeader?: boolean, snapPoints?: (number|string)[], footer?: React.ReactNode, dismissible?: boolean, className?: string }} props
 */
export function SpringBottomSheet({ open, onOpenChange, trigger, title, description, icon: Icon, hideHeader = false, snapPoints, footer, dismissible = true, className, children }) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} snapPoints={snapPoints} dismissible={dismissible} repositionInputs>
      {trigger ? <Drawer.Trigger asChild>{trigger}</Drawer.Trigger> : null}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-sheet bg-[hsl(var(--scrim))]" />
        <Drawer.Content
          className={cn(
            "glass-strong fixed inset-x-0 bottom-0 z-sheet mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-sheet border-b-0 outline-none",
            snapPoints && "h-full max-h-[97dvh]",
            className
          )}
        >
          <Drawer.Handle className="mt-2.5 mb-1 h-1.5! w-11! shrink-0 rounded-full! bg-muted-foreground/30!" />
          <div className={cn("flex items-start gap-3 px-5 pt-2 pb-3", hideHeader && "sr-only")}>
            {Icon ? (
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-portal/12 text-portal">
                <Icon className="size-5" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0">
              <Drawer.Title className="font-display text-headline font-semibold">{title}</Drawer.Title>
              {description ? <Drawer.Description className="mt-0.5 text-caption text-ink-neutral">{description}</Drawer.Description> : <Drawer.Description className="sr-only">{title}</Drawer.Description>}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
          {footer ? <div className="shrink-0 border-t border-border/60 px-5 pt-3 pb-[calc(0.75rem+var(--safe-bottom))]">{footer}</div> : <div className="h-[var(--safe-bottom)] shrink-0" />}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
