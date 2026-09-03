import React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Shared input styling for the whole auth flow: softly tinted background,
// larger radius, and a smooth brand-color focus ring (not the default
// browser outline). Left icon + right slot render consistently across
// Register / Login / Forgot / Reset.
const BASE =
  "h-12 rounded-xl bg-muted/40 border-input text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground/50 focus-visible:ring-2 focus-visible:ring-foreground/10 focus-visible:bg-background";

export default function AuthInput({
  leftIcon: LeftIcon,
  rightSlot,
  className,
  inputClassName,
  id,
  name,
  ...props
}) {
  return (
    <div className={cn("relative", className)}>
      {LeftIcon && (
        <LeftIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      )}
      <Input
        id={id}
        name={name || id}
        className={cn(BASE, LeftIcon && "pl-10", rightSlot && "pr-11", inputClassName)}
        {...props}
      />
      {rightSlot && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">{rightSlot}</div>
      )}
    </div>
  );
}