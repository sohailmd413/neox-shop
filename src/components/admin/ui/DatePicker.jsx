import React, { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const toInput = (d) => {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const fromInput = (v) => {
  if (!v) return undefined;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};

// Popover + react-day-picker calendar used in the admin filter bars. Accepts
// and returns a yyyy-mm-dd string so it drops into existing filter state.
export default function DatePicker({ value, onChange, placeholder = "Pick a date", disabled, className }) {
  const [open, setOpen] = useState(false);
  const selected = fromInput(value);
  const label = selected ? selected.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm transition-colors hover:border-foreground/30 focus:outline-none focus-visible:border-foreground/60 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={cn("flex-1 truncate", !value && "text-muted-foreground")}>{label || placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => { onChange(toInput(d)); setOpen(false); }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}