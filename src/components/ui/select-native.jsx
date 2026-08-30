import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Styled native <select> with a custom chevron. The trigger is fully styled
 * with the app's design tokens; the open list itself is OS-rendered.
 */
const SelectNative = React.forwardRef(
  ({ className, rounded = "md", children, ...props }, ref) => {
    const roundedCls = rounded === "full" ? "rounded-full" : "rounded-md";
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "w-full appearance-none bg-background text-sm text-foreground",
            "border border-input px-3 py-2 outline-none transition-colors",
            "hover:border-foreground/30 focus:border-foreground/60 focus:ring-2 focus:ring-ring/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "pr-9",
            roundedCls,
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  }
);
SelectNative.displayName = "SelectNative";

export { SelectNative };