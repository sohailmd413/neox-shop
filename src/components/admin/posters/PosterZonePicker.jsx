import React from "react";
import { cn } from "@/lib/utils";
import { ZONES } from "./posterConfig";

// Schematic coordinates (percentages) of each zone inside the page wireframe.
const COORDS = {
  hero: { top: "6%", left: "5%", width: "90%", height: "15%" },
  secondary: { top: "24%", left: "5%", width: "90%", height: "7%" },
  mid_strip: { top: "36%", left: "5%", width: "64%", height: "7%" },
  sidebar: { top: "36%", left: "73%", width: "22%", height: "30%" },
  grid_interstitial: { top: "62%", left: "5%", width: "64%", height: "9%" },
  footer: { top: "83%", left: "5%", width: "90%", height: "6%" },
  popup: { top: "38%", left: "30%", width: "40%", height: "28%" },
  sticky_bar: { top: "73%", left: "5%", width: "90%", height: "8%" },
};

const LABELS = {
  hero: "Hero",
  secondary: "Secondary",
  sidebar: "Sidebar",
  mid_strip: "Mid strip",
  grid_interstitial: "Grid",
  footer: "Footer",
  popup: "Popup",
  sticky_bar: "Sticky",
};

export default function PosterZonePicker({ value, onChange }) {
  return (
    <div>
      <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/50" style={{ height: 260 }}>
        {/* faint "main content" filler */}
        <div className="absolute left-[5%] top-[46%] h-[14%] w-[64%] rounded-md border border-dashed border-border bg-background/40" />
        <div className="absolute left-[5%] top-[62%] h-[9%] w-[64%] rounded-md border border-dashed border-border bg-background/40" />
        {ZONES.map((z) => {
          const c = COORDS[z.id];
          if (!c) return null;
          const sel = value === z.id;
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => onChange(z.id)}
              title={z.label}
              className={cn(
                "absolute flex items-center justify-center rounded-md border px-1 text-center text-[10px] font-medium transition-all",
                sel
                  ? "z-10 border-primary bg-primary/15 text-primary ring-2 ring-primary"
                  : "z-0 border-border bg-background/80 text-muted-foreground hover:border-foreground/40 hover:bg-background"
              )}
              style={c}
            >
              {LABELS[z.id]}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">Click a zone to place the banner. Selected zone is highlighted.</p>
    </div>
  );
}