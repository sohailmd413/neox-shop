import { useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const blank = () => ({ region: "", rate: "", inclusive: false });

export default function TaxSettings({ setting, onSave }) {
  const [rules, setRules] = useState(setting.tax_rules || []);
  const [saving, setSaving] = useState(false);

  const update = (i, k, v) => setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const add = () => setRules((prev) => [...prev, blank()]);
  const remove = (i) => setRules((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        tax_rules: rules.map((r) => ({
          region: r.region?.trim() || "",
          rate: Number(r.rate) || 0,
          inclusive: !!r.inclusive,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-muted-foreground">Set tax rates by region. Toggle whether the listed price already includes tax.</p>

      <div className="space-y-3">
        {rules.map((r, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-4">
            <Label className="min-w-[140px] flex-1 space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Region</span>
              <Input value={r.region} onChange={(e) => update(i, "region", e.target.value)} placeholder="Saudi Arabia" />
            </Label>
            <Label className="w-32 space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Rate (%)</span>
              <Input type="number" value={r.rate} onChange={(e) => update(i, "rate", e.target.value)} placeholder="15" />
            </Label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Switch checked={r.inclusive} onCheckedChange={(v) => update(i, "inclusive", v)} />
              Tax inclusive
            </label>
            <button onClick={() => remove(i)} className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remove rule">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {rules.length === 0 && <p className="text-sm text-muted-foreground">No tax rules yet.</p>}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" onClick={add}><Plus className="mr-2 h-4 w-4" /> Add rule</Button>
        <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save tax"}</Button>
      </div>
    </div>
  );
}