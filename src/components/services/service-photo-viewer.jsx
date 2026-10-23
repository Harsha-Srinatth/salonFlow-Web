"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandLoader } from "@/components/kit/brand-loader";
import { serviceImageFullUrl, serviceImageUrl } from "@/lib/service-image";
import { cn } from "@/lib/utils";

const clampIndex = (value, count) => Math.min(Math.max(0, count - 1), Math.max(0, Number(value) || 0));

/** Indexes whose full-size photo may be requested: the one shown and its two neighbours. */
function windowAround(index, count) {
  return [index - 1, index, index + 1].filter((i) => i >= 0 && i < count);
}

const controlClass =
  "grid size-11 place-items-center rounded-full bg-white/12 text-white backdrop-blur-md transition-colors hover:bg-white/22 outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-0";

/**
 * Full-viewport photo viewer for one service's photos. Each photo is shown whole (object-contain,
 * never cropped) on a dark stage. Native horizontal scroll with CSS scroll-snap drives touch swipe,
 * trackpad and momentum; arrows, thumbnails, dots and the keyboard (← → Home End, Esc closes) move
 * the same scroll position. Only the photo on screen and its neighbours are downloaded, each with
 * its own loading and failed state. Radix Dialog locks page scroll, and focus goes back to whatever
 * opened the viewer, so closing leaves the page exactly where it was.
 *
 * `onIndexChange` reports the photo being shown (the details carousel follows it after closing).
 */
