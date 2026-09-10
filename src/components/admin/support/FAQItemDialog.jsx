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

// Add/edit dialog for a FAQ item, using the shared right-side Sheet pattern.
// Bilingual question/answer + category, display order, and active toggle.
export default function FAQItemDialog({ open, item, onClose, onSaved }) {
  const isEdit = !!item;
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) setForm(item ? { ...item } : emptyForm());
  }, [open, item]);

  function emptyForm() {
    return { question: "", question_ar: "", answer: "", answer_ar: "", category: "", display_order: 0, active: true };
  }

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.question?.trim() || !form.answer?.trim()) {
      toast({ title: "Question and answer are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        question: form.question.trim(),
        question_ar: (form.question_ar || "").trim(),
        answer: form.answer.trim(),
        answer_ar: (form.answer_ar || "").trim(),
        category: (form.category || "").trim(),
        display_order: Number(form.display_order) || 0,
        active: form.active !== false,
      };
      if (isEdit) await base44.entities.FAQItem.update(item.id, payload);
      else await base44.entities.FAQItem.create(payload);
      toast({ title: isEdit ? "FAQ updated" : "FAQ added" });
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
      await base44.entities.FAQItem.delete(item.id);
      toast({ title: "FAQ deleted" });
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
          <SheetTitle>{isEdit ? "Edit FAQ" : "Add FAQ"}</SheetTitle>
          <SheetDescription>Common questions shown as quick-answers in the support widget.</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <Field label="Question (English)">
            <Input value={form.question} onChange={(e) => set("question", e.target.value)} className="rounded-xl" />
          </Field>
          <Field label="Question (Arabic)">
            <Input value={form.question_ar} onChange={(e) => set("question_ar", e.target.value)} className="rounded-xl" dir="rtl" />
          </Field>
          <Field label="Answer (English)">
            <Textarea value={form.answer} onChange={(e) => set("answer", e.target.value)} className="min-h-[100px] resize-none rounded-xl" />
          </Field>
          <Field label="Answer (Arabic)">
            <Textarea value={form.answer_ar} onChange={(e) => set("answer_ar", e.target.value)} className="min-h-[100px] resize-none rounded-xl" dir="rtl" />
          </Field>
          <Field label="Category (optional)">
            <Input value={form.category} onChange={(e) => set("category", e.target.value)} className="rounded-xl" />
          </Field>
          <Field label="Display order">
            <Input type="number" value={form.display_order} onChange={(e) => set("display_order", e.target.value)} className="rounded-xl" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active !== false} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 rounded border-border" />
            Active (show in widget)
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
          title="Delete this FAQ?"
          description="It will be removed from the support widget immediately."
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