import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Plus, Pencil, Trash2, Eye, Send, Ban, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";
import CampaignDialog from "@/components/admin/campaigns/CampaignDialog";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { SEGMENT_LABELS, STATUS_LABELS, STATUS_BADGE } from "@/lib/campaigns";

const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

export default function AdminCampaigns() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState({ open: false, campaign: null });
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await base44.entities.Campaign.list("-created_date", 200);
      setRows(list || []);
    } catch {
      setError(true);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter(
    (c) => !search || `${c.name} ${c.subject_en || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const sendTest = async (c) => {
    setBusy(true);
    try {
      await base44.functions.invoke("sendCampaign", { campaign_id: c.id, test: true });
      toast({ title: "Test email sent to your inbox" });
    } catch {
      toast({ title: "Test send failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  const cancel = async (c) => {
    try {
      await base44.entities.Campaign.update(c.id, { status: "cancelled" });
      load();
      toast({ title: "Campaign cancelled" });
    } catch {
      toast({ title: "Could not cancel", variant: "destructive" });
    }
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await base44.entities.Campaign.delete(toDelete.id);
      setRows((p) => p.filter((x) => x.id !== toDelete.id));
      toast({ title: "Campaign deleted" });
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Scheduled promotional emails to opted-in customers.</p>
        </div>
        <Button onClick={() => setDialog({ open: true, campaign: null })} className="gap-1.5">
          <Plus className="h-4 w-4" /> New campaign
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns…" className="rounded-xl pl-9" />
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Mail} title="No campaigns yet" description="Create a promotional email and schedule it to your opted-in customers." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 text-right font-medium">Sent</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/admin/campaigns/${c.id}`)} className="text-left font-medium hover:underline">{c.name}</button>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{c.subject_en || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{SEGMENT_LABELS[c.target_segment] || c.target_segment}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[c.status] || ""}`}>{STATUS_LABELS[c.status] || c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmt(c.scheduled_send_at)}</td>
                  <td className="px-4 py-3 text-right">{c.sent_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/admin/campaigns/${c.id}`)} title="View"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => sendTest(c)} title="Send test" disabled={busy}><Send className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, campaign: c })} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      {(c.status === "scheduled" || c.status === "draft") && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cancel(c)} title="Cancel"><Ban className="h-4 w-4" /></Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setToDelete(c)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CampaignDialog
        open={dialog.open}
        campaign={dialog.campaign}
        onClose={() => setDialog({ open: false, campaign: null })}
        onSaved={load}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        variant="delete"
        title={`Delete ${toDelete?.name}?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}