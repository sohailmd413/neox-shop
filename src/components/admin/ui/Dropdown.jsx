import React, { useMemo, useState } from "react";
import { Check, ChevronDown, X, Loader2, FolderTree, Layers, Inbox } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

/**
 * Unified admin dropdown.
 * props:
 *  - options: [{ label, value, icon?, parentId?, disabled?, group? }]
 *  - value: string | string[] | undefined
 *  - onChange: (next) => void  (string for single variants; string[] for multi)
 *  - type: "select" | "search" | "multi" | "tree"
 *  - placeholder, loading, emptyText, clearable
 *  - className (trigger width), panelClassName, contentMaxHeight
 */
export default function Dropdown({
  options = [],
  value,
  onChange,
  type = "select",
  placeholder = "Select…",
  loading = false,
  emptyText = "No results found.",
  clearable = false,
  className = "",
  panelClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const multi = type === "multi";
  const searchable = type === "search" || type === "multi" || type === "tree";

  const optByVal = useMemo(() => {
    const m = new Map();
    options.forEach((o) => m.set(o.value, o));
    return m;
  }, [options]);

  // Tree helpers
  const tree = useMemo(() => {
    if (type !== "tree") return null;
    const childrenOf = (parentId) => options.filter((o) => (o.parent_id || o.parentId || null) === parentId);
    const build = (parentId, depth, out) => {
      childrenOf(parentId).forEach((o) => {
        out.push({ ...o, _depth: depth });
        build(o.id || o.value, depth + 1, out);
      });
      return out;
    };
    return build(null, 0, []);
  }, [options, type]);

  const pathLabel = (val) => {
    if (type !== "tree") return optByVal.get(val)?.label ?? val;
    const parts = [];
    let cur = optByVal.get(val);
    while (cur) {
      parts.unshift(cur.label);
      const pid = cur.parent_id || cur.parentId;
      cur = pid ? optByVal.get(pid) : null;
    }
    return parts.join(" / ");
  };

  const isSel = (v) => (multi ? Array.isArray(value) && value.includes(v) : value === v);

  const triggerLabel = () => {
    if (loading) return null;
    if (multi) return null; // chips (with placeholder) render in the block below
    if (value === undefined || value === "" || value === null) return placeholder;
    return pathLabel(value) ?? placeholder;
  };

  const selectOne = (v) => {
    if (multi) {
      const cur = Array.isArray(value) ? value : [];
      onChange(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
    } else {
      onChange(v);
      setOpen(false);
    }
  };

  const removeChip = (v, e) => {
    e?.stopPropagation();
    onChange((Array.isArray(value) ? value : []).filter((x) => x !== v));
  };

  const clear = (e) => {
    e?.stopPropagation();
    onChange(multi ? [] : "");
    setOpen(false);
  };

  const renderList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      );
    }
    return (
      <Command loop shouldFilter={searchable}>
        {searchable && (
          <CommandInput placeholder={type === "tree" ? "Search categories…" : "Search…"} autoFocus />
        )}
        <CommandList>
          <CommandEmpty>
            <span className="inline-flex flex-col items-center gap-1.5 py-2 text-muted-foreground">
              <Inbox className="h-5 w-5" /> {emptyText}
            </span>
          </CommandEmpty>
          {type === "tree" && tree ? (
            <CommandGroup>
              {tree.map((o) => {
                const Icon = o.icon || (o._depth === 0 ? FolderTree : Layers);
                return (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    disabled={o.disabled}
                    onSelect={() => !o.disabled && selectOne(o.value)}
                    data-disabled={o.disabled}
                  >
                    <span className="flex items-center gap-2" style={{ paddingLeft: o._depth * 14 }}>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className={cn(o._depth === 0 && "font-medium")}>{o.label}</span>
                    </span>
                    {isSel(o.value) && <Check className="ml-auto h-4 w-4" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ) : (
            <CommandGroup>
              {options.map((o) => {
                const Icon = o.icon;
                return (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    disabled={o.disabled}
                    onSelect={() => !o.disabled && selectOne(o.value)}
                    data-disabled={o.disabled}
                  >
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <span>{o.label}</span>
                    {isSel(o.value) && <Check className="ml-auto h-4 w-4" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={loading && !options.length}
          className={cn(
            "flex min-h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm shadow-sm transition-colors",
            "hover:border-foreground/30 focus:border-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          {triggerLabel() !== null && (
            <span className={cn("flex-1 truncate", (value === "" || value === undefined || value === null || (multi && !value?.length)) && "text-muted-foreground")}>
              {triggerLabel()}
            </span>
          )}
          {multi && (
            <span className="flex flex-1 flex-wrap items-center gap-1">
              {Array.isArray(value) && value.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {optByVal.get(v)?.label ?? v}
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => removeChip(v, e)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {(!value || value.length === 0) && <span className="text-muted-foreground">{placeholder}</span>}
            </span>
          )}
          {clearable && !multi && value && (
            <X onClick={clear} className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground" />
          )}
          <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0", panelClassName)} align="start">
        {renderList()}
      </PopoverContent>
    </Popover>
  );
}