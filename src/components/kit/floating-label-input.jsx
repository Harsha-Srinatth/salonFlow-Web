import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleAlert, CircleCheck, Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";

/**
 * Input (or textarea) with a floating label, animated focus glow, and inline validation:
 * errors shake once and slide in under the field, success shows a check.
 * Works with controlled or uncontrolled usage; forwards `ref` (React 19 ref-as-prop).
 * @param {{ label: string, icon?: any, error?: string, hint?: string, success?: boolean, as?: "input"|"textarea",
 *   trailing?: React.ReactNode, type?: string, className?: string, inputClassName?: string }} props
 */
export function FloatingLabelInput({ label, icon: Icon, error, hint, success = false, as = "input", trailing, type = "text", className, inputClassName, id, ref, ...rest }) {
  const reduce = useReducedMotion();
  const autoId = useId();
  const inputId = id ?? autoId;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const Field = as === "textarea" ? "textarea" : "input";
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        key={error ? `err-${error}` : "ok"}
        animate={error && !reduce ? { x: [0, -6, 5, -3, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "group relative rounded-control bg-card ring-1 ring-inset transition-[box-shadow,background-color] duration-200",
          error ? "ring-destructive/70" : success ? "ring-success/60" : "ring-border focus-within:ring-2 focus-within:ring-portal",
          "focus-within:shadow-[0_0_0_4px_hsl(var(--portal-accent)/0.14)]",
          rest.disabled && "opacity-55"
        )}
      >
        {Icon ? <Icon aria-hidden className={cn("pointer-events-none absolute left-3.5 size-4.5 text-ink-neutral transition-colors group-focus-within:text-portal", as === "textarea" ? "top-4" : "top-1/2 -translate-y-1/2")} /> : null}
        <Field
          ref={ref}
          id={inputId}
          type={isPassword && reveal ? "text" : type}
          placeholder=" "
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            "peer block w-full rounded-control bg-transparent px-3.5 pt-6 pb-2 text-[15px] text-foreground outline-none placeholder:text-transparent focus-visible:outline-none",
            as === "textarea" ? "min-h-28 resize-y" : "h-14",
            Icon && "pl-10",
            (trailing || isPassword || error || success) && "pr-11",
            inputClassName
          )}
          {...rest}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute top-1/2 left-3.5 origin-left -translate-y-1/2 text-[15px] text-ink-neutral transition-all duration-200 ease-[var(--ease-out-expo)]",
            as === "textarea" && "top-5",
            Icon && "left-10",
            "peer-focus:top-3.5 peer-focus:scale-[0.78] peer-focus:font-semibold peer-focus:text-portal",
            "peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:scale-[0.78] peer-[:not(:placeholder-shown)]:font-semibold",
            error && "text-ink-destructive! peer-focus:text-ink-destructive"
          )}
        >
          {label}
        </label>
        <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {trailing}
          {isPassword ? (
            <button type="button" onClick={() => setReveal((v) => !v)} aria-label={reveal ? "Hide password" : "Show password"} className="grid size-9 place-items-center rounded-xl text-ink-neutral hover:bg-muted">
              {reveal ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
            </button>
          ) : null}
          <AnimatePresence>
            {!isPassword && (error || success) ? (
              <motion.span key={error ? "e" : "s"} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={spring.bouncy} className="grid size-9 place-items-center">
                {error ? <CircleAlert className="size-4.5 text-ink-destructive" aria-hidden /> : <CircleCheck className="size-4.5 text-ink-success" aria-hidden />}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </motion.div>
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p key="e" id={`${inputId}-error`} role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={spring.snappy} className="mt-1.5 px-1 text-caption font-medium text-ink-destructive">
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="h" id={`${inputId}-hint`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-1.5 px-1 text-caption text-ink-neutral">
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
