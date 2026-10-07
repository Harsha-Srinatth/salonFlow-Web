import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import { useAppThemeToggle } from "@/components/theme-provider";
import { haptic, interaction, prefersReducedMotion, spring } from "@/components/motion/presets";

/**
 * Theme switch with an animated hand-off: the sun/moon swap with a springy rotate, and where the
 * View Transitions API exists the whole page cross-fades (opacity only) instead of flashing.
 * Falls back to an instant switch for reduced motion or older browsers.
 */
export function LandingThemeToggle({ className }) {
  const { isDark, toggleTheme } = useAppThemeToggle();
  const reduce = useReducedMotion();
  const onClick = () => {
    haptic("tap");
    if (typeof document.startViewTransition !== "function" || prefersReducedMotion()) {
      toggleTheme();
      return;
    }
    document.startViewTransition(() => flushSync(toggleTheme));
  };
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={reduce ? undefined : interaction.press}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className={cn("relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full text-foreground transition-colors hover:bg-muted", className)}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={isDark ? "sun" : "moon"}
          initial={reduce ? { opacity: 0 } : { rotate: -120, scale: 0.3, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { rotate: 120, scale: 0.3, opacity: 0 }}
          transition={spring.bouncy}
          className="grid"
        >
          {isDark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
