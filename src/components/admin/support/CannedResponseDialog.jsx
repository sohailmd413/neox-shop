import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

// Add/edit dialog for a canned response, using the shared right-side Sheet pattern.
// Bilingual message text + category + keywords (for auto-suggest) + active toggle.
export default function CannedResponseDialog({ open, item, onClose, onSaved }) {
  const isEdit = !!item;
  const [form, setForm] = useState(emptyForm());
  const [keywordsText, setKeywordsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setForm(item ? { ...item } : emptyForm());
      setKeywordsText(item?.keywords ? item.keywords.join(", ") : "");
    }
  }, [open, item]);

  function emptyForm() {
    return { title: "", message_text_en: "", message_text_ar: "", category: "", is_active: true };
  }

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.title?.trim() || !form.message_text_en?.trim()) {
      toast({ title: "Title and English message are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const keywords = keywordsText.split(",").map((k) => k.trim()).filter(Boolean);
      const payload = {
        title: form.title.trim(),
        message_text_en: form.message_text_en.trim(),
        message_text_ar: (form.message_text_ar || "").trim(),
        category: (form.category || "").trim(),
        keywords,
        is_active: form.is_active !== false,
      };
      if (isEdit) await base44.entities.CannedResponse.update(item.id, payload);
      else await base44.entities.CannedResponse.create({ ...payload, usage_count: 0 });
      toast({ title: isEdit ? "Canned response updated" : "Canned response added" });
      onSaved();
      onClose();
    } catch {
      toast({ title: "Could not save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await base44.entities.CannedResponse.delete(item.id);
      toast({ title: "Canned response deleted" });
      onSaved();
      onClose();
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit canned response" : "Add canned response"}</SheetTitle>
          <SheetDescription>
            Reusable replies for the support inbox. Use {"{customer_name}"}, {"{order_id}"}, {"{order_status}"} placeholders.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <Field label="Title (internal label)">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Order delay apology" className="rounded-xl" />
          </Field>
          <Field label="Category (optional)">
            <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Shipping" className="rounded-xl" />
          </Field>
          <Field label="Message (English)">
            <Textarea value={form.message_text_en} onChange={(e) => set("message_text_en", e.target.value)} className="min-h-[110px] resize-none rounded-xl" />
          </Field>
          <Field label="Message (Arabic)">
            <Textarea value={form.message_text_ar} onChange={(e) => set("message_text_ar", e.target.value)} className="min-h-[110px] resize-none rounded-xl" dir="rtl" />
          </Field>
          <Field label="Keywords (comma-separated, for auto-suggest)">
            <Input value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} placeholder="e.g. refund, money, back" className="rounded-xl" />
            <p className="text-[11px] text-muted-foreground">When a customer's message contains these words, this reply is suggested automatically.</p>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active !== false} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 rounded border-border" />
            Active (show in quick replies)
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          {isEdit ? (
            <Button variant="outline" onClick={() => setConfirmDelete(true)} className="text-destructive hover:bg-destructive/10">Delete</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </SheetContent>

      {confirmDelete && (
        <ConfirmDialog
          open
          onClose={() => setConfirmDelete(null)}
          variant="danger"
          title="Delete this canned response?"
          description="It will be removed from the staff quick-replies list immediately."
          confirmLabel="Delete"
          onConfirm={remove}
        />
      )}
    </Sheet>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}