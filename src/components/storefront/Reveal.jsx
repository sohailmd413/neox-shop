import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { motionPresets } from "@/lib/motion";

// Scroll-triggered fade+slide-up. Used to elevate Home sections as the user
// scrolls. `as` lets it render a semantic <section> / <div>. Reduced-motion
// users get a plain opacity fade (no movement). `once` so it only plays in.
export default function Reveal({ as = "div", children, className = "", delay = 0 }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ ...motionPresets.card, delay }}
      className={className}
    >
      {children}
    </Tag>
  );
}