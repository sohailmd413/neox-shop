import React from "react";
import { cn } from "@/lib/utils";

const speedSec = { slow: 14, medium: 9, fast: 5 };

export function isLight(hex) {
  if (!hex) return true;
  const c = hex.replace("#", "");
  if (c.length < 6) return true;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

export function PosterTagline({ text, p, color, weight, fs, align }) {
  const anim = p.animation || "none";
  const sec = speedSec[p.animation_speed] || 9;
  const base = { color, fontWeight: weight, fontSize: fs, textAlign: align, lineHeight: 1.2, fontFamily: "var(--font-display)" };

  if (anim === "marquee") {
    return (
      <div className="overflow-hidden" style={{ textAlign: "left" }}>
        <div
          className="flex whitespace-nowrap will-change-transform mf-anim"
          style={{
            animation: `mf-marquee ${sec * 2}s linear infinite`,
            animationDirection: p.animation_direction === "right" ? "reverse" : "normal",
          }}
        >
          <span style={{ ...base, paddingRight: "2.5rem" }}>{text}</span>
          <span style={{ ...base, paddingRight: "2.5rem" }}>{text}</span>
        </div>
      </div>
    );
  }
  if (anim === "fade") {
    return <span className="inline-block mf-anim" style={{ ...base, animation: `mf-fade ${Math.max(2, sec / 2)}s ease-in-out infinite` }}>{text}</span>;
  }
  if (anim === "slide") {
    return <span className="inline-block mf-anim" style={{ ...base, animation: `mf-slide-l ${Math.max(2, sec / 2)}s ease-out infinite` }}>{text}</span>;
  }
  if (anim === "typewriter") {
    return (
      <span
        className="inline-block overflow-hidden whitespace-nowrap mf-anim"
        style={{
          ...base,
          animation: `mf-type ${Math.max(2, sec / 2)}s steps(${Math.max(6, text.length)}, end) infinite alternate`,
          borderRight: "2px solid currentColor",
        }}
      >
        {text}
      </span>
    );
  }
  return <span style={base}>{text}</span>;
}

export default function PosterPreview({ poster, device = "desktop" }) {
  const p = poster || {};
  const isMobile = device === "mobile";
  const img = isMobile ? p.image_mobile_url || p.image_url : p.image_url;
  const tagline = p.tagline || "";
  const color = p.font_color || "#ffffff";
  const weight = p.font_weight === "normal" ? "normal" : "bold";
  const fs = p.font_size ? `${Math.max(10, p.font_size)}px` : isMobile ? "13px" : "20px";
  const align = p.text_align || "center";
  const just = p.text_position === "top" ? "items-start" : p.text_position === "bottom" ? "items-end" : "items-center";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg border border-border bg-muted",
        isMobile ? "aspect-[4/5] max-h-[420px]" : "aspect-[16/5]"
      )}
    >
      {img ? (
        <img src={img} alt={p.alt_text || p.title || ""} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">No image</div>
      )}
      <div className={cn("absolute inset-0 flex flex-col px-3 py-2", just)}>
        <div className={cn("w-full", p.strip_bg && "rounded-md bg-black/45 px-2 py-1")}>
          {tagline && <PosterTagline text={tagline} p={p} color={color} weight={weight} fs={fs} align={align} />}
          {p.cta_text && (
            <div style={{ textAlign: align }} className="mt-2">
              <span
                className="inline-block rounded-md px-3 py-1 text-xs font-semibold"
                style={{ background: p.cta_color || "#111111", color: isLight(p.cta_color) ? "#111" : "#fff" }}
              >
                {p.cta_text}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}