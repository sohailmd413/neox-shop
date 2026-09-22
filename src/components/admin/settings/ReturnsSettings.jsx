import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Admin returns configuration tab. Mirrors the other settings tabs: the parent
// (AdminSettings) owns the Setting record and persists via `onSave`.
export default function ReturnsSettings({ setting, onSave }) {
  const [f, setF] = useState(setting);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const num = (k, fb = "") => (f[k] === undefined || f[k] === null ? fb : f[k]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        return_window_days: Number(f.return_window_days) || 30,
        refund_on_approval: f.refund_on_approval === true,
        return_shipping_instructions: (f.return_shipping_instructions || "").toString(),
      });
    } catch { /* toast handled by parent */ } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Return window (days after delivery)</span>
          <Input type="number" dir="ltr" value={num("return_window_days", 30)} onChange={(e) => set("return_window_days", e.target.value)} placeholder="30" />
        </Label>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <p className="text-sm font-medium">Refund on approval</p>
          <p className="text-xs text-muted-foreground">When off (default), the admin must mark the returned item as received before a refund can be processed. When on, refunds can be issued immediately after approval.</p>
        </div>
        <button type="button" onClick={() => set("refund_on_approval", !f.refund_on_approval)} className={`flex h-6 w-11 items-center rounded-full transition-colors ${f.refund_on_approval ? "bg-foreground" : "bg-muted-foreground/30"}`}>
          <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${f.refund_on_approval ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      <Label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Return shipping instructions (shown to the customer on approval)</span>
        <Textarea rows={4} value={num("return_shipping_instructions", "")} onChange={(e) => set("return_shipping_instructions", e.target.value)} placeholder="Ship the item(s) to: NeoX Shop, Returns Dept, 123 Commerce St, Riyadh." />
      </Label>

      <p className="rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">Refund amount = the returned items' paid price <strong>after their proportional share of any applied discount</strong> (coupon / loyalty). Tax and shipping are not refunded. The coupon discount itself is not refunded.</p>

      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save returns"}</Button>
      </div>
    </div>
  );
}