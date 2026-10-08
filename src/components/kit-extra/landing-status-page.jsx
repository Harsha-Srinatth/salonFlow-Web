import { motion, useReducedMotion } from "motion/react";
import { Home, RotateCcw, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { spring, variants } from "@/components/motion/presets";
import { MagneticButton } from "@/components/motion/magnetic-button";
import { AuroraBackground } from "@/components/kit/aurora-background";
import { ButtonLoadingMorph, BUTTON_SIZES, BUTTON_VARIANTS, useAsyncAction } from "@/components/kit/button-loading-morph";
import { Illustration } from "@/components/kit/illustrations";
import { useOnlineStatus } from "@/components/kit/offline-banner";

const P = "hsl(var(--portal-accent))";
const A = "hsl(var(--accent))";
const G = "hsl(var(--gold))";

/** "4 ✂ 4": a pair of scissors snipping between two big fours, a dashed cut line drawing in. */
function SnipIllustration() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 320 170" className="h-auto w-full max-w-[22rem]" aria-hidden>
      <ellipse cx="160" cy="88" rx="140" ry="70" fill={P} opacity="0.1" />
      <ellipse cx="200" cy="70" rx="80" ry="54" fill={A} opacity="0.1" />
      <text x="62" y="128" textAnchor="middle" className="font-display" fontSize="132" fontWeight="800" fill={P}>
        4
      </text>
      <text x="258" y="128" textAnchor="middle" className="font-display" fontSize="132" fontWeight="800" fill={P}>
        4
      </text>
      <motion.path
        d="M20 152 H300"
        stroke={A}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 10"
        fill="none"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
      <g transform="translate(160 92)">
        {[-1, 1].map((dir) => (
          // Rotation about the pivot (0,0) via SMIL: transform-only and exact, no transform-origin guesswork.
          <g key={dir} transform={`rotate(${dir * 10})`}>
            {reduce ? null : (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values={`${dir * 16};${dir * 2};${dir * 16}`}
                keyTimes="0;0.5;1"
                calcMode="spline"
                keySplines="0.65 0 0.35 1;0.65 0 0.35 1"
                dur="1.6s"
                repeatCount="indefinite"
              />
            )}
            <path d={`M0 0 L${dir * -5} -58 Q${dir * 1} -66 ${dir * 6} -56 Z`} fill="hsl(var(--foreground))" opacity="0.85" />
            <circle cx={dir * 13} cy="24" r="12" fill="none" stroke={P} strokeWidth="6" />
          </g>
        ))}
        <circle r="4" fill={G} />
      </g>
      {[
        [118, 30, 0],
        [214, 22, 0.7],
        [292, 60, 1.3],
      ].map(([x, y, d]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <motion.path
            d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z"
            fill={A}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            animate={reduce ? undefined : { scale: [0.6, 1.1, 0.6], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: d, ease: [0.2, 0, 0, 1] }}
          />
        </g>
      ))}
    </svg>
  );
}

const COPY = {
  notFound: { title: "This page got a trim", text: "The link may be old or mistyped." },
  offline: { title: "You're offline", text: "Check your connection and try again." },
  error: { title: "Something slipped", text: "A quick reload usually fixes it." },
};

/**
 * Full-page 404 / offline / error screen with an animated illustration and ONE action.
 * Used by the public 404 route and the app-level error boundary; any portal can reuse it.
 * @param {{ kind?: "notFound"|"offline"|"error", onRetry?: () => any, className?: string }} props
 */
export function LandingStatusPage({ kind = "notFound", onRetry, className }) {
  const reduce = useReducedMotion();
  const online = useOnlineStatus();
  const { state, run } = useAsyncAction({ successMs: 400 });
  const copy = COPY[kind] ?? COPY.error;
  const retry = () => run(async () => (onRetry ? onRetry() : window.location.reload()));

  return (
    <main className={cn("relative isolate grid min-h-dvh place-items-center overflow-hidden px-[var(--gutter)] pt-[calc(1.5rem+var(--safe-top))] pb-[calc(1.5rem+var(--safe-bottom))]", className)}>
      <AuroraBackground />
      {/* A plain link (not the router) so it works even when the app state is what broke. */}
      <a href="/" className="absolute top-[calc(1rem+var(--safe-top))] left-[var(--gutter)] inline-flex h-11 items-center gap-2.5 rounded-full pr-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-portal font-display text-lg font-bold text-portal-foreground shadow-glow">S</span>
        <span className="font-display text-xl font-bold">Sahasra</span>
      </a>
      <motion.div
        variants={variants.stagger(0.08, 0.05)}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="flex w-full max-w-lg flex-col items-center text-center"
        role={kind === "notFound" ? undefined : "alert"}
      >
        <motion.div variants={variants.scaleIn} className="flex w-full justify-center">
          {kind === "notFound" ? <SnipIllustration /> : <Illustration name={kind === "offline" ? "offline" : "error"} className="h-40 sm:h-48" />}
        </motion.div>
        {kind === "notFound" ? (
          <motion.p variants={variants.fadeUp} className="mt-2 text-micro font-bold tracking-[0.2em] text-ink-neutral uppercase">
            Error 404
          </motion.p>
        ) : null}
        <motion.h1 variants={variants.fadeUp} className="mt-2 font-display text-display-lg font-bold text-balance">
          {copy.title}
        </motion.h1>
        <motion.p variants={variants.fadeUp} className="mt-3 text-body text-ink-neutral">
          {copy.text}
        </motion.p>
        {kind === "offline" && online ? (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.bouncy} className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-success/12 px-3 text-sm font-semibold text-ink-success">
            <Wifi className="size-4" aria-hidden /> Back online
          </motion.p>
        ) : null}
        <motion.div variants={variants.fadeUp} className="mt-7">
          {kind === "notFound" ? (
            <MagneticButton>
              <Link to="/" className={cn("inline-flex items-center justify-center font-semibold shine", BUTTON_VARIANTS.primary, BUTTON_SIZES.lg)}>
                <Home className="size-5" aria-hidden /> Go home
              </Link>
            </MagneticButton>
          ) : (
            <ButtonLoadingMorph size="lg" icon={RotateCcw} state={state} onClick={retry} loadingLabel="Reloading…" successLabel="Reloading">
              {kind === "offline" ? "Try again" : "Reload"}
            </ButtonLoadingMorph>
          )}
        </motion.div>
      </motion.div>
    </main>
  );
}
