import { Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef } from "react";

const vertex = `attribute vec2 position; varying vec2 vUv; void main(){ vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;
const fragment = `precision mediump float;
uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; varying vec2 vUv;
float blob(vec2 p, vec2 c, float r){ return smoothstep(r, 0.0, length(p - c)); }
void main(){
  vec2 p = vUv; float t = uTime * 0.05;
  vec3 col = vec3(0.0);
  col += uA * blob(p, vec2(0.25 + 0.12 * sin(t * 3.0), 0.7 + 0.1 * cos(t * 2.0)), 0.65);
  col += uB * blob(p, vec2(0.8 + 0.1 * cos(t * 2.5), 0.75 + 0.12 * sin(t * 1.7)), 0.6);
  col += uC * blob(p, vec2(0.55 + 0.15 * sin(t * 1.3), 0.2 + 0.1 * cos(t * 2.2)), 0.7);
  gl_FragColor = vec4(col, clamp(length(col), 0.0, 1.0) * 0.85);
}`;

function hslVar(name) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const [h, s, l] = raw.split(/\s+/).map((v) => parseFloat(v));
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

/** WebGL aurora (OGL, ~10 KB). Lazy-loaded by AuroraBackground; pauses offscreen and in hidden tabs. */
export default function AuroraGL({ className }) {
  const ref = useRef(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return undefined;
    const renderer = new Renderer({ alpha: true, dpr: 1, antialias: false });
    const { gl } = renderer;
    gl.canvas.className = className ?? "";
    host.appendChild(gl.canvas);
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      uniforms: { uTime: { value: 0 }, uA: { value: hslVar("--aurora-1") }, uB: { value: hslVar("--aurora-2") }, uC: { value: hslVar("--aurora-3") } },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const resize = () => renderer.setSize(host.clientWidth, host.clientHeight);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(host);
    let frame = 0;
    const loop = (t) => {
      frame = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      program.uniforms.uTime.value = t / 1000;
      renderer.render({ scene: mesh });
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      gl.canvas.remove();
    };
  }, [className]);
  return <div ref={ref} className="absolute inset-0" />;
}
