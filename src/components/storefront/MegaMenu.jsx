import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { lf } from "@/lib/format";

// Mega-menu panel: the live category tree (parents + their children) laid out
// in responsive columns. Pulls from the actual Categories admin data so it
// never drifts out of sync with a hardcoded list.
export default function MegaMenu({ categories = [], lang, onNavigate }) {
  const tops = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const childrenOf = (id) => categories.filter((c) => c.parent_id === id);

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 lg:grid-cols-4">
      {tops.map((parent) => (
        <div key={parent.id}>
          <Link
            to={`/shop?category=${encodeURIComponent(parent.name)}`}
            onClick={onNavigate}
            className="block text-sm font-semibold text-foreground transition-colors hover:text-deal"
          >
            {lf(parent, "name", lang)}
          </Link>
          <ul className="mt-2 space-y-1.5">
            {childrenOf(parent.id).map((s) => (
              <li key={s.id}>
                <Link
                  to={`/shop?category=${encodeURIComponent(s.name)}`}
                  onClick={onNavigate}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {lf(s, "name", lang)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}