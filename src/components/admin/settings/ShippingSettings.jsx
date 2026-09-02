import { useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const blank = () => ({ name: "", regions: "", rate: "", free_shipping_threshold: "" });

export default function ShippingSettings({ setting, onSave }) {
  const [zones, setZones] = useState(setting.shipping_zones || []);
  const [saving, setSaving] = useState(false);

  const update = (i, k, v) => setZones((prev) => prev.map((z, idx) => (idx === i ? { ...z, [k]: v } : z)));
  const add = () => setZones((prev) => [...prev, blank()]);
  const remove = (i) => setZones((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        shipping_zones: zones.map((z) => ({
          name: z.name?.trim() || "",
          regions: (z.regions || "").split(",").map((r) => r.trim()).filter(Boolean),
          rate: Number(z.rate) || 0,
          free_shipping_threshold: z.free_shipping_threshold === "" ? null : Number(z.free_shipping_threshold),
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-muted-foreground">Define shipping zones, their rates, and free-shipping thresholds.</p>

      <div className="space-y-3">
        {zones.map((z, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Zone {i + 1}</span>
              <button onClick={() => remove(i)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remove zone">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Zone name</span>
                <Input value={z.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="Riyadh city" />
              </Label>
              <Label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Regions (comma separated)</span>
                <Input value={z.regions} onChange={(e) => update(i, "regions", e.target.value)} placeholder="Riyadh, Diriyah" />
              </Label>
              <Label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Rate</span>
                <Input type="number" value={z.rate} onChange={(e) => update(i, "rate", e.target.value)} placeholder="0.00" />
              </Label>
              <Label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Free shipping threshold (blank = none)</span>
                <Input type="number" value={z.free_shipping_threshold} onChange={(e) => update(i, "free_shipping_threshold", e.target.value)} placeholder="200" />
              </Label>
            </div>
          </div>
        ))}
        {zones.length === 0 && <p className="text-sm text-muted-foreground">No shipping zones yet.</p>}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" onClick={add}><Plus className="mr-2 h-4 w-4" /> Add zone</Button>
        <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save shipping"}</Button>
      </div>
    </div>
  );
}