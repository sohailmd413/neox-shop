import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

// "Ask a question" modal. Creates a ProductQuestion with status=pending (hidden
// from the storefront until an admin answers it).
export default function QuestionForm({ open, productId, askerName, onDone, onClose, t, lang }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      toast({ title: t("qa.empty"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.ProductQuestion.create({
        product_id: productId,
        question_text: text.trim(),
        asker_name: askerName || "Customer",
        status: "pending",
      });
      toast({ title: t("qa.submitted") });
      onDone?.();
    } catch {
      toast({ title: t("qa.error"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{t("qa.ask")}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("qa.placeholder")}
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("product.submitting") : t("qa.submit")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}