import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { CalendarPlus, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { telHref, useBusinessInfo } from "@/lib/business-info";
import { spring } from "@/components/motion/presets";
import { BOOK_HREF } from "./landing-data";

/**
 * Phones only: a thumb-reach Book bar that springs up once the hero's own button has scrolled
 * away, and steps aside while the closing CTA or footer is on screen. Respects the home indicator.
 */
export default function StickyBookBar() {
  const { info } = useBusinessInfo();
  const phone = info?.profile?.phone ?? "";
  const [pastHero, setPastHero] = useState(false);
  const [endInView, setEndInView] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setPastHero(y > window.innerHeight * 0.7));

  useEffect(() => {
    const targets = [document.getElementById("book"), document.querySelector("footer")].filter(Boolean);
    if (!targets.length) return undefined;
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      setEndInView(seen.size > 0);
    });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {pastHero && !endInView ? (
        <motion.div
          initial={{ y: "130%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "130%", opacity: 0 }}
          transition={spring.sheet}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-sticky pr-[5.5rem] pb-[calc(0.75rem+var(--safe-bottom))] pl-3 md:hidden"
        >
          <div className="glass-strong pointer-events-auto flex items-center gap-1.5 rounded-full p-1.5">
            <Link to={BOOK_HREF} className="shine shine-auto flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-portal font-semibold text-portal-foreground shadow-glow">
              <CalendarPlus className="size-5" aria-hidden /> Book now
            </Link>
            {phone ? (
              <a href={telHref(phone)} aria-label="Call the salon" className="grid size-12 shrink-0 place-items-center rounded-full bg-card text-foreground">
                <Phone className="size-5" aria-hidden />
              </a>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
