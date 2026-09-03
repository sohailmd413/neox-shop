import React from "react";

// Minimal "OR" divider: a thin line, generous letter-spacing, muted label —
// reused identically across Register and Login so the auth flow feels cohesive.
export default function AuthDivider({ label = "or" }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border/70" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}