import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Auto-growing textarea for the support composer. Starts at a compact single
// line and expands with content up to maxHeight, then switches to internal
// scroll. Smooth CSS height transition; buttons stay bottom-aligned outside.
export default function AutoGrowTextarea({
  value,
  onChange,
  className,
  maxHeight = 168,
  minHeight = 44,
  ...props
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  }, [value, maxHeight]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      dir="auto"
      className={cn(
        "w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm shadow-sm transition-[height] duration-150 ease-out placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{ minHeight }}
      {...props}
    />
  );
}