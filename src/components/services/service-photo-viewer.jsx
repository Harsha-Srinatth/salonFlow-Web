"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { serviceImageFullUrl } from "@/lib/service-image";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/**
 * Full-screen photo viewer opened from the details carousel. Shows each photo whole (no crop) on a
 * dark background, starting at `startIndex`; swipe / arrows / keyboard move between photos with the
 * same native scroll-snap approach as the carousel. Reports the last photo shown via `onIndexChange`
 * so the carousel can stay on it after closing.
 */
export function ServicePhotoViewer({ open, images, alt, startIndex, onIndexChange, onClose }) {
  // State, not a ref: the portal mounts the track a render after `open` flips, and the scroll
  // listener below has to attach once the node actually exists.
  const [track, setTrack] = useState(null);
  const [index, setIndex] = useState(startIndex);
  const [failed, setFailed] = useState(() => new Set());
  const count = images.length;

  // Jump (not animate) to the tapped photo each time the viewer opens.
  const attachTrack = useCallback(
    (node) => {
      setTrack(node);
      if (!node) return;
      node.scrollLeft = startIndex * node.clientWidth;
      setIndex(startIndex);
    },
    [startIndex]
  );

  useEffect(() => {
    if (!track || count < 2) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
        setIndex(next);
        onIndexChange?.(next);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener("scroll", onScroll);
    };
  }, [track, count, onIndexChange]);

  const goTo = useCallback(
    (next) => {
      if (!track || next < 0 || next >= count) return;
      track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
    },
    [track, count]
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[60] text-white outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onKeyDown={(event) => {
            // React events bubble through the portal: keep arrows from also moving the carousel behind.
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") event.stopPropagation();
            if (event.key === "ArrowRight") goTo(index + 1);
            if (event.key === "ArrowLeft") goTo(index - 1);
          }}
        >
          <DialogPrimitive.Title className="sr-only">{alt} photos</DialogPrimitive.Title>
          <div
            ref={attachTrack}
            className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((url, i) => (
              <div
                key={url}
                className="grid h-full w-full shrink-0 snap-center place-items-center px-0 py-16 sm:px-16"
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
              >
                {failed.has(url) ? (
                  <ImageOff className="size-12 text-white/60" />
                ) : (
                  <img
                    src={serviceImageFullUrl(url)}
                    alt={i === 0 ? alt : `${alt}, photo ${i + 1}`}
                    loading={Math.abs(i - startIndex) <= 1 ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                    onError={() => setFailed((prev) => new Set(prev).add(url))}
                    className="max-h-full max-w-full select-none object-contain"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">{count > 1 ? `${index + 1} / ${count}` : ""}</span>
            <DialogPrimitive.Close
              aria-label="Close photos"
              className="pointer-events-auto grid size-11 place-items-center rounded-full bg-white/15 outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
            >
              <X className="size-6" />
            </DialogPrimitive.Close>
          </div>

          {count > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                disabled={index === 0}
                onClick={() => goTo(index - 1)}
                className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 disabled:opacity-30 sm:grid"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                disabled={index === count - 1}
                onClick={() => goTo(index + 1)}
                className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 disabled:opacity-30 sm:grid"
              >
                <ChevronRight className="size-6" />
              </button>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-1.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {images.map((url, i) => (
                  <span key={url} className={i === index ? "h-2 w-5 rounded-full bg-white transition-all" : "size-2 rounded-full bg-white/40 transition-all"} />
                ))}
              </div>
            </>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
