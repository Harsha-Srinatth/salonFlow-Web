import { Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Remote photo that degrades to a quiet placeholder (never a broken-image icon or stray alt text)
 * when it can't load: offline, blocked CDN, slow network.
 */
export function LandingPhoto({ icon: Icon = Sparkles, className, ...img }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div role="img" aria-label={img.alt} className={cn("relative grid place-items-center overflow-hidden bg-muted", className)}>
        <Icon aria-hidden className="size-16 text-ink-neutral/40" strokeWidth={1.25} />
      </div>
    );
  }
  return <img {...img} onError={() => setFailed(true)} className={className} />;
}
