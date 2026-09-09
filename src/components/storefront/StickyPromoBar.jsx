import React, { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useActiveBanners } from "@/hooks/useActiveBanners";
import { useBannerRotation } from "@/hooks/useBannerRotation";
import { lf } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Top announcement bar that rotates short promotional messages from Posters
// in the sticky_bar zone, on the same timer logic as the image carousels
// (animation_speed → seconds). Slim, dismissible for the session (the layout
// stays mounted across route changes, so the dismiss persists). Renders
// nothing when no live banners exist.
export default function StickyPromoBar() {
  const { lang } = useLanguage();
  const { live } = useActiveBanners("home", "sticky_bar");
  const [dismissed, setDismissed] = useState(false);
  const rot = useBannerRotation(live);

  if (dismissed || !live || live.length === 0) return null;

  const cur = live[rot.index];
  const text = lf(cur, "tagline", lang);

  return (
    <div className="bg-brand-navy text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2">
        <motion.span
          key={rot.index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 truncate text-center text-xs font-medium sm:text-sm"
        >
          {text}
        </motion.span>
        {live.length > 1 && (
          <div className="flex shrink-0 items-center gap-1.5">
            {live.map((b, i) => (
              <button
                key={b.id}
                onClick={() => rot.goto(i)}
                aria-label={`Message ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === rot.index ? "w-4 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        )}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}