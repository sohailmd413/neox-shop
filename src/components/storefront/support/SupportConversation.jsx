import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Minimize, Paperclip, X, Send } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Textarea } from "@/components/ui/textarea";
import { uploadSupportImage } from "@/lib/supportUpload";
import { cn } from "@/lib/utils";

function timeAgo(iso, lang) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === "ar" ? "الآن" : "just now";
  if (m < 60) return lang === "ar" ? `قبل ${m} د` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === "ar" ? `قبل ${h} س` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return lang === "ar" ? `قبل ${d} ي` : `${d}d ago`;
}

// Active conversation view: scrollable message thread + reply composer. The
// parent owns polling and passes the latest messages/ticket in; onSend posts a
// new customer message (parent refetches afterwards).
export default function SupportConversation({ ticket, messages, onSend, sending, loading, onBack, onMinimize }) {
  const { t, lang } = useLanguage();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const addImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSupportImage(file);
      setAttachments((p) => [...p, url]);
    } catch { /* ignore */ } finally {
      setUploading(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const msg = text.trim();
    if ((!msg && attachments.length === 0) || sending) return;
    onSend({ message: msg, attachments });
    setText("");
    setAttachments([]);
  };

  const closed = ticket?.status === "closed" || ticket?.status === "resolved";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted rtl:rotate-180" aria-label={t("common.back")}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-semibold">{ticket?.subject || t("support.title")}</p>
          <p className="text-xs text-muted-foreground">{t("support.openTicket")}</p>
        </div>
        <button type="button" onClick={onMinimize} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label={t("support.minimize")}>
          <Minimize className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-muted/30 p-3">
        {loading && messages.length === 0 && (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        )}
        {messages.length === 0 && !loading && (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("support.noConvo")}</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_type === "customer";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-brand-blue text-white" : "bg-background border border-border")}>
                {m.message_text && <p className="whitespace-pre-wrap break-words">{m.message_text}</p>}
                {m.attachments?.length > 0 && (
                  <div className={cn("mt-1.5 flex flex-wrap gap-1.5", m.message_text && "pt-1")}>
                    {m.attachments.map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noopener noreferrer">
                        <img src={u} alt="" className="h-20 w-20 rounded-lg object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-muted-foreground")}>
                  {mine ? t("support.you") : t("support.staff")} · {timeAgo(m.created_date, lang)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {closed ? (
        <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">{t("support.closed")}</div>
      ) : (
        <form onSubmit={submit} className="border-t border-border p-3">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((u, i) => (
                <div key={i} className="relative h-14 w-14 overflow-hidden rounded-lg border border-border">
                  <img src={u} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setAttachments((p) => p.filter((_, x) => x !== i))} className="absolute right-0 top-0 rounded-bl-lg bg-foreground/80 px-1 text-background">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ""; }} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted disabled:opacity-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </button>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } }}
              placeholder={t("support.replyPlaceholder")}
              className="min-h-[40px] max-h-28 flex-1 resize-none rounded-xl"
              rows={1}
            />
            <button type="submit" disabled={sending || (!text.trim() && attachments.length === 0)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-white disabled:opacity-50">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:rotate-180" />}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}