import useEmblaCarousel from "embla-carousel-react";
import { motion, useReducedMotion } from "motion/react";
import { Children, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";

/**
 * Swipeable card carousel (embla): drag/swipe, trackpad, keyboard arrows, and a morphing dot pager.
 * Each child is one slide; `slideClassName` sets its width (default 85% on phones, 3 per row wide).
 * @param {{ label: string, children: React.ReactNode, slideClassName?: string, className?: string }} props
 */
export function UserCarousel({ label, children, slideClassName = "basis-[85%] sm:basis-[48%] xl:basis-[32%]", className }) {
  const reduce = useReducedMotion();
  const [ref, embla] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps", skipSnaps: false });
  const [index, setIndex] = useState(0);
  const [snaps, setSnaps] = useState([]);
  const slides = Children.toArray(children);

  useEffect(() => {
    if (!embla) return undefined;
    const sync = () => {
      setSnaps(embla.scrollSnapList());
      setIndex(embla.selectedScrollSnap());
    };
    sync();
    embla.on("select", sync).on("reInit", sync);
    return () => {
      embla.off("select", sync).off("reInit", sync);
    };
  }, [embla]);

  const onKey = useCallback(
    (e) => {
      if (e.key === "ArrowRight") embla?.scrollNext();
      if (e.key === "ArrowLeft") embla?.scrollPrev();
    },
    [embla]
  );

  return (
    <section aria-roledescription="carousel" aria-label={label} className={cn("min-w-0", className)}>
      <div ref={ref} className="-mx-1 overflow-hidden px-1 py-1" onKeyDown={onKey}>
        <div className="flex touch-pan-y gap-3">
          {slides.map((slide, i) => (
            <div key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} className={cn("min-w-0 shrink-0 grow-0", slideClassName)}>
              {slide}
            </div>
          ))}
        </div>
      </div>
      {snaps.length > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5">
          {snaps.map((_, i) => (
            <button key={i} type="button" aria-label={`Go to slide ${i + 1}`} aria-current={i === index} onClick={() => embla?.scrollTo(i)} className="tap relative grid h-2 w-2 place-items-center">
              <span className="absolute inset-0 rounded-full bg-muted-foreground/25" />
              {i === index ? <motion.span layoutId={`${label}-dot`} transition={reduce ? { duration: 0 } : spring.snappy} className="absolute -inset-x-1.5 inset-y-0 rounded-full bg-portal" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
