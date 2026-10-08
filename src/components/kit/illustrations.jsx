import { cn } from "@/lib/utils";

/* Small, token-coloured SVG illustrations for empty/error/offline states. CSS-animated (float,
   twinkle) and frozen for reduced motion. 160×120 viewBox; scale with className. */

const P = "hsl(var(--portal-accent))";
const A = "hsl(var(--accent))";
const G = "hsl(var(--gold))";
const C = "hsl(var(--card))";
const M = "hsl(var(--muted))";
const F = "hsl(var(--muted-foreground))";

function Sparkle({ x, y, s = 1, delay = "0s", fill = G }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="kit-twinkle" style={{ animationDelay: delay }} d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z" fill={fill} />
    </g>
  );
}

function Base({ children }) {
  return (
    <>
      <ellipse cx="80" cy="66" rx="62" ry="48" fill={P} opacity="0.1" />
      <ellipse cx="96" cy="58" rx="40" ry="34" fill={A} opacity="0.1" />
      <ellipse cx="80" cy="112" rx="40" ry="5" fill={F} opacity="0.14" />
      {children}
    </>
  );
}

const ART = {
  calendar: (
    <Base>
      <g className="kit-float">
        <rect x="48" y="30" width="64" height="62" rx="12" fill={C} stroke={F} strokeOpacity="0.25" />
        <rect x="48" y="30" width="64" height="18" rx="12" fill={P} />
        <rect x="48" y="40" width="64" height="8" fill={P} />
        <rect x="60" y="24" width="6" height="14" rx="3" fill={F} opacity="0.5" />
        <rect x="94" y="24" width="6" height="14" rx="3" fill={F} opacity="0.5" />
        {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={57 + c * 13} y={56 + r * 11} width="8" height="6" rx="2" fill={r === 1 && c === 2 ? A : M} />))}
      </g>
      <Sparkle x={124} y={34} />
      <Sparkle x={38} y={50} s={0.7} delay="0.8s" />
    </Base>
  ),
  search: (
    <Base>
      <g className="kit-float">
        <circle cx="74" cy="58" r="24" fill={C} stroke={P} strokeWidth="6" />
        <path d="M66 50 a12 12 0 0 1 14 -4" stroke={A} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
        <rect x="92" y="74" width="10" height="28" rx="5" transform="rotate(-45 97 88)" fill={P} />
      </g>
      <Sparkle x={118} y={38} delay="0.4s" />
      <Sparkle x={42} y={36} s={0.6} delay="1.1s" />
    </Base>
  ),
  queue: (
    <Base>
      <g className="kit-float">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${42 + i * 28} ${44 + i * 4})`} opacity={1 - i * 0.22}>
            <circle cx="12" cy="10" r="9" fill={i === 0 ? P : M} />
            <rect x="0" y="22" width="24" height="26" rx="10" fill={i === 0 ? P : M} />
          </g>
        ))}
        <path d="M40 104 h80" stroke={F} strokeOpacity="0.3" strokeWidth="2" strokeDasharray="4 5" />
      </g>
      <Sparkle x={124} y={30} />
    </Base>
  ),
  gift: (
    <Base>
      <g className="kit-float">
        <rect x="50" y="52" width="60" height="44" rx="8" fill={P} />
        <rect x="45" y="40" width="70" height="16" rx="6" fill={A} />
        <rect x="76" y="40" width="8" height="56" fill={G} />
        <path d="M80 40 C70 22 54 28 64 40 M80 40 C90 22 106 28 96 40" stroke={G} strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>
      <Sparkle x={122} y={32} />
      <Sparkle x={36} y={44} s={0.8} delay="0.6s" />
      <Sparkle x={118} y={86} s={0.6} delay="1.2s" fill={A} />
    </Base>
  ),
  bag: (
    <Base>
      <g className="kit-float">
        <path d="M52 48 h56 l-5 50 h-46 z" fill={P} />
        <path d="M66 50 v-8 a14 14 0 0 1 28 0 v8" stroke={F} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.6" />
        <circle cx="80" cy="72" r="8" fill={C} opacity="0.85" />
      </g>
      <Sparkle x={120} y={36} delay="0.3s" />
    </Base>
  ),
  error: (
    <Base>
      <g className="kit-float">
        <rect x="52" y="26" width="56" height="72" rx="28" fill={C} stroke={F} strokeOpacity="0.3" strokeWidth="3" />
        <path d="M70 40 L82 58 L72 66 L88 88" stroke={A} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="74" y="98" width="12" height="10" rx="3" fill={F} opacity="0.5" />
      </g>
      <Sparkle x={122} y={40} fill={A} />
    </Base>
  ),
  offline: (
    <Base>
      <g className="kit-float" fill="none" strokeLinecap="round" strokeWidth="7">
        <path d="M44 56 a52 52 0 0 1 72 0" stroke={M} />
        <path d="M56 70 a34 34 0 0 1 48 0" stroke={F} strokeOpacity="0.45" />
        <path d="M68 84 a16 16 0 0 1 24 0" stroke={P} />
        <circle cx="80" cy="96" r="4" fill={P} stroke="none" />
        <path d="M48 36 L112 102" stroke={A} strokeWidth="5" />
      </g>
    </Base>
  ),
  sparkle: (
    <Base>
      <g className="kit-float">
        <circle cx="80" cy="62" r="26" fill={P} opacity="0.9" />
        <path d="M80 44 L84 58 L98 62 L84 66 L80 80 L76 66 L62 62 L76 58 Z" fill={C} />
      </g>
      <Sparkle x={120} y={34} />
      <Sparkle x={40} y={84} s={0.7} delay="0.9s" fill={A} />
    </Base>
  ),
};

/** @param {{ name?: keyof ART, className?: string }} props */
export function Illustration({ name = "sparkle", className }) {
  return (
    <svg viewBox="0 0 160 120" className={cn("h-28 w-auto", className)} aria-hidden>
      {ART[name] ?? ART.sparkle}
    </svg>
  );
}

export const ILLUSTRATIONS = Object.keys(ART);
