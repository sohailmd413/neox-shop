import React, { useEffect, useMemo, useState } from "react";
import { Search, MessageSquare, Filter } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { displayName } from "@/lib/users";
import { Input } from "@/components/ui/input";
import Dropdown from "@/components/admin/ui/Dropdown";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";
import SupportTicketDrawer from "@/components/admin/support/SupportTicketDrawer";
import { loadSupportUnread } from "@/lib/supportBadge";

const STATUS_OPTS = [
  { label: "All statuses", value: "" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];
const PRIORITY_OPTS = [
  { label: "All priorities", value: "" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];
const ASSIGNED_OPTS = [
  { label: "All", value: "" },
  { label: "Assigned to me", value: "mine" },
  { label: "Unassigned", value: "unassigned" },
];

const STATUS_STYLE = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
};
const PRIORITY_DOT = { high: "bg-red-500", medium: "bg-amber-500", low: "bg-slate-400" };

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assigned, setAssigned] = useState("");
  const [active, setActive] = useState(null);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [list, users, mine] = await Promise.all([
        base44.entities.SupportTicket.filter({}, "-last_message_at", 200),
        base44.entities.User.list().catch(() => []),
        base44.auth.me().catch(() => null),
      ]);
      setTickets(list || []);
      setStaffUsers((users || []).filter((u) => u.role === "admin" || u.role === "marketing_manager"));
      setMe(mine);
    } catch {
      setError(true);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const refreshUnread = () => { loadSupportUnread().then(setUnread); };
  useEffect(() => {
    refreshUnread();
    const off = base44.entities.SupportMessage.subscribe(() => refreshUnread());
    return () => off?.();
  }, []);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (status && t.status !== status) return false;
      if (priority && t.priority !== priority) return false;
      if (assigned === "mine" && t.assigned_to_id !== me?.id) return false;
      if (assigned === "unassigned" && t.assigned_to_id) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${t.subject} ${t.customer_name} ${t.customer_email} ${t.last_message_preview}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, status, priority, assigned, search, me]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground">Customer conversations from the storefront chat widget.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, customer, message…" className="pl-9 rounded-xl" />
        </div>
        <Dropdown type="select" options={STATUS_OPTS} value={status} onChange={setStatus} placeholder="All statuses" className="w-[150px]" />
        <Dropdown type="select" options={PRIORITY_OPTS} value={priority} onChange={setPriority} placeholder="All priorities" className="w-[150px]" />
        <Dropdown type="select" options={ASSIGNED_OPTS} value={assigned} onChange={setAssigned} placeholder="All" className="w-[160px]" />
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No tickets" description="Customer support conversations will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Last message</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} onClick={() => setActive(t)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.customer_name || "Guest"}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{t.customer_email || "—"}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="line-clamp-1 font-medium">{t.subject}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{t.last_message_preview}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[t.priority]}`} /> {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {t.last_message_at ? new Date(t.last_message_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{t.assigned_to || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <SupportTicketDrawer
          ticket={active}
          staffUsers={staffUsers}
          me={me}
          onClose={() => setActive(null)}
          onUpdated={() => { load(); refreshUnread(); }}
        />
      )}
    </div>
  );
}