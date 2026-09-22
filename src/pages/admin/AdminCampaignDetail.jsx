import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Send, Ban } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/StateViews";
import CampaignDialog from "@/components/admin/campaigns/CampaignDialog";
import { SEGMENT_LABELS, STATUS_LABELS, STATUS_BADGE } from "@/lib/campaigns";

const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

export default function AdminCampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialog, setDialog] = useState({ open: false });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const rec = await base44.entities.Campaign.get(id);
      setC(rec);
    } catch {
      setError(true);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />;
  if (error || !c)
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Campaign not found"
        action={<Button onClick={() => navigate("/admin/campaigns")}>Back to campaigns</Button>}
      />
    );

  const sendTest = async () => {
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
  const cancel = async () => {
    try {
      await base44.entities.Campaign.update(c.id, { status: "cancelled" });
      load();
      toast({ title: "Campaign cancelled" });
    } catch {
      toast({ title: "Could not cancel", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/campaigns")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
          <p className="text-sm text-muted-foreground">
            {SEGMENT_LABELS[c.target_segment] || c.target_segment}
            {c.target_category ? ` · ${c.target_category}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs ${STATUS_BADGE[c.status] || ""}`}>{STATUS_LABELS[c.status] || c.status}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Scheduled" value={fmt(c.scheduled_send_at)} />
        <Stat label="Sent at" value={fmt(c.sent_at)} />
        <Stat label="Recipients emailed" value={c.sent_count ?? 0} />
      </div>

      <div className="rounded-2xl border border-border bg-background p-5">
        <p className="text-sm font-medium">Performance tracking</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Open and click tracking aren't available with the connected email service, so open_count / click_count aren't
          shown here. The recipient count (sent_count) is the reliable delivery metric.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setDialog({ open: true })} className="gap-1.5"><Pencil className="h-4 w-4" /> Edit</Button>
        <Button variant="outline" onClick={sendTest} disabled={busy} className="gap-1.5"><Send className="h-4 w-4" /> Send test</Button>
        {(c.status === "scheduled" || c.status === "draft") && (
          <Button variant="outline" onClick={cancel} className="gap-1.5"><Ban className="h-4 w-4" /> Cancel campaign</Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Preview title="English preview" subject={c.subject_en} html={c.content_html_en} dir="ltr" />
        <Preview title="Arabic preview" subject={c.subject_ar} html={c.content_html_ar} dir="rtl" />
      </div>

      <CampaignDialog open={dialog.open} campaign={c} onClose={() => setDialog({ open: false })} onSaved={load} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Preview({ title, subject, html, dir }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">Subject: {subject || "—"}</p>
      <div
        className="mt-3 overflow-y-auto rounded-lg border border-border bg-white p-4"
        style={{ maxHeight: 360 }}
        dir={dir}
        dangerouslySetInnerHTML={{ __html: html || "<p class='text-muted-foreground'>No content</p>" }}
      />
    </div>
  );
}