import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { motionPresets } from "@/lib/motion";
import { Check, ChevronDown, X, Loader2, FolderTree, Layers, Inbox } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Unified admin dropdown. One component, four interchangeable variants:
 *   type="select"  StandardSelect  — trigger + list, type-ahead, no search input
 *   type="search"  SearchableSelect — search input live-filters options
 *   type="multi"   MultiSelectChips — selected values shown as removable chips
 *   type="tree"    TreeSelect — nested, indented options for hierarchical data
 *
 * Option shape (shared by all variants): { label, value, icon?, parentId?|parent_id?, disabled? }
 *
 * Behavior:
 *  - Click-outside / Escape closes (Popover/Drawer + Command handle this)
 *  - Arrow Up/Down navigates, Enter selects, type-ahead jump (cmdk provides these)
 *  - `loading` renders a skeleton state inside the panel
 *  - `disabled` greys the trigger and blocks opening
 *  - framer-motion open (fade + scale 0.97 → 1, 150ms); 180° chevron rotation
 *  - On mobile (<768px) the panel renders as a vaul bottom sheet with ≥44px rows
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
  disabled = false,
  size = "default",
  bare = false,
  sheet = true,
  className = "",
  panelClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const multi = type === "multi";
  const searchable = type === "search" || type === "multi" || type === "tree";
  const useSheet = sheet && !bare && isMobile;

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
    if (multi) return null; // chips + placeholder rendered separately
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

  const renderList = (mobile = false) => {
    if (loading) {
      return (
        <div className="p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2 py-2.5">
              <div className="h-4 w-4 shrink-0 rounded-full bg-muted animate-pulse" />
              <div className="h-3 flex-1 rounded bg-muted animate-pulse" style={{ width: `${60 + ((i * 7) % 35)}%` }} />
            </div>
          ))}
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        </div>
      );
    }
    const itemCls = mobile ? "min-h-[44px] py-2.5" : "py-2";
    return (
      <Command loop shouldFilter={searchable}>
        {searchable && (
          <CommandInput placeholder={type === "tree" ? "Search categories…" : "Search…"} autoFocus={!mobile} />
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
                    className={itemCls}
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
                    className={itemCls}
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

  const triggerClass = bare
    ? cn(
        "inline-flex h-auto w-auto items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        disabled && "cursor-not-allowed opacity-50",
        className
      )
    : cn(
        "flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm shadow-sm transition-colors hover:border-foreground/30 focus:outline-none focus-visible:border-foreground/60 focus-visible:ring-2 focus-visible:ring-ring/30",
        size === "sm" ? "min-h-8" : "min-h-9",
        disabled && "cursor-not-allowed opacity-50",
        className
      );

  const renderTrigger = (extra) => (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      disabled={disabled}
      className={triggerClass}
      {...extra}
    >
      {triggerLabel() !== null && (
        <span
          className={cn(
            "flex-1 truncate",
            (value === "" || value === undefined || value === null || (multi && !value?.length)) && "text-muted-foreground"
          )}
        >
          {triggerLabel()}
        </span>
      )}
      {multi && (
        <span className="flex flex-1 flex-wrap items-center gap-1">
          {Array.isArray(value) &&
            value.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                {optByVal.get(v)?.label ?? v}
                {!disabled && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => removeChip(v, e)}
                    className="text-muted-foreground transition-transform duration-150 hover:scale-110 hover:text-foreground"
                    aria-label={`Remove ${optByVal.get(v)?.label ?? v}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          {(!value || value.length === 0) && <span className="text-muted-foreground">{placeholder}</span>}
        </span>
      )}
      {clearable && !multi && value && !disabled && (
        <X onClick={clear} className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground" />
      )}
      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180", multi && "ml-auto")} />
    </button>
  );

  if (useSheet) {
    return (
      <>
        {renderTrigger({ onClick: disabled ? undefined : () => setOpen(true) })}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85vh]">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-muted" />
            <div className="px-2 pb-6">{renderList(true)}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? () => {} : setOpen}>
      <PopoverTrigger asChild>{renderTrigger()}</PopoverTrigger>
      <PopoverContent className={cn("min-w-[200px] p-0", panelClassName)} align="start" collisionPadding={8}>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={motionPresets.panel}
          style={{ width: "var(--radix-popover-trigger-width)" }}
          className="origin-[var(--radix-popover-content-transform-origin)]"
        >
          {renderList(false)}
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}