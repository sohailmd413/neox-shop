import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import Dropzone from "@/components/admin/ui/Dropzone";

// Seasonal "category refresh" — apply one uploaded tile image to every
// selected category in a single bulk update, so seasonal artwork can be
// refreshed across the tree without editing each category individually.
export default function CategoryBulkImageDialog({ categories, onClose, onDone }) {
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const apply = async () => {
    if (!imageUrl) return;
    setSaving(true);
    try {
      await base44.entities.Category.bulkUpdate(categories.map((c) => ({ id: c.id, image_url: imageUrl })));
      onDone();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Refresh category images</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload one tile image and apply it to all {categories.length} selected {categories.length === 1 ? "category" : "categories"} at once — handy for seasonal artwork swaps.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5">
          <span className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">New tile image</span>
          <div className="mt-2"><Dropzone value={imageUrl} onChange={setImageUrl} hint="Recommended 400×400px, JPG/PNG" /></div>
        </div>

        <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-border bg-muted/30 p-2">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs font-medium">
                <ImageIcon className="h-3 w-3 text-muted-foreground" /> {c.name}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={apply} disabled={!imageUrl || saving} className="rounded-full">{saving ? "Applying…" : `Apply to ${categories.length}`}</Button>
        </div>
      </motion.div>
    </div>
  );
}