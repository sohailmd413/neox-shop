import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPES = [
  { value: "loyalty_points", label: "Loyalty points" },
  { value: "coupon", label: "Discount coupon" },
];

// Admin referral configuration tab. Mirrors the other settings tabs: the
// parent (AdminSettings) owns the Setting record and persists via `onSave`.
export default function ReferralSettings({ setting, onSave }) {
  const [f, setF] = useState(setting);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const num = (k, fb = "") => (f[k] === undefined || f[k] === null ? fb : f[k]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        referral_program_enabled: f.referral_program_enabled === true,
        referrer_reward_type: f.referrer_reward_type || "loyalty_points",
        referrer_reward_value: Number(f.referrer_reward_value) || 0,
        referred_reward_type: f.referred_reward_type || "coupon",
        referred_reward_value: Number(f.referred_reward_value) || 0,
        min_qualifying_order_value: Number(f.min_qualifying_order_value) || 0,
        referral_code_expiry_days: f.referral_code_expiry_days === "" || f.referral_code_expiry_days == null ? null : Number(f.referral_code_expiry_days),
      });
    } catch { /* toast handled by parent */ } finally { setSaving(false); }
  };

  const TypeToggle = ({ k }) => (
    <div className="flex gap-2">
      {TYPES.map((tp) => (
        <button key={tp.value} type="button" onClick={() => set(k, tp.value)} className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${(f[k] || "loyalty_points") === tp.value ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}>{tp.label}</button>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <p className="text-sm font-medium">Enable referral program</p>
          <p className="text-xs text-muted-foreground">When off, the account Referrals tab shows an inactive message and no referrals are created or rewarded.</p>
        </div>
        <button type="button" onClick={() => set("referral_program_enabled", !f.referral_program_enabled)} className={`flex h-6 w-11 items-center rounded-full transition-colors ${f.referral_program_enabled ? "bg-foreground" : "bg-muted-foreground/30"}`}>
          <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${f.referral_program_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Friend's reward (issued at signup)</p>
          <TypeToggle k="referred_reward_type" />
          <Label className="mt-2 block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Reward value (points or SAR)</span>
            <Input type="number" dir="ltr" value={num("referred_reward_value")} onChange={(e) => set("referred_reward_value", e.target.value)} placeholder="25" />
          </Label>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Referrer reward (issued when the friend's first order qualifies)</p>
          <TypeToggle k="referrer_reward_type" />
          <Label className="mt-2 block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Reward value (points or SAR)</span>
            <Input type="number" dir="ltr" value={num("referrer_reward_value")} onChange={(e) => set("referrer_reward_value", e.target.value)} placeholder="50" />
          </Label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Min qualifying order value (SAR)</span>
          <Input type="number" dir="ltr" value={num("min_qualifying_order_value")} onChange={(e) => set("min_qualifying_order_value", e.target.value)} placeholder="100" />
        </Label>
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Qualifying window (days, blank = never)</span>
          <Input type="number" dir="ltr" value={num("referral_code_expiry_days")} onChange={(e) => set("referral_code_expiry_days", e.target.value)} placeholder="30" />
        </Label>
      </div>

      <p className="rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">A referral qualifies when the referred friend's <strong>first delivered order</strong> meets the minimum value. The friend's signup reward is issued immediately on registration.</p>

      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save referrals"}</Button>
      </div>
    </div>
  );
}