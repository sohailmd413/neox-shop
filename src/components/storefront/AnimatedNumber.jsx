import React, { useEffect, useState } from "react";
import { useMotionValue, animate, useReducedMotion } from "framer-motion";

// Smoothly rolls a number toward `value` whenever it changes (cart totals,
// checkout summary). Uses framer-motion's imperative `animate`, so no extra
// dependency. Reduced-motion users see an instant swap.
export default function AnimatedNumber({ value, format = (v) => v, className = "" }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    if (mv.get() === value) {
      setDisplay(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.5, ease: "easeOut" });
    const unsub = mv.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);

  return <span className={className}>{format(display)}</span>;
}