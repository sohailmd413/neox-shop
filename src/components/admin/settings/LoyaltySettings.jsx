import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Admin loyalty configuration tab. Mirrors the other settings tabs: the parent
// (AdminSettings) owns the Setting record and persists via `onSave`.
export default function LoyaltySettings({ setting, onSave }) {
  const [f, setF] = useState(setting);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const num = (k, fallback = "") => (f[k] === undefined || f[k] === null ? fallback : f[k]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        loyalty_program_enabled: f.loyalty_program_enabled === true,
        loyalty_points_per_currency_unit: Number(f.loyalty_points_per_currency_unit) || 0,
        loyalty_redeem_points: Number(f.loyalty_redeem_points) || 0,
        loyalty_redeem_amount: Number(f.loyalty_redeem_amount) || 0,
        loyalty_expiry_days: f.loyalty_expiry_days === "" || f.loyalty_expiry_days == null ? null : Number(f.loyalty_expiry_days),
      });
    } catch {
      /* toast handled by parent */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <p className="text-sm font-medium">Enable loyalty program</p>
          <p className="text-xs text-muted-foreground">When off, customers can't earn or redeem points and the account Loyalty tab is hidden.</p>
        </div>
        <button
          type="button"
          onClick={() => set("loyalty_program_enabled", !f.loyalty_program_enabled)}
          className={`flex h-6 w-11 items-center rounded-full transition-colors ${f.loyalty_program_enabled ? "bg-foreground" : "bg-muted-foreground/30"}`}
        >
          <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${f.loyalty_program_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Currency spent per 1 point</span>
          <Input type="number" dir="ltr" value={num("loyalty_points_per_currency_unit")} onChange={(e) => set("loyalty_points_per_currency_unit", e.target.value)} placeholder="10" />
        </Label>
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Points per redemption unit</span>
          <Input type="number" dir="ltr" value={num("loyalty_redeem_points")} onChange={(e) => set("loyalty_redeem_points", e.target.value)} placeholder="100" />
        </Label>
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Discount per redemption unit (SAR)</span>
          <Input type="number" dir="ltr" value={num("loyalty_redeem_amount")} onChange={(e) => set("loyalty_redeem_amount", e.target.value)} placeholder="5" />
        </Label>
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Points expiry (days, blank = never)</span>
          <Input type="number" dir="ltr" value={num("loyalty_expiry_days")} onChange={(e) => set("loyalty_expiry_days", e.target.value)} placeholder="365" />
        </Label>
      </div>

      <p className="rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        Points are earned on the order merchandise subtotal <strong>after discounts</strong>, excluding tax and shipping, once an order is marked Delivered.
      </p>

      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save loyalty"}
        </Button>
      </div>
    </div>
  );
}