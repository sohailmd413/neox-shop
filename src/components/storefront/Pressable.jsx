import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { springPress } from "@/lib/motion";

// CRED-style tactile wrapper: any Button/Link inside gets a spring scale-down on
// press. The inner element still owns the click — the tap spring is decorative,
// so functionality is never delayed. Respects prefers-reduced-motion.
export default function Pressable({ children, className = "", scale = 0.96 }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={`inline-flex ${className}`}
      whileTap={reduce ? undefined : { scale }}
      transition={springPress}
    >
      {children}
    </motion.span>
  );
}