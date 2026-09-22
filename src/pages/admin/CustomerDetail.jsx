import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Ban, CheckCircle2, Save, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import CustomerLoyaltyPanel from "@/components/admin/CustomerLoyaltyPanel";
import CustomerReferralPanel from "@/components/admin/CustomerReferralPanel";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/format";

const TABS = ["Overview", "Orders", "Addresses", "Notes", "Loyalty", "Referrals"];
const STATUS_BADGE = { active: "bg-emerald-100 text-emerald-700", blocked: "bg-red-100 text-red-700" };
const SEG_BADGE = { new: "bg-sky-100 text-sky-700", returning: "bg-blue-100 text-blue-700", vip: "bg-purple-100 text-purple-700" };
const ORDER_STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700", paid: "bg-blue-100 text-blue-700", packed: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700", delivered: "bg-emerald-100 text-emerald-700", cancelled: "bg-zinc-200 text-zinc-600", refunded: "bg-red-100 text-red-700",
};
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");

export default function CustomerDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [notes, setNotes] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [u, allOrders, addr, profs] = await Promise.all([
        base44.entities.User.list().catch(() => []),
        base44.entities.Order.list("-created_date", 500).catch(() => []),
        base44.entities.Address.filter({ user_id: id }).catch(() => []),
        base44.entities.CustomerProfile.filter({ user_id: id }).catch(() => []),
      ]);
      setUser((u || []).find((x) => x.id === id) || null);
      setOrders((allOrders || []).filter((o) => (o.user_id || o.created_by_id) === id));
      setAddresses(addr || []);
      setProfile((profs && profs[0]) || null);
      setNotes((profs && profs[0]?.notes) || "");
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const metrics = useMemo(() => {
    const total_orders = orders.length;
    const total_spend = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const last_order_date = orders[0]?.created_date || null; // list is sorted -created_date
    const ranked = [...orders].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
    // Segment: needs cross-customer comparison for VIP, but for the profile we
    // approximate: VIP if spend is notably high (≥ store-wide threshold handled
    // on the list page). Here use order count as a proxy: 0=new, else returning
    // (the list page computes the true VIP set).
    const segment = total_orders === 0 ? "new" : "returning";
    return { total_orders, total_spend, last_order_date, top: ranked[0] || null, segment };
  }, [orders]);

  const status = profile?.status || "active";

  const toggleBlock = (block) =>
    setConfirm({
      variant: block ? "danger" : "create",
      title: block ? `Block ${user?.full_name || user?.email || "this customer"}?` : `Unblock ${user?.full_name || user?.email || "this customer"}?`,
      description: block ? "They won't be able to place new orders." : "They'll be able to place orders again.",
      confirmLabel: block ? "Block" : "Unblock",
      onConfirm: async () => {
        if (profile) await base44.entities.CustomerProfile.update(profile.id, { status: block ? "blocked" : "active" });
        else await base44.entities.CustomerProfile.create({ user_id: id, status: block ? "blocked" : "active" });
        load();
      },
    });

  const saveNotes = async () => {
    setSavingNote(true);
    try {
      if (profile) await base44.entities.CustomerProfile.update(profile.id, { notes });
      else {
        const created = await base44.entities.CustomerProfile.create({ user_id: id, notes });
        setProfile(created);
      }
      toast({ title: "Notes saved" });
    } catch {
      toast({ title: "Could not save notes", variant: "destructive" });
    }
    setSavingNote(false);
  };

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-lg font-medium">Customer not found</p>
      <Button asChild variant="outline"><Link to="/admin/customers">Back to customers</Link></Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Link to="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{user.full_name || "Customer"}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>{status}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${SEG_BADGE[metrics.segment]}`}>{metrics.segment}</span>
          </div>
          <p className="text-sm text-muted-foreground">{user.email} · joined {fmtDate(user.created_date)}</p>
        </div>
        {status === "blocked" ? (
          <Button variant="outline" onClick={() => toggleBlock(false)}><CheckCircle2 className="mr-1.5 h-4 w-4" /> Unblock</Button>
        ) : (
          <Button variant="outline" onClick={() => toggleBlock(true)}><Ban className="mr-1.5 h-4 w-4" /> Block</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)} className={`relative px-3 py-2 text-sm font-medium transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
              {active && <motion.span layoutId="custTabUnderline" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            </button>
          );
        })}
      </div>

      {tab === "Overview" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Total orders" value={metrics.total_orders} />
          <Stat label="Total spend" value={formatPrice(metrics.total_spend)} />
          <Stat label="Last order" value={fmtDate(metrics.last_order_date)} />
          <div className="rounded-2xl border border-border bg-background p-4 sm:col-span-3">
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Contact</p>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{user.email || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{profile?.phone || orders.find((o) => o.shipping_address?.phone)?.shipping_address?.phone || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Joined</dt><dd className="font-medium">{fmtDate(user.created_date)}</dd></div>
            </dl>
          </div>
        </div>
      )}

      {tab === "Orders" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          {orders.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3"><Link to="/admin/orders" className="font-mono text-xs hover:underline">{o.id.slice(0, 8)}</Link></td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(o.created_date)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[o.status] || "bg-muted text-muted-foreground"}`}>{o.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{Array.isArray(o.items) ? o.items.length : 0}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "Addresses" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.length === 0 ? (
            <p className="rounded-2xl border border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground sm:col-span-2">No saved addresses. Recent shipping addresses from orders are shown below.</p>
          ) : (
            addresses.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border bg-background p-4">
                {a.is_default && <span className="mb-2 inline-block rounded-full bg-foreground px-2 py-0.5 text-[10px] text-background">Default</span>}
                <p className="text-sm font-medium">{a.line1}</p>
                {a.line2 && <p className="text-sm text-muted-foreground">{a.line2}</p>}
                <p className="text-sm text-muted-foreground">{[a.city, a.state, a.postal_code].filter(Boolean).join(", ")}</p>
                <p className="text-sm text-muted-foreground">{a.country}</p>
              </div>
            ))
          )}
          {addresses.length === 0 &&
            orders.filter((o) => o.shipping_address?.line1).slice(0, 2).map((o, i) => (
              <div key={i} className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">From order {o.id.slice(0, 8)}</p>
                <p className="mt-1 text-sm font-medium">{o.shipping_address.line1}</p>
                <p className="text-sm text-muted-foreground">{[o.shipping_address.city, o.shipping_address.state, o.shipping_address.postal_code].filter(Boolean).join(", ")}</p>
                <p className="text-sm text-muted-foreground">{o.shipping_address.country}</p>
              </div>
            ))}
        </div>
      )}

      {tab === "Notes" && (
        <div className="max-w-2xl space-y-3">
          <p className="text-sm text-muted-foreground">Internal notes visible to admins only.</p>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Add internal notes about this customer…" />
          <div className="flex justify-end">
            <Button onClick={saveNotes} disabled={savingNote}>
              {savingNote ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save notes
            </Button>
          </div>
        </div>
      )}

      {tab === "Loyalty" && <CustomerLoyaltyPanel userId={id} />}
      {tab === "Referrals" && <CustomerReferralPanel userId={id} />}

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

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}