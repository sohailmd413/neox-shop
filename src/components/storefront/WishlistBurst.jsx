import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";

// Lightweight heart-particle burst radiating outward from the wishlist icon
// when an item is added. Fires once on the rising edge of `trigger` (false →
// true), 5 small hearts drifting outward over ~600ms. Respects
// prefers-reduced-motion (renders nothing → the existing simple pop stays).
// Mounted inside the heart button, which is positioned so the absolute fill
// anchors to it.
const PARTICLES = 5;
const RADIUS = 18;

export default function WishlistBurst({ trigger }) {
  const reduce = useReducedMotion();
  const prev = useRef(trigger);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const wasOff = prev.current;
    prev.current = trigger;
    if (trigger && !wasOff && !reduce) {
      setBurst((b) => b + 1);
      const id = setTimeout(() => setBurst(0), 650);
      return () => clearTimeout(id);
    }
  }, [trigger, reduce]);

  if (reduce) return null;

  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      <AnimatePresence>
        {burst > 0 && (
          <span key={burst} className="relative">
            {Array.from({ length: PARTICLES }).map((_, i) => {
              const angle = (Math.PI * 2 * i) / PARTICLES - Math.PI / 2;
              return (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5"
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                  animate={{ x: Math.cos(angle) * RADIUS, y: Math.sin(angle) * RADIUS, opacity: 0, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                </motion.span>
              );
            })}
          </span>
        )}
      </AnimatePresence>
    </span>
  );
}