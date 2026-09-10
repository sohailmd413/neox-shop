import React, { useRef, useState } from "react";
import { ArrowLeft, Loader2, Minimize, Paperclip, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { startChat } from "@/lib/supportChat";
import { setGuestIdentity } from "@/lib/supportChat";
import { uploadSupportImage } from "@/lib/supportUpload";

// "Start a conversation" form. Logged-in customers are identified by their
// account; guests must enter name + email so there's a way to follow up. On
// success the guest identity is persisted and onStarted(ticketId) is called.
export default function SupportStartForm({ user, guest, onBack, onMinimize, onStarted }) {
  const { t } = useLanguage();
  const isGuest = !user;
  const [name, setName] = useState(guest?.name || user?.full_name || user?.display_name || "");
  const [email, setEmail] = useState(guest?.email || user?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const addImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSupportImage(file);
      setAttachments((prev) => [...prev, url]);
    } catch {
      setError(t("support.sendError"));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (isGuest) {
      if (!name.trim()) return setError(t("support.nameRequired"));
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError(t("support.emailRequired"));
    }
    if (!subject.trim()) return setError(t("support.subjectRequired"));
    if (!message.trim() && attachments.length === 0) return setError(t("support.messageRequired"));

    setSending(true);
    try {
      const data = await startChat({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        customerId: user?.id,
        attachments,
      });
      if (isGuest) setGuestIdentity({ name: name.trim(), email: email.trim() });
      onStarted(data.ticket_id);
    } catch {
      setError(t("support.sendError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted rtl:rotate-180" aria-label={t("common.back")}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex-1 text-sm font-semibold">{t("support.startChat")}</span>
        <button type="button" onClick={onMinimize} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label={t("support.minimize")}>
          <Minimize className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={submit} className="flex-1 space-y-3 overflow-y-auto p-4">
        {isGuest && (
          <div className="grid gap-3">
            <div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("support.yourName")} className="rounded-xl" />
            </div>
            <div>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("support.yourEmail")} className="rounded-xl" dir="ltr" />
            </div>
          </div>
        )}
        <div>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("support.subjectPh")} className="rounded-xl" />
        </div>
        <div>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("support.messagePh")} className="min-h-[120px] resize-none rounded-xl" />
        </div>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((u, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                <img src={u} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setAttachments((p) => p.filter((_, x) => x !== i))} className="absolute right-0 top-0 rounded-bl-lg bg-foreground/80 px-1 text-background">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted disabled:opacity-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </button>
          <button type="submit" disabled={sending} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-blue py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("support.sending")}</> : t("support.send")}
          </button>
        </div>
      </form>
    </div>
  );
}