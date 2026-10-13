import { cn } from "@/lib/utils";

// Dark-green artwork disappears on dark surfaces, so it sits on a soft light chip there.
const darkChip = "dark:rounded-xl dark:bg-white/90 dark:p-1";

/**
 * Sahasra logo. `variant="responsive"` shows the full horizontal lockup from `sm` up and the
 * compact family mark on phones; `mark` / `horizontal` / `stacked` force one artwork.
 * @param {{ variant?: "responsive"|"mark"|"horizontal"|"stacked", className?: string, markClassName?: string, wideClassName?: string }} props
 */
export function BrandLogo({ variant = "responsive", className, markClassName = "h-10", wideClassName = "h-10" }) {
  const alt = "Sahasra Family Salon";
  if (variant === "mark") return <img src="/logo-mark.png" alt={alt} width="1254" height="1254" className={cn("w-auto", markClassName, darkChip, className)} />;
  if (variant === "stacked") return <img src="/logo-emblem.png" alt={alt} width="400" height="400" className={cn("w-auto", wideClassName, darkChip, className)} />;
  if (variant === "horizontal") return <img src="/logo-horizontal.png" alt={alt} width="2172" height="724" className={cn("w-auto", wideClassName, darkChip, className)} />;
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img src="/logo-mark.png" alt={alt} width="1254" height="1254" className={cn("w-auto sm:hidden", markClassName, darkChip)} />
      <img src="/logo-horizontal.png" alt="" aria-hidden="true" width="2172" height="724" className={cn("hidden w-auto sm:block", wideClassName, darkChip)} />
    </span>
  );
}
