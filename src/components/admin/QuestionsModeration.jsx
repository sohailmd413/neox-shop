import React, { useEffect, useMemo, useState } from "react";
import { HelpCircle, Trash2, Search, MessageSquare } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState, TableSkeleton } from "@/components/shared/StateViews";

// Q&A moderation view rendered inside the Reviews admin section (the "Q&A" tab).
// Self-contained: loads its own questions + products, lets an admin answer
// (or edit an answer) and delete. Answering sets status=answered so the
// question becomes publicly visible on the storefront product page.
export default function QuestionsModeration() {
  const [questions, setQuestions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pending");
  const [answerFor, setAnswerFor] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [qs, ps] = await Promise.all([
        base44.entities.ProductQuestion.list("-created_date", 200),
        base44.entities.Product.list("-created_date", 500),
      ]);
      setQuestions(qs || []);
      setProducts(ps || []);
    } catch {
      setQuestions([]);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const filtered = useMemo(() => {
    let arr = questions;
    if (tab === "pending") arr = arr.filter((q) => q.status !== "answered");
    else if (tab === "answered") arr = arr.filter((q) => q.status === "answered");
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(
        (q) =>
          `${q.question_text || ""} ${q.answer_text || ""} ${productMap[q.product_id]?.name || ""}`.toLowerCase().includes(s)
      );
    }
    return arr;
  }, [questions, tab, search, productMap]);

  const counts = useMemo(
    () => ({
      pending: questions.filter((q) => q.status !== "answered").length,
      answered: questions.filter((q) => q.status === "answered").length,
    }),
    [questions]
  );

  const patch = (id, data) => setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...data } : q)));

  const submitAnswer = async () => {
    if (!answerFor || !answerText.trim()) return;
    setSaving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const by = me?.full_name || "Store";
      const now = new Date().toISOString();
      await base44.entities.ProductQuestion.update(answerFor.id, {
        answer_text: answerText.trim(),
        answered_by: by,
        answered_at: now,
        status: "answered",
      });
      patch(answerFor.id, { answer_text: answerText.trim(), answered_by: by, answered_at: now, status: "answered" });
      toast({ title: "Answer posted" });
      setAnswerFor(null);
      setAnswerText("");
    } catch {
      toast({ title: "Could not post answer", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await base44.entities.ProductQuestion.delete(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast({ title: "Question deleted" });
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    }
  };

  const openAnswer = (q) => {
    setAnswerFor(q);
    setAnswerText(q.answer_text || "");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions or products…" className="pl-9" />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted/60 p-1">
          <Button size="sm" variant={tab === "pending" ? "secondary" : "ghost"} onClick={() => setTab("pending")}>
            Pending <span className="rounded-full bg-foreground/10 px-1.5 text-xs">{counts.pending}</span>
          </Button>
          <Button size="sm" variant={tab === "answered" ? "secondary" : "ghost"} onClick={() => setTab("answered")}>
            Answered <span className="rounded-full bg-foreground/10 px-1.5 text-xs">{counts.answered}</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No questions"
          description={tab === "pending" ? "Customer questions will appear here for answering." : "No answered questions yet."}
          className="py-10"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const prod = productMap[q.product_id];
            return (
              <div key={q.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{prod?.name || "Unknown product"}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      <span className="text-muted-foreground">Q: </span>
                      {q.question_text}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      by {q.asker_name || "Anonymous"} · {new Date(q.created_date).toLocaleDateString()}
                    </p>
                    {q.answer_text && (
                      <div className="mt-2 rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-medium text-muted-foreground">A · {q.answered_by || "Store"}</p>
                        <p className="mt-1 text-sm">{q.answer_text}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="outline" onClick={() => openAnswer(q)}>
                      <MessageSquare className="mr-1 h-3.5 w-3.5" /> {q.answer_text ? "Edit answer" : "Answer"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(q.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {answerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-base font-semibold">Answer question</h3>
            <p className="mt-2 rounded-lg bg-muted/40 p-3 text-sm">{answerFor.question_text}</p>
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={4}
              placeholder="Type your answer…"
              className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAnswerFor(null)}>
                Cancel
              </Button>
              <Button onClick={submitAnswer} disabled={saving || !answerText.trim()}>
                {saving ? "Saving…" : "Post answer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}