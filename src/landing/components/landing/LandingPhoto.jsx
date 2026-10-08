import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Remote photo that degrades to brand gradient art (never a broken-image icon or stray alt text)
 * when it can't load: offline, blocked CDN, slow network. Accepts motion props for reveals.
 */
export function LandingPhoto({ icon: Icon = Sparkles, className, ...img }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div role="img" aria-label={img.alt} className={cn("relative overflow-hidden bg-[linear-gradient(150deg,hsl(var(--portal-accent)),hsl(var(--ink-info))_130%)]", className)}>
        <div aria-hidden className="grain absolute inset-0" />
        <Icon aria-hidden className="absolute -top-6 -right-8 size-56 rotate-12 text-white/15" strokeWidth={1.25} />
      </div>
    );
  }
  return <motion.img {...img} onError={() => setFailed(true)} className={className} />;
}
