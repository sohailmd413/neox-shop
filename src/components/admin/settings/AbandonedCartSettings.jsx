import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Admin abandoned-cart recovery configuration tab. Mirrors the other settings
// tabs: the parent (AdminSettings) owns the Setting record and persists via
// `onSave`.
export default function AbandonedCartSettings({ setting, onSave }) {
  const [f, setF] = useState(setting);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const num = (k, fallback = "") => (f[k] === undefined || f[k] === null || f[k] === "" ? fallback : f[k]);

  const Toggle = ({ on, onChange, title, desc }) => (
    <div className="flex items-center justify-between rounded-xl border border-border p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={`flex h-6 w-11 items-center rounded-full transition-colors ${on ? "bg-foreground" : "bg-muted-foreground/30"}`}
      >
        <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        abandoned_cart_recovery_enabled: f.abandoned_cart_recovery_enabled === true,
        abandoned_cart_delay_hours: Number(f.abandoned_cart_delay_hours) || 1,
        abandoned_cart_second_reminder_enabled: f.abandoned_cart_second_reminder_enabled === true,
        abandoned_cart_second_reminder_hours: Number(f.abandoned_cart_second_reminder_hours) || 24,
        abandoned_cart_discount_enabled: f.abandoned_cart_discount_enabled === true,
        abandoned_cart_discount_percent: Number(f.abandoned_cart_discount_percent) || 0,
        abandoned_cart_respect_opt_out: f.abandoned_cart_respect_opt_out === true,
      });
    } catch {
      /* toast handled by parent */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <Toggle
        on={f.abandoned_cart_recovery_enabled}
        onChange={(v) => set("abandoned_cart_recovery_enabled", v)}
        title="Enable abandoned-cart recovery"
        desc="When on, idle carts are flagged abandoned and recovery emails are sent on the hourly schedule."
      />

      <Label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Abandonment delay (hours)</span>
        <Input type="number" dir="ltr" value={num("abandoned_cart_delay_hours", 1)} onChange={(e) => set("abandoned_cart_delay_hours", e.target.value)} placeholder="1" />
        <span className="text-[11px] text-muted-foreground">How long a cart sits idle (no edits) before it's flagged abandoned and the first reminder is sent.</span>
      </Label>

      <Toggle
        on={f.abandoned_cart_second_reminder_enabled}
        onChange={(v) => set("abandoned_cart_second_reminder_enabled", v)}
        title="Send a second reminder"
        desc="A follow-up nudge after the delay below, with an optional discount incentive."
      />
      <Label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Second reminder delay (hours after first)</span>
        <Input type="number" dir="ltr" value={num("abandoned_cart_second_reminder_hours", 24)} onChange={(e) => set("abandoned_cart_second_reminder_hours", e.target.value)} placeholder="24" />
      </Label>

      <Toggle
        on={f.abandoned_cart_discount_enabled}
        onChange={(v) => set("abandoned_cart_discount_enabled", v)}
        title="Offer a discount on the second reminder"
        desc="Generates a single-use, 48-hour coupon for the percent below and includes it in the second email."
      />
      <Label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Discount percent</span>
        <Input type="number" dir="ltr" value={num("abandoned_cart_discount_percent", 10)} onChange={(e) => set("abandoned_cart_discount_percent", e.target.value)} placeholder="10" />
      </Label>

      <Toggle
        on={f.abandoned_cart_respect_opt_out}
        onChange={(v) => set("abandoned_cart_respect_opt_out", v)}
        title="Respect marketing opt-out"
        desc="Off by default — recovery emails are transactional (the customer started the cart), so they're sent regardless of marketing preference. Turn on to skip customers who opted out of marketing."
      />

      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save recovery"}
        </Button>
      </div>
    </div>
  );
}