import React, { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";

// Searchable, hierarchical parent picker. Items are indented by depth.
export default function ParentCombobox({ value, onChange, categories, excludeId }) {
  const [open, setOpen] = useState(false);

  const build = (parentId = null, depth = 0) =>
    categories
      .filter((c) => (c.parent_id || null) === parentId && c.id !== excludeId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .flatMap((c) => [{ id: c.id, name: c.name, depth }, ...build(c.id, depth + 1)]);

  const flat = build();
  const selected = categories.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-9 w-full justify-between font-normal">
          {selected ? selected.name : "— Top level —"}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search category…" />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => { onChange(""); setOpen(false); }} className="gap-2">
                <Check className={`h-4 w-4 ${!value ? "opacity-100" : "opacity-0"}`} />
                — Top level —
              </CommandItem>
              {flat.map((c) => (
                <CommandItem key={c.id} value={c.name} onSelect={() => { onChange(c.id); setOpen(false); }} className="gap-2">
                  <Check className={`h-4 w-4 ${value === c.id ? "opacity-100" : "opacity-0"}`} />
                  <span style={{ paddingLeft: c.depth * 14 }} className="line-clamp-1">{c.depth > 0 ? "↳ " : ""}{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}