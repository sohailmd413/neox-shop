import React, { useEffect, useMemo, useState } from "react";
import { Mail, CalendarClock, FlaskConical } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Dropdown from "@/components/admin/ui/Dropdown";
import ReactQuill from "react-quill-new";
import "quill/dist/quill.snow.css";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { SEGMENT_LABELS, productCardHtml } from "@/lib/campaigns";

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "bullet" }, { list: "ordered" }],
    ["link", "image"],
    ["clean"],
  ],
};
const SEG_OPTS = Object.entries(SEGMENT_LABELS).map(([value, label]) => ({ value, label }));
const isBlankHtml = (h) => !h || !String(h).replace(/<[^>]*>|\s+/g, "").trim();

export default function CampaignDialog({ open, campaign, onClose, onSaved }) {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    base44.entities.Product.list("-created_date", 500).then(setProducts).catch(() => setProducts([]));
    base44.entities.Category.list("sort_order", 200).then(setCategories).catch(() => setCategories([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm(
      campaign
        ? {
            name: campaign.name || "",
            subject_en: campaign.subject_en || "",
            subject_ar: campaign.subject_ar || "",
            content_html_en: campaign.content_html_en || "",
            content_html_ar: campaign.content_html_ar || "",
            target_segment: campaign.target_segment || "all_opted_in",
            target_category: campaign.target_category || "",
            scheduled_send_at: campaign.scheduled_send_at ? campaign.scheduled_send_at.slice(0, 16) : "",
          }
        : {
            name: "", subject_en: "", subject_ar: "", content_html_en: "", content_html_ar: "",
            target_segment: "all_opted_in", target_category: "", scheduled_send_at: "",
          }
    );
  }, [open, campaign]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const categoryOptions = useMemo(
    () => [{ label: "None", value: "" }, ...categories.map((c) => ({ label: c.name, value: c.name }))],
    [categories]
  );
  const productOptions = useMemo(() => products.map((p) => ({ label: p.name, value: p.id })), [products]);

  const insertProduct = (productId) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setForm((f) => ({
      ...f,
      content_html_en: `${f.content_html_en || ""}${productCardHtml(p, "en")}`,
      content_html_ar: `${f.content_html_ar || ""}${productCardHtml(p, "ar")}`,
    }));
    toast({ title: "Product block added to both bodies" });
  };

  const validateBilingual = () => {
    if (!form.subject_en?.trim() || !form.subject_ar?.trim()) return "Subject (English & Arabic) is required.";
    if (isBlankHtml(form.content_html_en) || isBlankHtml(form.content_html_ar)) return "Body (English & Arabic) is required.";
    return null;
  };

  const persist = async (status) => {
    const payload = {
      name: (form.name || "").trim() || "Untitled campaign",
      subject_en: form.subject_en || "",
      subject_ar: form.subject_ar || "",
      content_html_en: form.content_html_en || "",
      content_html_ar: form.content_html_ar || "",
      target_segment: form.target_segment || "all_opted_in",
      target_category: form.target_segment === "specific_category_shoppers" ? form.target_category || "" : "",
      scheduled_send_at: form.scheduled_send_at ? new Date(form.scheduled_send_at).toISOString() : null,
      status,
    };
    if (campaign?.id) return await base44.entities.Campaign.update(campaign.id, payload);
    const me = await base44.auth.me().catch(() => null);
    return await base44.entities.Campaign.create({ ...payload, created_by_name: me?.full_name || "" });
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await persist("draft");
      toast({ title: "Campaign saved as draft" });
      onSaved?.();
      onClose?.();
    } catch {
      toast({ title: "Could not save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const schedule = async () => {
    const err = validateBilingual();
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    if (!form.scheduled_send_at) { toast({ title: "Pick a send date/time", variant: "destructive" }); return; }
    if (new Date(form.scheduled_send_at) <= new Date()) { toast({ title: "Schedule must be in the future", variant: "destructive" }); return; }
    if (form.target_segment === "specific_category_shoppers" && !form.target_category) { toast({ title: "Pick a category", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await persist("scheduled");
      toast({ title: "Campaign scheduled", description: "It will send automatically at the scheduled time." });
      onSaved?.();
      onClose?.();
    } catch {
      toast({ title: "Could not schedule", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    const err = validateBilingual();
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    setTesting(true);
    try {
      let rec = campaign;
      if (!rec?.id) rec = await persist("draft");
      await base44.functions.invoke("sendCampaign", { campaign_id: rec.id, test: true });
      toast({ title: "Test email sent to your inbox", description: "Check the email on your admin account." });
    } catch (e) {
      toast({ title: "Test send failed", description: e?.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-6 py-4 pr-12">
          <Mail className="h-5 w-5" />
          <SheetTitle className="text-lg font-semibold">{campaign ? "Edit campaign" : "New campaign"}</SheetTitle>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Campaign name (internal)</label>
              <Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Autumn sale 2026" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Subject (English)</label>
              <Input value={form.subject_en || ""} onChange={(e) => set("subject_en", e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Subject (Arabic)</label>
              <Input dir="rtl" value={form.subject_ar || ""} onChange={(e) => set("subject_ar", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Body (English)</label>
            <div className="rounded-md border border-border">
              <ReactQuill theme="snow" value={form.content_html_en || ""} onChange={(v) => set("content_html_en", v)} modules={QUILL_MODULES} style={{ height: 200, marginBottom: 42 }} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Body (Arabic)</label>
            <div className="rounded-md border border-border" dir="rtl">
              <ReactQuill theme="snow" value={form.content_html_ar || ""} onChange={(v) => set("content_html_ar", v)} modules={QUILL_MODULES} style={{ height: 200, marginBottom: 42, direction: "rtl" }} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Insert product block</label>
            <Dropdown type="search" options={productOptions} value="" onChange={insertProduct} placeholder="+ Add a product card to both bodies" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Target segment</label>
              <Dropdown type="select" options={SEG_OPTS} value={form.target_segment || "all_opted_in"} onChange={(v) => set("target_segment", v)} placeholder="Select segment" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Schedule send</label>
              <input type="datetime-local" value={form.scheduled_send_at || ""} onChange={(e) => set("scheduled_send_at", e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          {form.target_segment === "specific_category_shoppers" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
              <Dropdown type="search" options={categoryOptions} value={form.target_category || ""} onChange={(v) => set("target_category", v)} placeholder="Select category" />
            </div>
          )}
          <p className="rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            Only customers who opted in to marketing emails are included, regardless of segment. Opted-out customers are never emailed. Each recipient gets the subject/body matching their preferred language.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={sendTest} disabled={testing} className="gap-1.5">
            <FlaskConical className="h-4 w-4" /> {testing ? "Sending…" : "Send test"}
          </Button>
          <Button variant="outline" onClick={saveDraft} disabled={saving}>Save as draft</Button>
          <Button onClick={schedule} disabled={saving} className="gap-1.5">
            <CalendarClock className="h-4 w-4" /> Schedule
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}