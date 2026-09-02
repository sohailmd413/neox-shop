import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Eye, Ban, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/admin/ui/Dropdown";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import CustomerAnalytics from "@/components/admin/CustomerAnalytics";
import { formatPrice } from "@/lib/format";

const STAFF_ROLES = ["admin", "product_manager", "delivery_manager", "marketing_manager"];
const STATUS_OPTS = [{ label: "Active", value: "active" }, { label: "Blocked", value: "blocked" }];
const SEG_OPTS = [{ label: "New", value: "new" }, { label: "Returning", value: "returning" }, { label: "VIP", value: "vip" }];
const STATUS_BADGE = { active: "bg-emerald-100 text-emerald-700", blocked: "bg-red-100 text-red-700" };
const SEG_BADGE = { new: "bg-sky-100 text-sky-700", returning: "bg-blue-100 text-blue-700", vip: "bg-purple-100 text-purple-700" };

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");

export default function AdminCustomers() {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fSegment, setFSegment] = useState("");
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, o, p] = await Promise.all([
        base44.entities.User.list().catch(() => []),
        base44.entities.Order.list("-created_date", 500).catch(() => []),
        base44.entities.CustomerProfile.list().catch(() => []),
      ]);
      setUsers(u || []);
      setOrders(o || []);
      setProfiles(p || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const profileByUser = useMemo(() => {
    const m = new Map();
    (profiles || []).forEach((p) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  // Compute per-customer metrics live from orders (keyed by order owner = created_by_id).
  const customers = useMemo(() => {
    const cust = (users || []).filter((u) => !STAFF_ROLES.includes(u.role));
    const byUser = new Map();
    (orders || []).forEach((o) => {
      const uid = o.user_id || o.created_by_id;
      if (!uid) return;
      const e = byUser.get(uid) || { total_orders: 0, total_spend: 0, last_order: null };
      e.total_orders += 1;
      e.total_spend += Number(o.total) || 0;
      if (!e.last_order || new Date(o.created_date) > new Date(e.last_order.created_date)) e.last_order = o;
      byUser.set(uid, e);
    });
    // VIP = top 10% by spend (must have ≥1 order).
    const ranked = cust
      .map((u) => ({ u, m: byUser.get(u.id) || { total_orders: 0, total_spend: 0, last_order: null } }))
      .filter((x) => x.m.total_spend > 0)
      .sort((a, b) => b.m.total_spend - a.m.total_spend);
    const vipCount = Math.max(1, Math.ceil(ranked.length * 0.1));
    const vipIds = new Set(ranked.slice(0, vipCount).map((x) => x.u.id));

    return cust.map(({ u }) => {
      const m = byUser.get(u.id) || { total_orders: 0, total_spend: 0, last_order: null };
      const segment = m.total_orders === 0 ? "new" : vipIds.has(u.id) ? "vip" : "returning";
      const prof = profileByUser.get(u.id);
      const phone = prof?.phone || m.last_order?.shipping_address?.phone || "";
      return {
        id: u.id,
        name: u.full_name || u.email || "Customer",
        email: u.email || "",
        phone,
        joined: u.created_date,
        status: prof?.status || "active",
        notes: prof?.notes || "",
        total_orders: m.total_orders,
        total_spend: m.total_spend,
        last_order_date: m.last_order?.created_date || null,
        segment,
      };
    });
  }, [users, orders, profileByUser]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (fStatus && c.status !== fStatus) return false;
      if (fSegment && c.segment !== fSegment) return false;
      const q = search.trim().toLowerCase();
      if (q && ![c.name, c.email, c.phone].filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [customers, fStatus, fSegment, search]);

  const toggleBlock = (c, block) =>
    setConfirm({
      variant: block ? "danger" : "create",
      title: block ? `Block ${c.name}?` : `Unblock ${c.name}?`,
      description: block ? "They won't be able to place new orders." : "They'll be able to place orders again.",
      confirmLabel: block ? "Block" : "Unblock",
      onConfirm: async () => {
        const prof = profileByUser.get(c.id);
        if (prof) await base44.entities.CustomerProfile.update(prof.id, { status: block ? "blocked" : "active" });
        else await base44.entities.CustomerProfile.create({ user_id: c.id, status: block ? "blocked" : "active" });
        load();
      },
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">{customers.length} customers · {customers.filter((c) => c.status === "blocked").length} blocked</p>
      </div>

      <CustomerAnalytics customers={customers} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or phone…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
          />
        </div>
        <div className="w-[160px]">
          <Dropdown type="select" options={STATUS_OPTS} value={fStatus} onChange={setFStatus} placeholder="All statuses" clearable />
        </div>
        <div className="w-[160px]">
          <Dropdown type="select" options={SEG_OPTS} value={fSegment} onChange={setFSegment} placeholder="All segments" clearable />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Total spend</th>
                <th className="px-4 py-3 font-medium">Last order</th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No customers match the current filters.</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link to={`/admin/customers/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.joined)}</td>
                  <td className="px-4 py-3">{c.total_orders}</td>
                  <td className="px-4 py-3 font-medium">{formatPrice(c.total_spend)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.last_order_date)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${SEG_BADGE[c.segment]}`}>{c.segment}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}>{c.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link to={`/admin/customers/${c.id}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="View" title="View"><Eye className="h-4 w-4" /></Link>
                      {c.status === "blocked" ? (
                        <button onClick={() => toggleBlock(c, false)} className="rounded-lg p-2 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600" aria-label="Unblock" title="Unblock"><CheckCircle2 className="h-4 w-4" /></button>
                      ) : (
                        <button onClick={() => toggleBlock(c, true)} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Block" title="Block"><Ban className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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