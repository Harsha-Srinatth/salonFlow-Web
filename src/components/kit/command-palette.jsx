import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { motion } from "motion/react";
import { CornerDownLeft, Search } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";

/**
 * ⌘K / Ctrl+K command palette (cmdk). Give it groups of actions; it handles search, arrows and Enter.
 * @param {{ open: boolean, onOpenChange: (o:boolean)=>void, groups: {heading:string, items:{id:string,label:string,icon?:any,hint?:string,keywords?:string[],onSelect:()=>void}[]}[],
 *   placeholder?: string, hotkey?: boolean }} props
 */
export function CommandPalette({ open, onOpenChange, groups = [], placeholder = "Search or jump to…", hotkey = true }) {
  useEffect(() => {
    if (!hotkey) return undefined;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange, hotkey]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      overlayClassName="fixed inset-0 z-palette bg-[hsl(var(--scrim))]"
      contentClassName="fixed inset-x-3 top-[max(12vh,calc(1rem+var(--safe-top)))] z-palette mx-auto max-w-xl outline-none"
    >
        <Dialog.Title className="sr-only">Command palette</Dialog.Title>
        <Dialog.Description className="sr-only">Type to search, use the arrow keys to move and Enter to run.</Dialog.Description>
        <motion.div initial={{ opacity: 0, scale: 0.96, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={spring.sheet} className="glass-strong overflow-hidden rounded-sheet">
          <div className="flex items-center gap-3 border-b border-border/60 px-4">
            <Search className="size-5 text-ink-neutral" aria-hidden />
            <Command.Input placeholder={placeholder} className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-neutral focus-visible:outline-none" />
            <kbd className="hidden rounded-md bg-muted px-1.5 py-0.5 text-micro font-semibold text-ink-neutral sm:block">Esc</kbd>
          </div>
          <Command.List className="max-h-[min(60dvh,420px)] overflow-y-auto overscroll-contain p-2">
            <Command.Empty className="px-3 py-10 text-center text-sm text-ink-neutral">No matches</Command.Empty>
            {groups.map((g) => (
              <Command.Group key={g.heading} heading={g.heading} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-ink-neutral">
                {g.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <Command.Item
                      key={it.id}
                      value={`${it.label} ${(it.keywords ?? []).join(" ")}`}
                      onSelect={() => {
                        onOpenChange(false);
                        it.onSelect?.();
                      }}
                      className={cn("group flex h-12 cursor-pointer items-center gap-3 rounded-2xl px-3 text-sm font-medium", "data-[selected=true]:bg-portal/12 data-[selected=true]:text-foreground")}
                    >
                      {Icon ? (
                        <span className="grid size-8 place-items-center rounded-xl bg-muted text-ink-neutral group-data-[selected=true]:bg-portal group-data-[selected=true]:text-portal-foreground">
                          <Icon className="size-4" aria-hidden />
                        </span>
                      ) : null}
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.hint ? <span className="text-caption text-ink-neutral">{it.hint}</span> : null}
                      <CornerDownLeft className="size-4 text-ink-neutral opacity-0 group-data-[selected=true]:opacity-100" aria-hidden />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
        </motion.div>
    </Command.Dialog>
  );
}
