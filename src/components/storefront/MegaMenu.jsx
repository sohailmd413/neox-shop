import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { lf } from "@/lib/format";

// Mega-menu panel: the live category tree (parents + children) read from the
// Categories admin. Parents are collapsed by default; click a parent's
// chevron to expand its children inline with a smooth height animation
// (multiple can be open at once, so shoppers can compare). Layout is an
// auto-filling responsive grid that reflows as categories are added/removed.
export default function MegaMenu({ categories = [], lang, onNavigate }) {
  const tops = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const childrenOf = (id) => categories.filter((c) => c.parent_id === id);
  const [open, setOpen] = useState(() => new Set());
  const toggle = (id) => setOpen((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div className="grid max-h-[70vh] grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-5 gap-y-1 overflow-y-auto pr-1">
      {tops.map((parent) => {
        const subs = childrenOf(parent.id);
        const isOpen = open.has(parent.id);
        return (
          <div key={parent.id} className="border-b border-border/50 py-1.5">
            <div className="flex items-center gap-1">
              <Link
                to={`/shop?category=${encodeURIComponent(parent.name)}`}
                onClick={onNavigate}
                className="flex-1 truncate text-sm font-semibold text-foreground transition-colors hover:text-deal"
              >
                {lf(parent, "name", lang)}
              </Link>
              {subs.length > 0 && (
                <button
                  onClick={() => toggle(parent.id)}
                  aria-label="Toggle sub-categories"
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
            <AnimatePresence initial={false}>
              {isOpen && subs.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <ul className="space-y-1.5 py-2 ps-3">
                    {subs.map((s) => (
                      <li key={s.id}>
                        <Link
                          to={`/shop?category=${encodeURIComponent(s.name)}`}
                          onClick={onNavigate}
                          className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {lf(s, "name", lang)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}