"use client";

import { ServicePhotoViewer } from "@/components/services/service-photo-viewer";
import { serviceImageUrl } from "@/lib/service-image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Swipeable photo carousel. Uses native horizontal scroll with CSS scroll-snap, so touch swipe,
 * trackpad and momentum all work without a gesture library; arrows and dots drive the same
 * scroll position. Images are lazy except the first. Tapping a photo opens the full-screen viewer.
 */
export function ServicePhotoCarousel({ images, alt, fallbackIcon: FallbackIcon, className }) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(() => new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState(0);
  const lastViewedRef = useRef(0);
  const count = images.length;

  const onViewerIndex = useCallback((next) => {
    lastViewedRef.current = next;
  }, []);

  // Leave the carousel on the photo the viewer was closed on.
  function closeViewer() {
    setViewerOpen(false);
    const track = trackRef.current;
    if (track) track.scrollTo({ left: lastViewedRef.current * track.clientWidth, behavior: "instant" });
  }

  function openViewer(at) {
    lastViewedRef.current = at;
    setViewerStart(at);
    setViewerOpen(true);
  }

  // Keep the active dot in sync with whatever moved the track (swipe, arrows, keyboard).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || count < 2) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        setIndex(Math.min(count - 1, Math.max(0, next)));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener("scroll", onScroll);
    };
  }, [count]);

  const goTo = useCallback(
    (next) => {
      const track = trackRef.current;
      if (!track) return;
      const target = (next + count) % count;
      track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
    },
    [count]
  );

  if (!count) {
    return (
      <div className={cn("grid aspect-[4/3] w-full place-items-center bg-secondary text-primary sm:aspect-video", className)}>
        {FallbackIcon ? <FallbackIcon className="size-14 opacity-70" /> : <ImageOff className="size-10 opacity-60" />}
      </div>
    );
  }

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-secondary", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${alt} photos`}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") goTo(index + 1);
        if (event.key === "ArrowLeft") goTo(index - 1);
      }}
    >
      <div
        ref={trackRef}
        tabIndex={0}
        className="flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none [scrollbar-width:none] sm:aspect-video [&::-webkit-scrollbar]:hidden"
      >
        {images.map((url, i) => (
          <div
            key={url}
            className="relative h-full w-full shrink-0 snap-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
          >
            {failed.has(url) ? (
              <div className="grid h-full w-full place-items-center text-muted-foreground">
                <ImageOff className="size-10" />
              </div>
            ) : (
              <button type="button" aria-label={`View photo ${i + 1} full screen`} onClick={() => openViewer(i)} className="block h-full w-full cursor-zoom-in">
                <img
                  src={serviceImageUrl(url, 1200, 900)}
                  alt={i === 0 ? alt : `${alt}, photo ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  onError={() => setFailed((prev) => new Set(prev).add(url))}
                  className="h-full w-full select-none object-cover"
                />
              </button>
            )}
          </div>
        ))}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => goTo(index - 1)}
            className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-foreground shadow-md sm:grid"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => goTo(index + 1)}
            className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-foreground shadow-md sm:grid"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((url, i) => (
              <button
                key={url}
                type="button"
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                onClick={() => goTo(i)}
                className={cn("tap h-2 w-5 rounded-full transition-transform duration-300", i === index ? "scale-x-100 bg-white" : "scale-x-40 bg-white/60")}
              />
            ))}
          </div>
          {/* Top-left: the details sheet's close button sits top-right. */}
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white">
            {index + 1}/{count}
          </span>
        </>
      ) : null}

      <ServicePhotoViewer
        open={viewerOpen}
        images={images}
        alt={alt}
        startIndex={viewerStart}
        onIndexChange={onViewerIndex}
        onClose={closeViewer}
      />
    </div>
  );
}
