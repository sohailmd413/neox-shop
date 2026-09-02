import React, { useState } from "react";
import { X, Save, Printer, User, Package, CreditCard, Truck, History, StickyNote } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { useToast } from "@/components/ui/use-toast";

const STATUSES = ["pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"];
const METHODS = [
  { id: "card", label: "Card" },
  { id: "cod", label: "Cash on delivery" },
  { id: "wallet", label: "Wallet" },
  { id: "upi", label: "UPI" },
  { id: "net_banking", label: "Net banking" },
];

const TABS = [
  { id: "summary", label: "Summary", icon: Package },
  { id: "customer", label: "Customer", icon: User },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "timeline", label: "Timeline", icon: History },
  { id: "notes", label: "Notes", icon: StickyNote },
];

export default function OrderDetailDrawer({ order, onClose, onChanged, adminName }) {
  const [tab, setTab] = useState("summary");
  const [draft, setDraft] = useState({
    status: order.status,
    payment_method: order.payment_method || "card",
    courier: order.courier || "",
    tracking_number: order.tracking_number || "",
  });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  if (!order) return null;

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const saveShipping = async () => {
    setSaving(true);
    const timeline = order.status !== draft.status
      ? [...(order.timeline || []), { status: draft.status, by: adminName || "admin", at: new Date().toISOString() }]
      : order.timeline || [];
    try {
      await base44.entities.Order.update(order.id, {
        status: draft.status,
        payment_method: draft.payment_method,
        courier: draft.courier,
        tracking_number: draft.tracking_number,
        timeline,
      });
      toast({ title: "Order updated" });
      onChanged();
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    const notes = [...(order.notes || []), { text: note.trim(), author: adminName || "admin", created_date: new Date().toISOString() }];
    try {
      await base44.entities.Order.update(order.id, { notes });
      toast({ title: "Note added" });
      setNote("");
      onChanged();
    } catch {
      toast({ title: "Could not add note", variant: "destructive" });
    }
  };

  const printInvoice = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const rows = (order.items || [])
      .map(
        (i) => `<tr><td style="padding:6px 0">${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${formatPrice(i.price)}</td><td style="text-align:right">${formatPrice(i.price * i.quantity)}</td></tr>`
      )
      .join("");
    const a = order.shipping_address || {};
    w.document.write(`<!doctype html><html><head><title>Invoice #${order.id?.slice(-8).toUpperCase()}</title>
    <style>body{font-family:system-ui,sans-serif;padding:40px;color:#111}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{font-size:13px}th{text-align:left;border-bottom:1px solid #ddd;padding-bottom:6px}.muted{color:#777}.tot{display:flex;justify-content:space-between;font-size:13px;margin-top:4px}</style></head>
    <body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h1>MarketFlow</h1><p class="muted">Invoice #${order.id?.slice(-8).toUpperCase()}</p></div>
        <div style="text-align:right" class="muted"><p>${new Date(order.created_date).toLocaleString()}</p><p>Status: ${order.status}</p></div>
      </div>
      <hr style="margin:16px 0;border:none;border-top:1px solid #eee"/>
      <div style="display:flex;gap:40px">
        <div><p class="muted" style="font-size:12px">Bill to</p><p>${a.name || "—"}</p><p class="muted">${order.customer_email || ""}</p><p class="muted">${a.phone || ""}</p></div>
        <div><p class="muted" style="font-size:12px">Ship to</p><p>${a.line1 || ""}</p><p class="muted">${a.city || ""} ${a.state || ""} ${a.postal_code || ""}</p><p class="muted">${a.country || ""}</p></div>
      </div>
      <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="margin-top:16px;margin-left:auto;width:260px">
        <div class="tot"><span class="muted">Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
        <div class="tot"><span class="muted">Shipping</span><span>${order.shipping_fee === 0 ? "Free" : formatPrice(order.shipping_fee)}</span></div>
        <div class="tot"><span class="muted">Tax</span><span>${formatPrice(order.tax)}</span></div>
        ${order.discount ? `<div class="tot"><span class="muted">Discount</span><span>−${formatPrice(order.discount)}</span></div>` : ""}
        <div class="tot" style="font-weight:600;border-top:1px solid #ddd;padding-top:6px;margin-top:6px"><span>Grand total</span><span>${formatPrice(order.total)}</span></div>
        <p style="margin:0">${order.courier ? `Courier: ${order.courier}` : ""}<br/>${order.tracking_number ? `Tracking: ${order.tracking_number}` : ""}</p>
      </div>
      <p class="muted" style="margin-top:40px;font-size:11px">Thank you for your purchase.</p>
    </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-2xl overflow-y-auto bg-background shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4">
          <div>
            <p className="text-sm font-medium">#{order.id?.slice(-8).toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">{new Date(order.created_date).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={printInvoice}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Invoice
            </Button>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {tab === "summary" && (
            <div className="space-y-4">
              {(order.items || []).map((i, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <div className="h-12 w-12 overflow-hidden rounded-lg bg-muted/40 shrink-0">
                    {i.image ? <img src={i.image} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(i.price)} × {i.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold">{formatPrice(i.price * i.quantity)}</span>
                </div>
              ))}
              <Totals order={order} />
            </div>
          )}

          {tab === "customer" && (
            <div className="space-y-3 text-sm">
              <Row label="Name" value={order.shipping_address?.name || "—"} />
              <Row label="Email" value={order.customer_email || "—"} />
              <Row label="Phone" value={order.shipping_address?.phone || "—"} />
              <Row label="Customer type" value={order.user_id ? "Returning" : "Guest"} />
              <div className="rounded-xl border border-border p-4">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Shipping address</p>
                <p>{order.shipping_address?.line1}</p>
                <p className="text-muted-foreground">
                  {order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postal_code}
                </p>
                <p className="text-muted-foreground">{order.shipping_address?.country}</p>
                {order.coupon_code && <p className="mt-2 text-xs">Coupon used: <span className="font-medium">{order.coupon_code}</span></p>}
              </div>
            </div>
          )}

          {tab === "payment" && (
            <div className="space-y-3 text-sm">
              <Row label="Payment method" value={METHODS.find((m) => m.id === (order.payment_method || "card"))?.label || "Card"} />
              <Row label="Payment status" value={payStatus(order.status)} />
              <Row label="Transaction ID" value={order.stripe_payment_id || "—"} />
              <Row label="Grand total" value={formatPrice(order.total)} />
              <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                Payment captured at checkout via {order.payment_method === "cod" ? "cash on delivery" : "Stripe"}. Refunds are issued from the Orders list.
              </div>
            </div>
          )}

          {tab === "shipping" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Order status">
                  <SelectNative value={draft.status} onChange={set("status")} className="!py-1.5 text-sm">
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </SelectNative>
                </Field>
                <Field label="Payment method">
                  <SelectNative value={draft.payment_method} onChange={set("payment_method")} className="!py-1.5 text-sm">
                    {METHODS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </SelectNative>
                </Field>
                <Field label="Courier">
                  <Input value={draft.courier} onChange={set("courier")} placeholder="e.g. Aramex" className="h-9" />
                </Field>
                <Field label="Tracking number">
                  <Input value={draft.tracking_number} onChange={set("tracking_number")} placeholder="Tracking #" className="h-9" />
                </Field>
              </div>
              <Button onClick={saveShipping} disabled={saving}>
                <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}

          {tab === "timeline" && (
            <div className="space-y-3">
              {(order.timeline || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No status changes recorded.</p>
              ) : (
                (order.timeline || []).map((e, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-foreground" />
                    <div>
                      <p className="text-sm font-medium capitalize">{e.status}</p>
                      <p className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString()} · by {e.by || "system"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "notes" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" className="h-9" />
                <Button onClick={addNote}>Add</Button>
              </div>
              <div className="space-y-3">
                {(order.notes || []).map((n, idx) => (
                  <div key={idx} className="rounded-xl border border-border p-3">
                    <p className="text-sm">{n.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.author || "admin"} · {new Date(n.created_date).toLocaleString()}</p>
                  </div>
                ))}
                {(order.notes || []).length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Totals({ order }) {
  return (
    <div className="rounded-xl border border-border p-4 text-sm">
      <Line label="Subtotal" value={formatPrice(order.subtotal)} />
      <Line label="Shipping" value={order.shipping_fee === 0 ? "Free" : formatPrice(order.shipping_fee)} />
      <Line label="Tax" value={formatPrice(order.tax)} />
      {order.discount ? <Line label="Discount" value={`−${formatPrice(order.discount)}`} /> : null}
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <span className="font-medium">Grand total</span>
        <span className="text-lg font-semibold">{formatPrice(order.total)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
function Line({ label, value }) {
  return <Row label={label} value={value} />;
}
function Field({ label, children }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function payStatus(status) {
  if (status === "paid" || ["packed", "shipped", "delivered"].includes(status)) return "Paid";
  if (status === "refunded") return "Refunded";
  if (status === "cancelled") return "Cancelled";
  return "Pending";
}