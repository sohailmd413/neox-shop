import { useEffect, useState, useCallback } from "react";
import { ShoppingCart, Send, RotateCw, TrendingDown, TrendingUp, Repeat } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/format";
import { EmptyState, ErrorState } from "@/components/shared/StateViews";
import ProductImage from "@/components/storefront/ProductImage";

const TABS = [
  { id: "open", label: "Abandoned" },
  { id: "recovered", label: "Recovered" },
  { id: "all", label: "All" },
];

export default function AdminAbandonedCarts() {
  const { toast } = useToast();
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState("open");
  const [sending, setSending] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await base44.entities.AbandonedCart.list("-last_updated_at", 500);
      setCarts(list || []);
    } catch {
      setError(true);
      toast({ title: "Could not load abandoned carts", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const sendReminder = async (c) => {
    setSending(c.id);
    try {
      const res = await base44.functions.invoke("sendAbandonedCartReminder", { cart_id: c.id });
      const data = res?.data;
      if (data?.ok && data.sent) {
        toast({ title: `Reminder ${data.sent} sent to ${c.email || "customer"}` });
        await load();
      } else {
        toast({ title: data?.skipped ? `No reminder sent (${data.skipped})` : "No reminder sent", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Could not send reminder", variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const abandoned = carts.filter((c) => c.is_abandoned && !c.recovered);
  const recoveredCarts = carts.filter((c) => c.recovered);
  const openValue = abandoned.reduce((s, c) => s + (Number(c.total) || 0), 0);
  const recoveredThisMonth = recoveredCarts
    .filter((c) => c.recovered_at && new Date(c.recovered_at) >= monthStart)
    .reduce((s, c) => s + (Number(c.total) || 0), 0);
  const totalEverAbandoned = abandoned.length + recoveredCarts.length;
  const recoveryRate = totalEverAbandoned > 0 ? Math.round((recoveredCarts.length / totalEverAbandoned) * 100) : 0;

  const visible = carts.filter((c) => {
    if (tab === "open") return c.is_abandoned && !c.recovered;
    if (tab === "recovered") return c.recovered;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Abandoned carts</h1>
        <p className="text-sm text-muted-foreground">Track carts left at checkout and recover lost sales with automated reminder emails.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={TrendingDown} label="Open abandoned value" value={formatPrice(openValue)} sub={`${abandoned.length} carts`} />
        <Metric icon={Repeat} label="Recovery rate" value={`${recoveryRate}%`} sub={`${recoveredCarts.length} of ${totalEverAbandoned} recovered`} />
        <Metric icon={TrendingUp} label="Recovered this month" value={formatPrice(recoveredThisMonth)} sub={`${recoveredCarts.filter((c) => c.recovered_at && new Date(c.recovered_at) >= monthStart).length} carts`} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === tb.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
          <RotateCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error ? (
        <ErrorState onRetry={load} className="py-20" />
      ) : loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
          <RotateCw className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No carts here" description="Abandoned carts will appear here once customers leave items at checkout." className="py-20" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Items</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
                <th className="px-4 py-3 text-left font-medium">Abandoned</th>
                <th className="px-4 py-3 text-center font-medium">Reminders</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((c) => {
                const items = Array.isArray(c.items) ? c.items : [];
                return (
                  <tr key={c.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.customer_name || "Guest"}</p>
                      <p className="text-xs text-muted-foreground"><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{c.email || "—"}</span></p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {items.slice(0, 3).map((i, idx) => (
                          <div key={idx} className="flex h-8 w-8 overflow-hidden rounded bg-muted">
                            {i.image ? <ProductImage src={i.image} alt={i.name} fittingType="fill" size="sm" className="h-full w-full object-cover" /> : null}
                          </div>
                        ))}
                        {items.length > 3 && <span className="self-center text-xs text-muted-foreground">+{items.length - 3}</span>}
                        <span className="self-center text-xs text-muted-foreground">{items.reduce((s, i) => s + (i.quantity || 0), 0)} pcs</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(c.total)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.abandoned_at ? new Date(c.abandoned_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{Number(c.reminder_sent_count) || 0}</span>
                      {c.coupon_code && <div className="mt-1 text-[11px] text-emerald-600">{c.coupon_code}</div>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.recovered ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Recovered</span>
                      ) : c.is_abandoned ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Abandoned</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!c.recovered && (
                        <button
                          onClick={() => sendReminder(c)}
                          disabled={sending === c.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" /> {sending === c.id ? "Sending…" : "Send reminder"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}