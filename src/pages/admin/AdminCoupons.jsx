import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Copy, Pencil, Trash2, Loader2, TicketPercent, CheckCircle2, Repeat, TrendingDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/admin/ui/Dropdown";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import CouponForm from "@/components/admin/CouponForm";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/format";

const TYPE_OPTS = [{ label: "Percentage", value: "percent" }, { label: "Fixed amount", value: "fixed" }];
const STATUS_OPTS = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "Expired", value: "expired" }];
const STATUS_STYLE = { active: "bg-emerald-100 text-emerald-700", inactive: "bg-muted text-muted-foreground", expired: "bg-zinc-200 text-zinc-600" };
const TYPE_LABEL = { percent: "% off", fixed: "fixed" };

const statusOf = (c) => {
  if (c.active === false) return "inactive";
  if (c.expires_at && new Date(c.expires_at) < new Date()) return "expired";
  return "active";
};
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Never");

const valueLabel = (c) => (c.discount_type === "percent" ? `${c.discount_value}% off` : formatPrice(c.discount_value));

export default function AdminCoupons() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | coupon
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, o] = await Promise.all([
        base44.entities.Coupon.list("-created_date", 500).catch(() => []),
        base44.entities.Order.list("-created_date", 500).catch(() => []),
      ]);
      setCoupons(c || []);
      setOrders(o || []);
    } catch {
      toast({ title: "Could not load coupons", variant: "destructive" });
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((c) => statusOf(c) === "active").length;
    const redemptions = coupons.reduce((s, c) => s + (Number(c.times_used) || 0), 0);
    const savings = orders.reduce((s, o) => s + (o.coupon_code ? Number(o.discount) || 0 : 0), 0);
    return { total, active, redemptions, savings };
  }, [coupons, orders]);

  const filtered = useMemo(() => {
    return coupons.filter((c) => {
      if (search && !(c.code || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (fType && c.discount_type !== fType) return false;
      if (fStatus && statusOf(c) !== fStatus) return false;
      return true;
    });
  }, [coupons, search, fType, fStatus]);

  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code); toast({ title: "Code copied" }); } catch { toast({ title: "Copy failed", variant: "destructive" }); }
  };

  const remove = (c) =>
    setConfirm({
      variant: "danger",
      title: `Delete "${c.code}"?`,
      description: "This coupon will stop working immediately. This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try { await base44.entities.Coupon.delete(c.id); setCoupons((prev) => prev.filter((x) => x.id !== c.id)); toast({ title: "Coupon deleted" }); }
        catch { toast({ title: "Delete failed", variant: "destructive" }); }
      },
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coupons &amp; Discounts</h1>
          <p className="text-sm text-muted-foreground">{coupons.length} coupons · {stats.active} active · {stats.redemptions} redemptions</p>
        </div>
        <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> New coupon</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard Icon={TicketPercent} tone="bg-foreground text-background" label="Total coupons" value={stats.total} />
        <StatCard Icon={CheckCircle2} tone="bg-emerald-100 text-emerald-700" label="Active" value={stats.active} />
        <StatCard Icon={Repeat} tone="bg-blue-100 text-blue-700" label="Redemptions" value={stats.redemptions} />
        <StatCard Icon={TrendingDown} tone="bg-purple-100 text-purple-700" label="Total savings" value={formatPrice(stats.savings)} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code…" className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground/40" />
        </div>
        <div className="w-[170px]"><Dropdown type="select" value={fType} onChange={setFType} options={TYPE_OPTS} placeholder="All types" clearable /></div>
        <div className="w-[160px]"><Dropdown type="select" value={fStatus} onChange={setFStatus} options={STATUS_OPTS} placeholder="All statuses" clearable /></div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">No coupons match the current filters.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Usage</th>
                <th className="px-4 py-3 font-medium">Redemptions</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const st = statusOf(c);
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <button onClick={() => copy(c.code)} className="group inline-flex items-center gap-1.5 font-mono font-medium hover:underline" title="Copy code">
                        {c.code}
                        <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </td>
                    <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{valueLabel(c)}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.usage_limit ? `${c.times_used || 0} / ${c.usage_limit}` : `${c.times_used || 0} / ∞`}</td>
                    <td className="px-4 py-3">{c.times_used || 0}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.expires_at)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[st]}`}>{st}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditing(c)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => remove(c)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CouponForm
          coupon={editing === "new" ? null : editing}
          existing={coupons}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          variant={confirm.variant}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  );
}

function StatCard({ Icon, tone, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tone}`}><Icon className="h-4 w-4" /></span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}