import React, { useState } from "react";
import { X } from "lucide-react";

// Freeform tag chips input. Add on Enter or comma, remove via the chip X or
// Backspace on an empty draft. Used for the Product `tags` field (cross-cutting
// labels for search & curation beyond the category hierarchy).
export default function TagsInput({ value = [], onChange, placeholder = "Add a tag and press Enter" }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  const remove = (t) => onChange(value.filter((x) => x !== t));

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 focus-within:border-foreground/40">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {t}
          <button type="button" onClick={() => remove(t)} className="text-muted-foreground hover:text-foreground" aria-label={`Remove ${t}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
          else if (e.key === "Backspace" && !draft && value.length) { remove(value[value.length - 1]); }
        }}
        onBlur={add}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
      />
    </div>
  );
}