import React from "react";
import Reveal from "@/components/storefront/Reveal";
import { tokens } from "@/lib/theme";

// Page-section wrapper: applies the shared max-width shell + a consistent
// vertical-spacing token, and wraps content in the reusable <Reveal> so every
// section gets the same scroll-reveal entrance. Use this for every storefront
// block instead of re-styling `<section className="mx-auto max-w-7xl …">` per
// page. `spacing` picks a spacing token; `as` controls the semantic tag.
export default function SectionShell({
  children,
  className = "",
  delay = 0,
  as = "section",
  spacing = "default",
}) {
  const pad =
    spacing === "tight"
      ? tokens.spacing.sectionTight
      : spacing === "loose"
      ? tokens.spacing.sectionLoose
      : tokens.spacing.section;
  return (
    <Reveal as={as} delay={delay} className={`${tokens.section.shell} ${pad} ${className}`}>
      {children}
    </Reveal>
  );
}