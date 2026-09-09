import React from "react";
import Reveal from "@/components/storefront/Reveal";
import { tokens } from "@/lib/theme";

// Page-section wrapper with shared shell + spacing token + scroll reveal, and
// a `tone` prop to alternate section backgrounds for visual rhythm:
//   default — transparent (sits on the page white background)
//   muted   — warm light gray (bg-stone-50)
//   dark    — brand navy, reversed (light text) — use for deliberate breaks
export default function SectionShell({
  children,
  className = "",
  delay = 0,
  as = "section",
  spacing = "default",
  tone = "default",
}) {
  const pad =
    spacing === "tight"
      ? tokens.spacing.sectionTight
      : spacing === "loose"
      ? tokens.spacing.sectionLoose
      : tokens.spacing.section;
  const toneBg =
    tone === "muted"
      ? "bg-stone-50"
      : tone === "dark"
      ? "bg-brand-navy text-white"
      : "";
  return (
    <Reveal as={as} delay={delay} className={`${toneBg} ${tokens.section.shell} ${pad} ${className}`}>
      {children}
    </Reveal>
  );
}