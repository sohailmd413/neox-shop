import React, { useEffect, useMemo, useState } from "react";
import { Eye, Download, CheckSquare, Square, FileText, Package } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/admin/ui/Dropdown";
import { useToast } from "@/components/ui/use-toast";
import OrderAnalytics from "@/components/admin/OrderAnalytics";
import OrderFilters from "@/components/admin/OrderFilters";
import OrderDetailDrawer from "@/components/admin/OrderDetailDrawer";
import { downloadInvoicePDF, downloadMultipleInvoices } from "@/lib/invoice";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";

const STATUSES = ["pending", "paid", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded"];
const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-blue-100 text-blue-700",
  packed: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-cyan-100 text-cyan-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-200 text-gray-700",
};
const METHOD_LABEL = { card: "Card", cod: "COD", wallet: "Wallet", upi: "UPI", net_banking: "Net banking" };
const INVOICE_STATUS = { not_generated: "bg-zinc-100 text-zinc-500", generated: "bg-emerald-100 text-emerald-700", sent: "bg-blue-100 text-blue-700" };
const INVOICE_STATUS_LABEL = { not_generated: "No invoice", generated: "Invoice ready", sent: "Sent" };

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ query: "", status: "all", method: "all", range: "all" });
  const [selected, setSelected] = useState([]);
  const [drawerId, setDrawerId] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.Order.list("-created_date", 500);
      setOrders(list || []);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    (async () => {
      try {
        const u = await base44.auth.me();
        if (u?.full_name) setAdminName(u.full_name);
      } catch {}
    })();
  }, []);

  const patch = (id, data) => setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...data } : o)));

  const updateStatus = async (id, status) => {
    const order = orders.find((o) => o.id === id);
    const timeline = [...(order?.timeline || []), { status, by: adminName || "admin", at: new Date().toISOString() }];
    try {
      await base44.entities.Order.update(id, { status, timeline });
      patch(id, { status });
      base44.functions.invoke("syncOrderLoyalty", { orderId: id, status }).catch(() => {});
      toast({ title: "Order updated" });
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    }
  };

  const bulkUpdate = async (status) => {
    if (!selected.length) return;
    try {
      await Promise.all(selected.map((id) => {
        const order = orders.find((o) => o.id === id);
        const timeline = [...(order?.timeline || []), { status, by: adminName || "admin", at: new Date().toISOString() }];
        return base44.entities.Order.update(id, { status, timeline });
      }));
      setOrders((prev) => prev.map((o) => (selected.includes(o.id) ? { ...o, status } : o)));
      selected.forEach((oid) => base44.functions.invoke("syncOrderLoyalty", { orderId: oid, status }).catch(() => {}));
      toast({ title: `${selected.length} order(s) updated` });
      setSelected([]);
    } catch {
      toast({ title: "Bulk update failed", variant: "destructive" });
    }
  };

  const downloadOneInvoice = async (order) => {
    setInvoiceBusy(true);
    try {
      await downloadInvoicePDF(order, orders);
      toast({ title: "Invoice downloaded" });
      load();
    } catch {
      toast({ title: "Could not generate invoice", variant: "destructive" });
    } finally {
      setInvoiceBusy(false);
    }
  };

  const bulkDownloadInvoices = async () => {
    if (!selected.length) return;
    setInvoiceBusy(true);
    try {
      const selectedOrders = orders.filter((o) => selected.includes(o.id));
      await downloadMultipleInvoices(selectedOrders, orders);
      toast({ title: `${selected.length} invoice(s) downloaded` });
      setSelected([]);
      load();
    } catch {
      toast({ title: "Could not generate invoices", variant: "destructive" });
    } finally {
      setInvoiceBusy(false);
    }
  };

  const exportCSV = () => {
    const rows = [["Order", "Date", "Customer", "Email", "Status", "Payment", "Items", "Total"]];
    filtered.forEach((o) => {
      rows.push([
        `#${o.id?.slice(-8).toUpperCase()}`,
        new Date(o.created_date).toLocaleString(),
        o.shipping_address?.name || "",
        o.customer_email || "",
        o.status,
        METHOD_LABEL[o.payment_method || "card"] || "",
        String(o.items?.length || 0),
        String(o.total || 0),
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const inRange = (date, range) => {
    if (range === "all") return true;
    const d = new Date(date).getTime();
    const now = Date.now();
    if (range === "today") return d >= new Date().setHours(0, 0, 0, 0);
    return d >= now - parseInt(range) * 24 * 60 * 60 * 1000;
  };

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filters.status !== "all" && o.status !== filters.status) return false;
      if (filters.method !== "all" && (o.payment_method || "card") !== filters.method) return false;
      if (!inRange(o.created_date, filters.range)) return false;
      if (q) {
        const addr = o.shipping_address || {};
        const hay = [o.id, o.invoice_number, addr.name, o.customer_email, addr.phone, `#${o.id?.slice(-8).toUpperCase()}`].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, filters]);

  const allSelected = filtered.length > 0 && selected.length === filtered.length;
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map((o) => o.id));
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const drawerOrder = orders.find((o) => o.id === drawerId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total · managing in real time</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!filtered.length}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <OrderAnalytics orders={orders} />

      <OrderFilters filters={filters} setFilters={setFilters} />

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Set status</span>
            <Dropdown
              type="select"
              options={STATUSES.map((s) => ({ label: s, value: s }))}
              value=""
              onChange={bulkUpdate}
              placeholder="Choose…"
              size="sm"
              className="w-[150px]"
            />
          </div>
          <Button size="sm" variant="outline" onClick={bulkDownloadInvoices} disabled={invoiceBusy}><Download className="mr-1.5 h-3.5 w-3.5" /> Download invoices</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} cols={9} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={orders.length === 0 ? "No orders yet" : "No orders match"}
          description={orders.length === 0 ? "Orders customers place will appear here in real time." : "Try adjusting your filters."}
          className="py-10"
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-3">
                  <button onClick={toggleAll} aria-label="Select all">{allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}</button>
                </th>
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Payment</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Invoice</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-3">
                    <button onClick={() => toggle(o.id)} aria-label="Select">
                      {selected.includes(o.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-muted-foreground/50" />}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => setDrawerId(o.id)} className="font-mono text-xs font-medium hover:underline">
                      #{o.id?.slice(-8).toUpperCase()}
                    </button>
                    <p className="text-xs text-muted-foreground">{o.items?.length || 0} item(s)</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{o.shipping_address?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_email || ""}</p>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{new Date(o.created_date).toLocaleDateString()}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{METHOD_LABEL[o.payment_method || "card"] || "Card"}</span>
                  </td>
                  <td className="px-3 py-3">
                    <Dropdown
                      type="select"
                      bare
                      options={STATUSES.map((s) => ({ label: s, value: s }))}
                      value={o.status}
                      onChange={(v) => updateStatus(o.id, v)}
                      placeholder={o.status}
                      className={`capitalize ${STATUS_STYLES[o.status]}`}
                      panelClassName="w-[150px]"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${INVOICE_STATUS[o.invoice_status || "not_generated"]}`}>{INVOICE_STATUS_LABEL[o.invoice_status || "not_generated"]}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="font-semibold">{formatPrice(o.total)}</span>
                    {o.discount > 0 && (
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-emerald-600">
                        <span>−{formatPrice(o.discount)}</span>
                        {o.coupon_code && <span className="rounded bg-emerald-100 px-1 py-0.5 font-mono uppercase tracking-wide">{o.coupon_code}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => downloadOneInvoice(o)} disabled={invoiceBusy} className="rounded-lg p-2 hover:bg-muted" aria-label="Download invoice" title="Download invoice"><FileText className="h-4 w-4" /></button>
                      <button onClick={() => setDrawerId(o.id)} className="rounded-lg p-2 hover:bg-muted" aria-label="View"><Eye className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawerOrder && (
        <OrderDetailDrawer
          order={drawerOrder}
          adminName={adminName}
          onClose={() => setDrawerId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}