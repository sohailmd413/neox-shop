import React, { useEffect, useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, Clock, Plus, Minus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";

// Admin-side loyalty panel shown on Customer Detail: balance, value,
// transaction history, and a manual adjust flow (points + required reason)
// confirmed via the shared ConfirmDialog before applying.
export default function CustomerLoyaltyPanel({ userId }) {
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ open: false, points: "", reason: "" });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [profs, setting] = await Promise.all([
        base44.entities.CustomerProfile.filter({ user_id: userId }).catch(() => []),
        base44.entities.Setting.filter({ key: "store" }).catch(() => []),
      ]);
      setProfile((profs && profs[0]) || null);
      const s = (setting && setting[0]) || {};
      setCfg({
        enabled: s.loyalty_program_enabled === true,
        redeemPoints: Number(s.loyalty_redeem_points) || 0,
        redeemAmount: Number(s.loyalty_redeem_amount) || 0,
      });
      const txs = await base44.entities.LoyaltyTransaction.filter({ customer_id: userId }, "-created_date", 100).catch(() => []);
      setTx(txs || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [userId]);

  const balance = Number(profile?.loyalty_points_balance) || 0;
  const value = cfg && cfg.redeemPoints && cfg.redeemAmount ? Math.floor(balance / cfg.redeemPoints) * cfg.redeemAmount : 0;

  if (loading) return <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!cfg?.enabled) return <div className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">Loyalty program is disabled in store settings.</div>;

  const pts = Math.floor(Number(form.points) || 0);
  const reason = (form.reason || "").trim();
  const canContinue = pts !== 0 && !!reason;

  const submit = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("adminAdjustLoyalty", { userId, points: pts, reason });
      if (res?.data?.ok) {
        toast({ title: "Points adjusted" });
        setForm({ open: false, points: "", reason: "" });
        load();
      } else {
        toast({ title: res?.data?.error || "Could not adjust", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not adjust", variant: "destructive" });
    }
    setBusy(false);
  };

  const typeMeta = {
    earned: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    redeemed: { icon: TrendingDown, color: "text-blue-600", bg: "bg-blue-50" },
    expired: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    admin_adjustment: { icon: Sparkles, color: "text-foreground", bg: "bg-muted" },
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Points balance</p>
          <p className="mt-1 text-2xl font-semibold">{balance.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Current value</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(value)}</p>
        </div>
        <div className="flex items-end justify-end">
          <Button onClick={() => setForm({ open: true, points: "", reason: "" })}>
            <Sparkles className="mr-2 h-4 w-4" /> Adjust points
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs uppercase tracking-[0.1em] text-muted-foreground">
          Transaction history
        </div>
        {tx.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No loyalty activity yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tx.map((tr) => {
              const m = typeMeta[tr.type] || typeMeta.admin_adjustment;
              const Icon = m.icon;
              const positive = Number(tr.points) > 0;
              return (
                <li key={tr.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.bg} ${m.color}`}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">{tr.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tr.created_date).toLocaleString()}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${positive ? "text-emerald-600" : "text-foreground"}`}>{positive ? "+" : ""}{Number(tr.points)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={form.open} onOpenChange={(o) => !busy && setForm((f) => ({ ...f, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust loyalty points</DialogTitle>
            <DialogDescription>Add or remove points for this customer. A reason is required.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Points (use a negative number to deduct)</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => setForm((f) => ({ ...f, points: String((Number(f.points) || 0) - 10) }))}><Minus className="h-4 w-4" /></Button>
                <Input type="number" dir="ltr" value={form.points} onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))} placeholder="e.g. 50 or -20" />
                <Button type="button" variant="outline" size="icon" onClick={() => setForm((f) => ({ ...f, points: String((Number(f.points) || 0) + 10) }))}><Plus className="h-4 w-4" /></Button>
              </div>
            </Label>
            <Label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Reason</span>
              <Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={3} placeholder="e.g. Goodwill gesture for a delayed order" />
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm((f) => ({ ...f, open: false }))} disabled={busy}>Cancel</Button>
            <Button onClick={() => setConfirm(true)} disabled={!canContinue}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(false)}
          variant={pts >= 0 ? "default" : "danger"}
          title={pts >= 0 ? `Add ${pts} points?` : `Deduct ${Math.abs(pts)} points?`}
          description={`Reason: ${reason}\nNew balance will be: ${Math.max(0, balance + pts)}`}
          confirmLabel={pts >= 0 ? "Add points" : "Deduct points"}
          onConfirm={submit}
        />
      )}
    </div>
  );
}