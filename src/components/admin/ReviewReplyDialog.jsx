import React, { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TEMPLATES = [
  { label: "Thank you", text: "Thank you so much for your kind review! We're thrilled you love your purchase. 🌟" },
  { label: "Apology", text: "We're sorry your experience didn't meet expectations. Please reach out so we can make it right." },
  { label: "Resolution", text: "Thanks for your feedback. We've shared this with our team and are working to improve. Contact us for help." },
];

export default function ReviewReplyDialog({ review, onClose, onReply }) {
  const [text, setText] = useState(review.admin_reply?.text || "");

  const submit = () => {
    if (!text.trim()) return;
    onReply(text.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-medium">
            <MessageSquare className="h-4 w-4" /> Reply to review
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-3 line-clamp-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">“{review.comment || review.title || ""}”</span> — {review.rating}★ by {review.author || "Anonymous"}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => (
            <button key={t.label} type="button" onClick={() => setText(t.text)}
              className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">
              {t.label}
            </button>
          ))}
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Write your public reply…"
          className="mt-3" />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!text.trim()}>Post reply</Button>
        </div>
      </div>
    </div>
  );
}

export { TEMPLATES };