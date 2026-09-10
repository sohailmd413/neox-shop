import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Interactive star rating selector. Pass `value` + `onChange` for an editable
// 1–5 picker (hover preview + tap to set); pass `readOnly` for a static display
// of the filled/hollow stars. `size` is a Tailwind class for each star.
export default function StarRating({ value = 0, onChange, size = "h-5 w-5", readOnly = false, className = "" }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  if (readOnly) {
    return (
      <div className={cn("flex", className)} aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n}>
            <Star className={cn(size, n <= value ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30")} />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex", className)} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => setHover(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="transition-transform hover:scale-110"
        >
          <Star className={cn(size, n <= display ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30")} />
        </button>
      ))}
    </div>
  );
}