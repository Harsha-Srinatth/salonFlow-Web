import { useCallback, useState } from "react";

/**
 * Material-style ripple, CSS-animated. Spread `handlers` on a `relative overflow-hidden` element
 * and render `ripples` inside it. Colour follows currentColor.
 */
export function useRipple() {
  const [items, setItems] = useState([]);
  const onPointerDown = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const id = `${Date.now()}-${Math.random()}`;
    setItems((list) => [...list.slice(-2), { id, x: e.clientX - r.left, y: e.clientY - r.top, size }]);
    setTimeout(() => setItems((list) => list.filter((it) => it.id !== id)), 650);
  }, []);
  const ripples = items.map((it) => <span key={it.id} aria-hidden className="kit-ripple" style={{ left: it.x, top: it.y, width: it.size, height: it.size }} />);
  return { handlers: { onPointerDown }, ripples };
}
