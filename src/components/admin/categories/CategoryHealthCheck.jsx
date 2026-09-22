import React, { useState } from "react";
import { ChevronDown, PackageX, ImageIcon, Languages, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

// Category health check — a lightweight diagnostic surfacing categories that
// need attention: empty (zero products), missing a tile image, or missing
// Arabic translation. The Arabic check deliberately links to the existing
// Translations dashboard instead of duplicating its workflow.
export default function CategoryHealthCheck({ categories, products }) {
  const [open, setOpen] = useState(false);

  const empty = categories.filter((c) => !products.some((p) => p.category === c.name));
  const noImage = categories.filter((c) => !c.image_url);
  const noArabic = categories.filter(
    (c) => !c.name_ar || !String(c.name_ar).trim() || !c.description_ar || !String(c.description_ar).trim()
  );
  const issueCount = empty.length + noImage.length + noArabic.length;

  return (
    <div className="rounded-2xl border border-border bg-background">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Health check</span>
          {issueCount > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{issueCount} issue{issueCount > 1 ? "s" : ""}</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" /> All good</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-3">
          <HealthSection icon={PackageX} tone="text-orange-500" title="Empty categories" items={empty} hint="Confirm these are intentional or archive them." />
          <HealthSection icon={ImageIcon} tone="text-amber-600" title="No tile image" items={noImage} hint="An image is required before submitting for approval." />
          <HealthSection
            icon={Languages}
            tone="text-violet-600"
            title="Missing Arabic"
            items={noArabic}
            hint="Complete these in the Translations dashboard."
            footer={<Link to="/admin/translations" className="text-xs font-medium text-foreground hover:underline">Open Translations →</Link>}
          />
        </div>
      )}
    </div>
  );
}

function HealthSection({ icon: Icon, tone, title, items, hint, footer }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone}`} />
        <span className="text-sm font-medium">{title}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">None.</p>
      ) : (
        <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
          {items.map((c) => (
            <li key={c.id} className="truncate text-xs text-muted-foreground" title={c.name}>{c.name}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground/80">{hint}</p>
      {footer}
    </div>
  );
}