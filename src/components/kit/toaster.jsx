import { Toaster as Sonner } from "sonner";
import { useAppThemeToggle } from "@/components/theme-provider";
import { toastIcons } from "./toast-icons";

/**
 * The app's single toaster: sonner engine, glass styling + per-type personality from globals.css
 * (.kit-toast). Swipe to dismiss, stacked depth, timer bar that pauses on hover.
 * Mounted once by <KitProvider>; fire toasts with `notify` from "@/lib/notify".
 */
export function KitToaster(props) {
  let theme = "light";
  try {
    theme = useAppThemeToggle().theme;
  } catch {
    // Outside ThemeProvider (e.g. tests): fall back to light.
  }
  return (
    <Sonner
      theme={theme}
      position="top-right"
      closeButton
      duration={4500}
      gap={10}
      visibleToasts={3}
      offset={{ top: "calc(var(--toast-top, 24px) + var(--safe-top))", right: 24 }}
      mobileOffset={{ top: "calc(var(--toast-top, 12px) + var(--safe-top))", left: 12, right: 12 }}
      icons={toastIcons}
      toastOptions={{ unstyled: true, classNames: { toast: "kit-toast" } }}
      style={{ zIndex: "var(--z-toast)" }}
      {...props}
    />
  );
}
