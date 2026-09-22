import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Admin alerts configuration tab. Owns the price-drop threshold; back-in-stock
// has no toggle (it's always on — customers opt in per product). The parent
// (AdminSettings) owns the Setting record and persists via `onSave`.
export default function AlertsSettings({ setting, onSave }) {
  const [f, setF] = useState(setting);
  const [saving, setSaving] = useState(false);
  const num = (k, fb = "") => (f[k] === undefined || f[k] === null ? fb : f[k]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        price_drop_threshold_percent: Number(f.price_drop_threshold_percent) || 5,
        low_stock_urgency_threshold: Number(f.low_stock_urgency_threshold) || 5,
      });
    } catch { /* toast handled by parent */ } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <Label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Price-drop alert threshold (%)</span>
        <Input type="number" dir="ltr" min={1} max={100} value={num("price_drop_threshold_percent", 5)} onChange={(e) => setF((p) => ({ ...p, price_drop_threshold_percent: e.target.value }))} placeholder="5" />
      </Label>
      <p className="rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        A wishlist item only triggers a price-drop email when its price falls by at least this percentage below the price when it was added (or the last price the customer was alerted about). Prevents notification spam from trivial price changes.
      </p>
      <Label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Low-stock urgency threshold (units)</span>
        <Input type="number" dir="ltr" min={1} value={num("low_stock_urgency_threshold", 5)} onChange={(e) => setF((p) => ({ ...p, low_stock_urgency_threshold: e.target.value }))} placeholder="5" />
      </Label>
      <p className="rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        When a product's real inventory is at or below this number, its stock badge shows "Only N left in stock" instead of the plain "In stock" indicator. Reflects live inventory only — there is no manual urgency flag, since fabricated scarcity is a deceptive practice.
      </p>
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save alerts"}</Button>
      </div>
    </div>
  );
}