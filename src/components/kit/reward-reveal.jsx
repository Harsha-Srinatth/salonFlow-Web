import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Gift, Sparkles } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { haptic, spring } from "@/components/motion/presets";
import { fireConfetti } from "@/components/motion/confetti-burst";

/**
 * Scratch-card reward reveal. Scratch the foil with finger/mouse; past ~45% it clears itself, the
 * prize pops and confetti fires. A "Reveal" button gives keyboard / reduced-motion users the same
 * result without scratching. Purely presentational: the caller decides the reward (e.g. from
 * POST /api/customer/loyalty/vault/draw) and passes it in.
 * @param {{ reward: {title:string, subtitle?:string, icon?:any}, revealed?: boolean, onReveal?: ()=>void,
 *   foilLabel?: string, className?: string }} props
 */
export function RewardReveal({ reward, revealed: revealedProp, onReveal, foilLabel = "Scratch to reveal", className }) {
  const reduce = useReducedMotion();
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [revealed, setRevealed] = useState(Boolean(revealedProp));
  const drawing = useRef(false);
  const last = useRef(null);
  const Icon = reward?.icon ?? Gift;

  useEffect(() => {
    if (revealedProp) setRevealed(true);
  }, [revealedProp]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || revealed) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { width, height } = wrap.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, `hsl(${css.getPropertyValue("--portal-accent").trim() || css.getPropertyValue("--primary").trim()})`);
    g.addColorStop(0.5, `hsl(${css.getPropertyValue("--accent").trim()})`);
    g.addColorStop(1, `hsl(${css.getPropertyValue("--gold").trim()})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    // Subtle foil sparkle dots.
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 70; i += 1) ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "600 15px Figtree, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(foilLabel, width / 2, height / 2 + 5);
  }, [revealed, foilLabel]);

  const finish = () => {
    if (revealed) return;
    setRevealed(true);
    haptic("reward");
    void fireConfetti({ element: wrapRef.current, particleCount: 120, spread: 80 });
    onReveal?.();
  };

  const scratch = (e) => {
    const canvas = canvasRef.current;
    if (!drawing.current || !canvas) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 34;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(last.current?.x ?? x, last.current?.y ?? y);
    ctx.lineTo(x, y);
    ctx.stroke();
    last.current = { x, y };
  };

  const checkCleared = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let clear = 0;
    for (let i = 3; i < data.length; i += 64) if (data[i] === 0) clear += 1;
    if (clear / (data.length / 64) > 0.45) finish();
  };

  return (
    <div className={cn("w-full max-w-sm", className)}>
      <div ref={wrapRef} className="relative aspect-[16/10] w-full select-none overflow-hidden rounded-card bg-card shadow-lift ring-1 ring-inset ring-border/60">
        <div className="aurora absolute inset-0 grid place-items-center p-5 text-center">
          <motion.div initial={false} animate={revealed && !reduce ? { scale: [0.6, 1.12, 1], rotate: [-8, 4, 0] } : { scale: 1 }} transition={spring.bouncy} className="flex flex-col items-center gap-2">
            <span className="grid size-14 place-items-center rounded-2xl bg-gold/20 text-ink-warning ring-1 ring-inset ring-gold/40">
              <Icon className="size-7" aria-hidden />
            </span>
            <p className="font-display text-title font-bold">{reward?.title ?? "Reward"}</p>
            {reward?.subtitle ? <p className="text-caption text-ink-neutral">{reward.subtitle}</p> : null}
          </motion.div>
        </div>
        <AnimatePresence>
          {!revealed ? (
            <motion.canvas
              key="foil"
              ref={canvasRef}
              aria-hidden
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.45 }}
              className="absolute inset-0 size-full cursor-grab touch-none"
              onPointerDown={(e) => {
                drawing.current = true;
                last.current = null;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                scratch(e);
              }}
              onPointerMove={scratch}
              onPointerUp={() => {
                drawing.current = false;
                checkCleared();
              }}
              onPointerCancel={() => (drawing.current = false)}
            />
          ) : null}
        </AnimatePresence>
      </div>
      <div className="mt-3 flex justify-center" aria-live="polite">
        {revealed ? (
          <p className="text-sm font-semibold">You won {reward?.title}!</p>
        ) : (
          <button type="button" onClick={finish} className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-portal hover:bg-portal/10">
            <Sparkles className="size-4" aria-hidden /> Reveal
          </button>
        )}
      </div>
    </div>
  );
}
