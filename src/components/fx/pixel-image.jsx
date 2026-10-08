"use client";
import { useEffect, useRef, useState } from "react";
import { ImageGeneration } from "img-fx";
import { cn } from "@/lib/utils";

const REVEAL_WATCHDOG_MS = 2500;
const GL_MIN_SIZE = 180; // px: smaller boxes never use WebGL (not worth a shader)
const CELL = 12;

/* ---------- WebGL safety ----------
 * img-fx renders a shader and copies the GPU canvas to a 2D canvas on every frame for every loader.
 * A handful at once, or any software renderer, freezes the page. So WebGL is used only when a real
 * GPU is present, and never for more than one loader at a time; everything else gets the light
 * 2D-canvas mosaic below.
 */
let glSupport = null;
function webglUsable() {
  if (glSupport !== null) return glSupport;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return (glSupport = false);
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? `${gl.getParameter(info.UNMASKED_RENDERER_WEBGL)}` : "";
    glSupport = !/swiftshader|llvmpipe|software|basic render/i.test(renderer);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    glSupport = false;
  }
  return glSupport;
}

const MAX_GL_LOADERS = 1;
let glActive = 0;
function acquireGlSlot() {
  if (glActive >= MAX_GL_LOADERS) return false;
  glActive += 1;
  return true;
}
function releaseGlSlot() {
  glActive = Math.max(0, glActive - 1);
}

function reducedMotion() {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ---------- Light 2D-canvas pixel mosaic ---------- */
function MosaicLoader({ ready, onDone }) {
  const canvasRef = useRef(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const style = getComputedStyle(document.documentElement);
    const palette = ["--primary", "--accent", "--secondary", "--muted"].map((n) => `hsl(${style.getPropertyValue(n).trim()})`);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    const cols = Math.ceil(canvas.width / CELL);
    const rows = Math.ceil(canvas.height / CELL);
    const cells = Array.from({ length: cols * rows }, () => ({ c: palette[(Math.random() * palette.length) | 0], t: Math.random() }));
    let raf = 0;
    let last = 0;
    let revealAt = 0;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (now - last < 90) return; // ~11 fps: cheap and reads as churning
      last = now;
      if (readyRef.current && !revealAt) revealAt = now;
      const progress = revealAt ? Math.min(1, (now - revealAt) / 650) : 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < cells.length; i += 1) {
        if (!progress) {
          if (Math.random() < 0.3) cells[i].c = palette[(Math.random() * palette.length) | 0];
        } else if (cells[i].t < progress * 1.1) continue;
        ctx.fillStyle = cells[i].c;
        ctx.fillRect((i % cols) * CELL, ((i / cols) | 0) * CELL, CELL - 1, CELL - 1);
      }
      if (progress >= 1) {
        cancelAnimationFrame(raf);
        onDone();
      }
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // onDone only flips state; mount once per loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full" />;
}

/* ---------- WebGL loader (img-fx), one at a time ---------- */
const GL_IMAGE_PROPS = { pixelScale: 0.6 };

function GlLoader({ src, preset, ready, onDone, onFail }) {
  const handle = useRef(null);
  const images = useRef([src]).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!ready) return;
    handle.current?.triggerReveal({ hold: "manual" });
    // If the shader never gets going, do not leave the box on the loader.
    const watchdog = setTimeout(onFail, REVEAL_WATCHDOG_MS);
    return () => clearTimeout(watchdog);
  }, [ready, onFail]);

  // three logs (rather than throws) when a shader fails to compile: treat that as "no WebGL" for good.
  useEffect(() => {
    const original = console.error;
    console.error = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("THREE.WebGLProgram")) {
        glSupport = false;
        queueMicrotask(onFail);
      }
      original.apply(console, args);
    };
    return () => {
      console.error = original;
    };
  }, [onFail]);

  const onCycle = useRef((event) => {
    if (event.phase === "visible") doneRef.current();
  }).current;

  return (
    <ImageGeneration ref={handle} preset={preset} images={images} onCycle={onCycle} style={{ position: "absolute", inset: 0 }} {...GL_IMAGE_PROPS}>
      <div style={{ width: "100%", height: "100%" }} />
    </ImageGeneration>
  );
}

/**
 * Image with a pixel-mosaic loader that dissolves into the real photo once it has downloaded
 * (Libraries.dev "Image generation" look). Starts only when scrolled into view. After the reveal
 * the loader is unmounted and a plain <img> remains. `fallback` renders when there is no `src`
 * or it fails to load.
 */
export function PixelImage({ src, alt = "", className, imgClassName, fallback = null, preset = "pixels-organic", loading = "lazy", ...imgProps }) {
  const [phase, setPhase] = useState(src ? "idle" : "empty");
  const [engine, setEngine] = useState("canvas");
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef(null);
  const holdsSlot = useRef(false);

  function release() {
    if (holdsSlot.current) {
      holdsSlot.current = false;
      releaseGlSlot();
    }
  }
  useEffect(() => release, []);

  useEffect(() => {
    release();
    setReady(false);
    setPhase(src ? "idle" : "empty");
  }, [src]);

  useEffect(() => {
    const node = wrapRef.current;
    if (visible || !node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, phase]);

  useEffect(() => {
    if (!src || !visible) return;
    if (reducedMotion()) {
      // No animation: just show the photo.
      setPhase("done");
      return;
    }
    const box = wrapRef.current?.getBoundingClientRect();
    const big = box && box.width >= GL_MIN_SIZE && box.height >= GL_MIN_SIZE;
    if (big && webglUsable() && acquireGlSlot()) {
      holdsSlot.current = true;
      setEngine("gl");
    } else setEngine("canvas");
    setPhase("loading");
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => !cancelled && setReady(true);
    probe.onerror = () => {
      if (cancelled) return;
      release();
      setPhase("empty");
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, visible]);

  const finish = useRef(() => {});
  finish.current = () => {
    release();
    setPhase("done");
  };
  const done = useRef(() => finish.current()).current;

  const frame = cn("relative overflow-hidden bg-secondary", className);
  if (phase === "empty") return <div ref={wrapRef} className={frame}>{fallback}</div>;
  if (phase === "done") {
    return (
      <div ref={wrapRef} className={frame}>
        <img src={src} alt={alt} loading={loading} decoding="async" {...imgProps} className={cn("size-full object-cover", imgClassName)} />
      </div>
    );
  }
  return (
    <div ref={wrapRef} role="img" aria-label={alt || "Loading image"} className={frame}>
      {phase === "loading" ? (
        engine === "gl" ? <GlLoader src={src} preset={preset} ready={ready} onDone={done} onFail={done} /> : <MosaicLoader ready={ready} onDone={done} />
      ) : null}
    </div>
  );
}
