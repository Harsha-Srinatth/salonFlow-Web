import { Gift, Info } from "lucide-react";
import { BrandDots } from "./brand-loader";

/* Toast icons: CSS-animated (no JS per frame), personality per type. Used by <KitToaster>. */
const tile = (tone, children) => (
  <span className="relative grid size-9 place-items-center rounded-full" style={{ color: `hsl(var(${tone}))`, background: `hsl(var(${tone}) / 0.14)` }}>
    {children}
  </span>
);

export const toastIcons = {
  success: tile(
    "--success",
    <>
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="24" style={{ "--kit-dash": 24, animation: "kit-draw 420ms var(--ease-out-expo) 120ms both" }} />
      </svg>
    </>
  ),
  error: tile(
    "--destructive",
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="15" style={{ "--kit-dash": 15, animation: "kit-draw 320ms var(--ease-out-expo) both" }} />
    </svg>
  ),
  warning: tile(
    "--warning",
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden style={{ animation: "kit-pop 420ms var(--ease-bounce) both" }}>
      <path d="M12 4l9 16H3z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M12 10v4M12 17.2v.3" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  ),
  info: tile("--info", <Info className="size-5" aria-hidden style={{ animation: "kit-slide-in 360ms var(--ease-out-expo) both" }} />),
  loading: tile("--portal-accent", <BrandDots size={5} />),
};

export const rewardIcon = tile("--gold", <Gift className="size-5" aria-hidden style={{ animation: "kit-pop 520ms var(--ease-bounce) both" }} />);
