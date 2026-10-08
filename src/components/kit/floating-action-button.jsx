import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { haptic, spring } from "@/components/motion/presets";

/**
 * Floating action button. With `actions` it expands into a stack of labelled mini buttons
 * (springs out with a stagger, scrim behind, Esc closes). Without, it's a single action.
 * Sits above the mobile tab bar automatically (bottom offset uses --tabbar-h + safe area).
 * @param {{ icon?: any, label: string, onClick?: ()=>void, actions?: {id:string,label:string,icon:any,onClick:()=>void}[], className?: string }} props
 */
export function FloatingActionButton({ icon: Icon = Plus, label, onClick, actions, className }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const expandable = Array.isArray(actions) && actions.length > 0;
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open ? <motion.div className="fixed inset-0 z-fab bg-[hsl(var(--scrim))]" initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} aria-hidden /> : null}
      </AnimatePresence>
      <div className={cn("fixed right-4 z-fab flex flex-col items-end gap-3 bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+1rem)] lg:right-8 lg:bottom-8", className)}>
        <AnimatePresence>
          {open && expandable ? (
            <motion.ul id={menuId} role="menu" className="flex flex-col items-end gap-2.5" initial="hidden" animate="show" exit="hidden" variants={{ show: { transition: { staggerChildren: 0.05, staggerDirection: -1 } }, hidden: { transition: { staggerChildren: 0.03 } } }}>
              {actions.map((a) => {
                const AIcon = a.icon;
                return (
                  <motion.li key={a.id} role="none" variants={{ hidden: { opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.8 }, show: { opacity: 1, y: 0, scale: 1, transition: spring.bouncy } }}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpen(false);
                        a.onClick?.();
                      }}
                      className="glass-strong flex h-12 items-center gap-3 rounded-full pr-5 pl-2 text-sm font-semibold"
                    >
                      <span className="grid size-9 place-items-center rounded-full bg-portal/12 text-portal">
                        <AIcon className="size-4.5" aria-hidden />
                      </span>
                      {a.label}
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          ) : null}
        </AnimatePresence>
        <motion.button
          type="button"
          aria-label={label}
          aria-expanded={expandable ? open : undefined}
          aria-controls={expandable ? menuId : undefined}
          aria-haspopup={expandable ? "menu" : undefined}
          onClick={() => {
            haptic("tap");
            if (expandable) setOpen((v) => !v);
            else onClick?.();
          }}
          whileTap={reduce ? undefined : { scale: 0.92 }}
          className="shine grid size-15 place-items-center rounded-[1.4rem] bg-portal text-portal-foreground shadow-glow"
        >
          <motion.span animate={{ rotate: open ? 135 : 0 }} transition={spring.bouncy} className="grid">
            <Icon className="size-6" aria-hidden />
          </motion.span>
        </motion.button>
      </div>
    </>
  );
}
