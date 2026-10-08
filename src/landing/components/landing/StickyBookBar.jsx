import { CalendarPlus, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { telHref, useBusinessInfo } from "@/lib/business-info";
import { BOOK_HREF } from "./landing-data";

/**
 * Phones only: a thumb-reach Book bar that appears once the hero's own button has scrolled away,
 * and steps aside while the closing CTA or footer is on screen. Respects the home indicator.
 */
export default function StickyBookBar() {
  const { info } = useBusinessInfo();
  const phone = info?.profile?.phone ?? "";
  const [pastHero, setPastHero] = useState(false);
  const [endInView, setEndInView] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setPastHero(window.scrollY > window.innerHeight * 0.7);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

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

  const show = pastHero && !endInView;
  return (
    <div
      aria-hidden={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-sticky pr-[5.5rem] pb-[calc(0.75rem+var(--safe-bottom))] pl-3 transition-transform duration-200 ease-out motion-reduce:transition-none md:hidden",
        show ? "translate-y-0" : "pointer-events-none translate-y-[130%]"
      )}
    >
      <div className="glass-strong flex items-center gap-1.5 rounded-full p-1.5">
        <Link to={BOOK_HREF} tabIndex={show ? undefined : -1} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-portal font-semibold text-portal-foreground">
          <CalendarPlus className="size-5" aria-hidden /> Book now
        </Link>
        {phone ? (
          <a href={telHref(phone)} tabIndex={show ? undefined : -1} aria-label="Call the salon" className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-foreground">
            <Phone className="size-5" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}
