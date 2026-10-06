import { cn } from "@/lib/utils";

const SIZES = { xs: 16, sm: 24, md: 48, lg: 72, xl: 112 };

function Scissors({ px }) {
  return (
    <svg viewBox="0 0 64 64" width={px} height={px} fill="none" aria-hidden className="kit-loader-reduced overflow-visible">
      <g className="kit-snip-a" stroke="hsl(var(--portal-accent))" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="21" cy="51" r="7" />
        <path d="M25.5 45.5 L32 34" />
        <path d="M32 34 L37 6 L35 33 Z" fill="hsl(var(--portal-accent))" />
      </g>
      <g className="kit-snip-b" stroke="hsl(var(--accent))" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="43" cy="51" r="7" />
        <path d="M38.5 45.5 L32 34" />
        <path d="M32 34 L27 6 L29 33 Z" fill="hsl(var(--accent))" />
      </g>
      <circle cx="32" cy="34" r="2.2" fill="hsl(var(--foreground))" />
      {[
        [52, 12, "0s"],
        [11, 18, "0.6s"],
        [55, 32, "1.2s"],
      ].map(([x, y, delay]) => (
        <path
          key={`${x}-${y}`}
          className="kit-twinkle"
          style={{ animationDelay: delay }}
          d={`M${x} ${y - 4} L${x + 1.2} ${y - 1.2} L${x + 4} ${y} L${x + 1.2} ${y + 1.2} L${x} ${y + 4} L${x - 1.2} ${y + 1.2} L${x - 4} ${y} L${x - 1.2} ${y - 1.2} Z`}
          fill="hsl(var(--gold))"
        />
      ))}
    </svg>
  );
}

function Blob({ px }) {
  return (
    <span className="relative grid place-items-center" style={{ width: px, height: px }} aria-hidden>
      <span className="kit-blob absolute inset-0 rounded-blob bg-[conic-gradient(from_90deg,hsl(var(--portal-accent)),hsl(var(--accent)),hsl(var(--info)),hsl(var(--portal-accent)))] opacity-90 blur-[1px]" />
      <span className="kit-blob-inner absolute inset-[18%] rounded-blob bg-card/80" />
      <span className="kit-loader-reduced absolute inset-[38%] rounded-full bg-portal" />
    </span>
  );
}

/** Three springy dots. Inherits currentColor so it sits inside buttons and toasts. */
export function BrandDots({ className, size = 6 }) {
  return (
    <span aria-hidden className={cn("inline-flex items-center gap-[3px]", className)}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="kit-dot rounded-full bg-current" style={{ width: size, height: size, animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  );
}

/**
 * The branded loader. Never use a plain spinner.
 * @param {{ variant?: "scissors"|"blob"|"dots", size?: "xs"|"sm"|"md"|"lg"|"xl", label?: string, hideLabel?: boolean, fullScreen?: boolean, className?: string }} props
 */
export function BrandLoader({ variant = "scissors", size = "md", label = "Loading…", hideLabel = false, fullScreen = false, className }) {
  const px = SIZES[size] ?? SIZES.md;
  const visual = variant === "blob" ? <Blob px={px} /> : variant === "dots" ? <BrandDots className="text-portal" size={Math.max(4, px / 6)} /> : <Scissors px={px} />;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 text-center", fullScreen && "min-h-dvh bg-background p-6", className)}
    >
      {visual}
      {hideLabel ? <span className="sr-only">{label}</span> : <p className="text-caption font-medium text-ink-neutral">{label}</p>}
    </div>
  );
}
