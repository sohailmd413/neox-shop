import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/admin/ui/Dropdown";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

const TYPE_OPTS = [{ label: "Percentage", value: "percent" }, { label: "Fixed amount", value: "fixed" }];

const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

export default function CouponForm({ coupon = null, existing = [], onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(() => ({
    code: coupon?.code || "",
    discount_type: coupon?.discount_type || "percent",
    discount_value: coupon?.discount_value?.toString() || "",
    expires_at: coupon?.expires_at ? toLocalInput(coupon.expires_at) : "",
    usage_limit: coupon?.usage_limit?.toString() || "",
    active: coupon?.active !== false,
  }));
  const [err, setErr] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    const code = form.code.trim().toUpperCase();
    if (!code) e.code = "Code is required.";
    else if (!/^[A-Z0-9_-]+$/.test(code)) e.code = "Letters, numbers, hyphens only.";
    else if (existing.some((c) => (c.code || "").toUpperCase() === code && c.id !== coupon?.id)) e.code = "Code already exists.";
    const v = Number(form.discount_value);
    if (!v || v <= 0) e.discount_value = "Enter a value greater than 0.";
    if (form.discount_type === "percent" && v > 100) e.discount_value = "Percentage must be 0–100.";
    if (form.usage_limit && (!/^\d+$/.test(form.usage_limit) || Number(form.usage_limit) < 1)) e.usage_limit = "Whole number ≥ 1.";
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      expires_at: form.expires_at ? fromLocalInput(form.expires_at) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      active: form.active,
      times_used: coupon?.times_used || 0,
    };
    try {
      if (coupon) await base44.entities.Coupon.update(coupon.id, payload);
      else await base44.entities.Coupon.create(payload);
      toast({ title: coupon ? "Coupon updated" : "Coupon created" });
      onSaved?.();
    } catch {
      toast({ title: "Could not save coupon", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{coupon ? "Edit coupon" : "New coupon"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="SUMMER20" className="uppercase" />
            {err.code && <p className="text-xs text-destructive">{err.code}</p>}
            <p className="text-xs text-muted-foreground">Customers enter this at checkout.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount type</Label>
              <Dropdown type="select" value={form.discount_type} onChange={(v) => set("discount_type", v)} options={TYPE_OPTS} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="value">{form.discount_type === "percent" ? "Percentage (%)" : "Amount"}</Label>
              <Input id="value" type="number" value={form.discount_value} onChange={(e) => set("discount_value", e.target.value)} />
              {err.discount_value && <p className="text-xs text-destructive">{err.discount_value}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expires">Expires (optional)</Label>
              <Input id="expires" type="datetime-local" value={form.expires_at} onChange={(e) => set("expires_at", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="limit">Usage limit (optional)</Label>
              <Input id="limit" type="number" value={form.usage_limit} onChange={(e) => set("usage_limit", e.target.value)} placeholder="∞" />
              {err.usage_limit && <p className="text-xs text-destructive">{err.usage_limit}</p>}
            </div>
          </div>

          <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <span className="text-sm font-medium">Active</span>
            <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
          </label>

          {err.general && <p className="text-xs text-destructive">{err.general}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{coupon ? "Save changes" : "Create coupon"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}