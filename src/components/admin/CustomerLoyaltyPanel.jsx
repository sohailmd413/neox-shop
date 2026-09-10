import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, TrendingDown, Clock, Undo2, UserCog } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";

// Admin-side loyalty panel shown on Customer Detail. Balance + SAR value at
// the top, then a statement-style transaction table with a running balance
// column, clear type labels (Earned / Redeemed / Expired / Refund clawback /
// Redeem refund / Admin adjustment), +/− color coding (green add, red deduct),
// a clickable order link per row, and — for manual admin adjustments — the
// staff member who made the change (system rows show no actor).
export default function CustomerLoyaltyPanel({ userId }) {
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [rows, setRows] = useState([]);
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
      const txs = await base44.entities.LoyaltyTransaction.filter({ customer_id: userId }, "-created_date", 200).catch(() => []);
      // Compute a running balance per transaction (balance after each entry).
      // Transactions arrive newest-first; reverse to apply chronologically.
      const chrono = [...(txs || [])].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      let run = 0;
      const afterById = {};
      for (const t of chrono) {
        run += Number(t.points) || 0;
        afterById[t.id] = run;
      }
      setRows((txs || []).map((t) => ({ ...t, balanceAfter: afterById[t.id] ?? 0 })));
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
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No loyalty activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/20 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 text-right font-medium">Points</th>
                  <th className="px-4 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tr) => (
                  <Row key={tr.id} tr={tr} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={form.open} onOpenChange={(o) => !busy && setForm((f) => ({ ...f, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust loyalty points</DialogTitle>
            <DialogDescription>Add or remove points for this customer. A reason is required and your name will be recorded against the change.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Points (use a negative number to deduct)</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => setForm((f) => ({ ...f, points: String((Number(f.points) || 0) - 10) }))}>−</Button>
                <Input type="number" dir="ltr" value={form.points} onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))} placeholder="e.g. 50 or -20" />
                <Button type="button" variant="outline" size="icon" onClick={() => setForm((f) => ({ ...f, points: String((Number(f.points) || 0) + 10) }))}>+</Button>
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

// Reason-code → human label + icon. reason_code is the fine-grained classifier
// (a single type 'admin_adjustment' covers clawback_refund, redeem_refund and
// admin_manual, so we disambiguate via reason_code).
const REASON_META = {
  earn: { label: "Earned", icon: TrendingUp, color: "text-emerald-600", dot: "bg-emerald-500" },
  redeem: { label: "Redeemed", icon: TrendingDown, color: "text-blue-600", dot: "bg-blue-500" },
  expire: { label: "Expired", icon: Clock, color: "text-amber-600", dot: "bg-amber-500" },
  clawback_refund: { label: "Refund clawback", icon: Undo2, color: "text-red-600", dot: "bg-red-500" },
  redeem_refund: { label: "Redeem refund", icon: Undo2, color: "text-amber-600", dot: "bg-amber-500" },
  admin_manual: { label: "Admin adjustment", icon: UserCog, color: "text-foreground", dot: "bg-foreground" },
};

function Row({ tr }) {
  const m = REASON_META[tr.reason_code] || REASON_META.admin_manual;
  const Icon = m.icon;
  const pts = Number(tr.points) || 0;
  const positive = pts > 0;
  const isManual = tr.reason_code === "admin_manual";
  return (
    <tr className="border-t border-border align-top hover:bg-muted/20">
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
        {new Date(tr.created_date).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${m.dot}`} />
          <span className="font-medium">{m.label}</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="break-words text-sm">{tr.description}</p>
        {isManual && tr.actor && (
          <p className="mt-0.5 text-xs text-muted-foreground">by {tr.actor}</p>
        )}
      </td>
      <td className="px-4 py-3">
        {tr.order_id ? (
          <Link to="/admin/orders" className="font-mono text-xs text-foreground hover:underline">
            #{String(tr.order_id).slice(-8).toUpperCase()}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${positive ? "text-emerald-600" : "text-red-600"}`}>
        {positive ? "+" : "−"}{Math.abs(pts).toLocaleString()}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
        {Number(tr.balanceAfter).toLocaleString()}
      </td>
    </tr>
  );
}