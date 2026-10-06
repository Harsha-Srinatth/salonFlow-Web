import { toast as sonner } from "sonner";
import { haptic } from "@/components/motion/presets";
import { rewardIcon } from "@/components/kit/toast-icons";

// One toast API for every screen (contract item c): deduped by kind+title, errors linger longer,
// and every call can carry a short description and an action ({ label, onClick }).
// Rendering (glass card, animated icon, timer bar, swipe, stacking) lives in <KitToaster>.
const DURATION = { success: 4500, info: 4500, message: 4500, warning: 6000, error: 7000, reward: 6000 };
const HAPTIC = { success: "success", error: "error", warning: "warning", reward: "reward" };

function show(kind, title, opts = {}) {
    const text = (typeof title === "string" ? title : title?.message) || (kind === "error" ? "Something went wrong" : "Done");
    const { action, ...rest } = opts;
    if (HAPTIC[kind]) haptic(HAPTIC[kind]);
    return sonner[kind](text, { id: `${kind}:${text}`, duration: DURATION[kind], action, ...rest });
}

export const notify = {
    success: (title, opts) => show("success", title, opts),
    error: (title, opts) => show("error", title, opts),
    warning: (title, opts) => show("warning", title, opts),
    info: (title, opts) => show("info", title, opts),
    message: (title, opts) => show("message", title, opts),
    /** Celebration: gold toast + confetti burst (confetti is lazy-loaded, skipped for reduced motion). */
    reward: (title, opts = {}) => {
        haptic("reward");
        void import("@/components/motion/confetti-burst").then((m) => m.fireConfetti({ origin: { x: 0.5, y: 0.2 }, particleCount: 110 }));
        const text = title || "Reward unlocked";
        return sonner.success(text, { id: `reward:${text}`, duration: DURATION.reward, icon: rewardIcon, className: "kit-toast-reward", ...opts });
    },
    // One toast that moves loading -> success/error.
    promise: (promise, { loading, success, error }) => sonner.promise(promise, { loading, success, error, duration: DURATION.success }),
    loading: (title, opts) => sonner.loading(title, opts),
    dismiss: sonner.dismiss,
};

/**
 * Drop-in for `import { toast } from "sonner"`: same call shapes (toast("x"), toast.success(...),
 * toast.message, toast.promise, toast.dismiss) but routed through notify so haptics and dedupe apply.
 */
export const toast = Object.assign((title, opts) => notify.message(title, opts), notify, { custom: sonner.custom });

