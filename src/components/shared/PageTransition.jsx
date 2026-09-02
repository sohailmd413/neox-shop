import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { pageVariants, motionPresets } from "@/lib/motion";

// Wraps storefront route content with a subtle fade+slide that respects
// prefers-reduced-motion (downgrades to a plain opacity fade). Used inside
// StorefrontLayout's <AnimatePresence mode="wait"> keyed by location.pathname.
export default function PageTransition({ children }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={reduce ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={reduce ? { duration: 0.15 } : motionPresets.page}
    >
      {children}
    </motion.div>
  );
}