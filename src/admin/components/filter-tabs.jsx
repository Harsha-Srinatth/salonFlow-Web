"use client";
import { AnimatedTabBar } from "@/components/kit";

/**
 * Filter chips with the kit's morphing pill. `options` = [{ value, label, icon?, count? }] or strings.
 * Scrolls horizontally on narrow screens instead of wrapping.
 */
export function FilterTabs({ options, value, onChange, label, size = "sm", className }) {
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label, icon: o.icon, badge: o.count }));
  return <AnimatedTabBar items={items} value={value} onChange={onChange} label={label} size={size} className={className} />;
}
