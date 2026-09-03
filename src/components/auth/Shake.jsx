import React from "react";
import { motion } from "framer-motion";

// Jiggle wrapper for failed validation. Re-keying `shakeKey` (e.g. incrementing
// a counter on each submit failure) remounts and replays the shake once,
// drawing the eye to the form without a page reload.
export default function Shake({ shakeKey, children, className }) {
  return (
    <motion.div
      key={shakeKey}
      className={className}
      initial={false}
      animate={shakeKey > 0 ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}