import React, { useEffect, useState, useCallback } from "react";
import { HelpCircle, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import QuestionForm from "./QuestionForm";

// Customer-facing Q&A section. Shows only answered questions (pending ones are
// hidden by RLS and never fetched here), most recently answered first. Logged-in
// customers get an "Ask a question" button; guests are prompted to log in.
export default function QuestionSection({ productId, lang, t }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qs, me] = await Promise.all([
        base44.entities.ProductQuestion.filter({ product_id: productId, status: "answered" }, "-answered_at", 50),
        base44.auth.me().catch(() => null),
      ]);
      setQuestions(qs || []);
      if (me) setUser(me);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh when a question is answered/updated elsewhere (e.g. admin answers it).
  useEffect(() => {
    const off = base44.entities.ProductQuestion.subscribe(() => load());
    return () => off?.();
  }, [load]);

  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
          <HelpCircle className="h-5 w-5" /> {t("qa.title")}
        </h2>
        {user && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> {t("qa.ask")}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : questions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("qa.empty")}</p>
      ) : (
        <div className="mt-5 space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium text-foreground">
                <span className="text-muted-foreground">Q: </span>
                {q.question_text}
              </p>
              {q.answer_text && (
                <div className="mt-2 rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("qa.answerBy")} {q.answered_by || "Store"}
                  </p>
                  <p className="mt-1 text-sm text-foreground">{q.answer_text}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!user && <p className="mt-3 text-xs text-muted-foreground">{t("qa.loginPrompt")}</p>}

      <QuestionForm
        open={open}
        productId={productId}
        askerName={user?.full_name}
        onDone={() => setOpen(false)}
        onClose={() => setOpen(false)}
        t={t}
        lang={lang}
      />
    </section>
  );
}