export function ServicePhotoViewer({ open, images, alt, startIndex = 0, onIndexChange, onClose }) {
  // State, not a ref: the portal mounts the track a render after `open` flips, and the listeners
  // below have to attach once the node actually exists.
  const [track, setTrack] = useState(null);
  const [index, setIndex] = useState(() => clampIndex(startIndex, images.length));
  const [requested, setRequested] = useState(() => new Set());
  const [status, setStatus] = useState({});
  const [thumbFailed, setThumbFailed] = useState(() => new Set());
  const indexRef = useRef(index);
  // Set while an arrow / thumbnail / key move glides to its photo: the positions it passes through
  // are not the answer, and a second quick press must continue from the target, not from there.
  const targetRef = useRef(null);
  const settleTimerRef = useRef(0);
  const thumbsRef = useRef(null);
  // Radix only restores focus to a <Dialog.Trigger>; this viewer is opened from code, so it
  // remembers what had focus when it opened and hands focus back there on close.
  const openerRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const count = images.length;

  // Every time the viewer opens: jump (not animate) to the tapped photo and start a fresh window.
  const attachTrack = useCallback(
    (node) => {
      setTrack(node);
      if (!node) return;
      const start = clampIndex(startIndex, count);
      node.scrollLeft = start * node.clientWidth;
      indexRef.current = start;
      targetRef.current = null;
      setIndex(start);
      setStatus({});
      setRequested(new Set(windowAround(start, count)));
    },
    [startIndex, count]
  );

  // Photos near the current one are requested once and then kept, so swiping back never refetches.
  useEffect(() => {
    if (!open) return;
    setRequested((prev) => {
      const missing = windowAround(index, count).filter((i) => !prev.has(i));
      return missing.length ? new Set([...prev, ...missing]) : prev;
    });
  }, [open, index, count]);

  useEffect(() => {
    if (!track || count < 2) return undefined;
    const sync = () => {
      const next = clampIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)), count);
      if (next === indexRef.current) return;
      indexRef.current = next;
      setIndex(next);
      onIndexChange?.(next);
    };
    const onScroll = () => {
      if (targetRef.current === null) sync();
      // Once scrolling stops, the snapped position is the truth again (also covers a swipe that
      // interrupted a programmatic glide).
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        targetRef.current = null;
        sync();
      }, 150);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(settleTimerRef.current);
      track.removeEventListener("scroll", onScroll);
    };
  }, [track, count, onIndexChange]);

  // Rotating a phone or resizing the window changes the slide width; stay on the same photo.
  useEffect(() => {
    if (!track || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      track.scrollLeft = indexRef.current * track.clientWidth;
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [track]);

  // Keep the active thumbnail visible without scrolling anything else on the page.
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children[index];
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2;
    strip.scrollTo({ left, behavior: reduceMotion ? "instant" : "smooth" });
  }, [index, reduceMotion]);

  const goTo = useCallback(
    (next) => {
      if (!track || next < 0 || next >= count || next === indexRef.current) return;
      // A settle check left over from the previous glide would read a mid-flight position.
      clearTimeout(settleTimerRef.current);
      targetRef.current = next;
      indexRef.current = next;
      setIndex(next);
      onIndexChange?.(next);
      track.scrollTo({ left: next * track.clientWidth, behavior: reduceMotion ? "instant" : "smooth" });
    },
    [track, count, reduceMotion, onIndexChange]
  );

  const markStatus = (url, value) => setStatus((prev) => (prev[url] === value ? prev : { ...prev, [url]: value }));

  if (!count) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-[hsl(222_32%_5%/0.97)] backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current?.focus({ preventScroll: true });
          }}
          className="fixed inset-0 z-[60] flex flex-col text-white outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          onKeyDown={(event) => {
            const current = indexRef.current;
            const keys = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: count - 1 };
            if (!(event.key in keys)) return;
            // React events bubble through the portal: keep these keys from also moving the page behind.
            event.preventDefault();
            event.stopPropagation();
            goTo(keys[event.key]);
          }}
        >
          <header className="flex items-center gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-5">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate font-display text-base font-semibold sm:text-lg">{alt}</DialogPrimitive.Title>
              <p className="text-caption text-white/70 tabular-nums" aria-live="polite" aria-atomic="true">
                <span className="sr-only">Photo </span>
                {index + 1} / {count}
              </p>
            </div>
            <DialogPrimitive.Close aria-label="Close photos" className={controlClass}>
              <X className="size-6" aria-hidden />
            </DialogPrimitive.Close>
          </header>

          <div className="relative min-h-0 flex-1">
            <div
              ref={attachTrack}
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {images.map((url, i) => {
                const state = status[url];
                return (
                  <div
                    key={url}
                    // Flex, not grid: an auto grid row is as tall as the photo, so the image's
                    // max-height had nothing to resolve against and tall photos ran under the thumbnails.
                    className="relative flex h-full w-full shrink-0 snap-center items-center justify-center px-2 py-2 sm:px-20"
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${i + 1} of ${count}`}
                    aria-hidden={i !== index}
                  >
                    {state === "failed" ? (
                      <div className="flex flex-col items-center gap-3 text-center text-white/75">
                        <ImageOff className="size-12" aria-hidden />
                        <p className="text-sm font-medium">This photo couldn't load</p>
                      </div>
                    ) : (
                      <>
                        {state !== "loaded" && requested.has(i) ? (
                          <BrandLoader variant="blob" size="md" label="Loading photo" hideLabel className="absolute inset-0 text-white" />
                        ) : null}
                        {requested.has(i) ? (
                          <img
                            src={serviceImageFullUrl(url)}
                            alt={i === 0 ? alt : `${alt}, photo ${i + 1}`}
                            decoding="async"
                            draggable={false}
                            onLoad={() => markStatus(url, "loaded")}
                            onError={() => markStatus(url, "failed")}
                            className={cn(
                              "max-h-full max-w-full select-none rounded-lg object-contain shadow-float transition-opacity duration-300",
                              state === "loaded" ? "opacity-100" : "opacity-0"
                            )}
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {count > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  disabled={index === 0}
                  onClick={() => goTo(index - 1)}
                  className={cn(controlClass, "absolute left-3 top-1/2 hidden -translate-y-1/2 sm:grid sm:left-5")}
                >
                  <ChevronLeft className="size-6" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  disabled={index === count - 1}
                  onClick={() => goTo(index + 1)}
                  className={cn(controlClass, "absolute right-3 top-1/2 hidden -translate-y-1/2 sm:grid sm:right-5")}
                >
                  <ChevronRight className="size-6" aria-hidden />
                </button>
              </>
            ) : null}
          </div>

          {count > 1 ? (
            <footer className="px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {/* Phones: dots (swipe is the main control). Larger screens: a thumbnail strip. */}
              <div className="flex justify-center gap-1.5 sm:hidden" aria-hidden>
                {images.map((url, i) => (
                  <span key={url} className={cn("h-1.5 rounded-full transition-all duration-300", i === index ? "w-5 bg-white" : "w-1.5 bg-white/40")} />
                ))}
              </div>
              <div ref={thumbsRef} className="mx-auto hidden max-w-full gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] sm:flex sm:w-fit [&::-webkit-scrollbar]:hidden">
                {images.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={i === index ? "true" : undefined}
                    onClick={() => goTo(i)}
                    className={cn(
                      "relative size-14 shrink-0 overflow-hidden rounded-chip bg-white/10 outline-none transition-[opacity,box-shadow] focus-visible:ring-[3px] focus-visible:ring-white/60",
                      i === index ? "opacity-100 ring-2 ring-white" : "opacity-55 hover:opacity-90"
                    )}
                  >
                    {status[url] === "failed" || thumbFailed.has(url) ? (
                      <ImageOff className="m-auto size-5 text-white/70" aria-hidden />
                    ) : (
                      <img
                        src={serviceImageUrl(url, 112, 112)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        onError={() => setThumbFailed((prev) => new Set(prev).add(url))}
                        className="size-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            </footer>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
