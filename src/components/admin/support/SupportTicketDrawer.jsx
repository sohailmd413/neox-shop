import React, { useEffect, useRef, useState } from "react";
import { Loader2, Send, Paperclip, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { displayName } from "@/lib/users";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/admin/ui/Dropdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { uploadSupportImage } from "@/lib/supportUpload";
import { cn } from "@/lib/utils";

const STATUS_OPTS = [
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];
const PRIORITY_OPTS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const STATUS_STYLE = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
};
const PRIORITY_STYLE = {
  high: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  low: "bg-muted text-muted-foreground",
};

// Right-side chat thread drawer for a single support ticket. Staff can read the
// full conversation, reply, and change status/priority/assignment. Polls for new
// customer messages every 7s and marks them read_by_staff on view.
export default function SupportTicketDrawer({ ticket, staffUsers, me, onClose, onUpdated }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(ticket?.status || "open");
  const [priority, setPriority] = useState(ticket?.priority || "medium");
  const [assigneeId, setAssigneeId] = useState(ticket?.assigned_to_id || "");
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  const loadMessages = async (markRead) => {
    try {
      const list = await base44.entities.SupportMessage.filter({ ticket_id: ticket.id }, "created_date", 500);
      setMessages(list || []);
      if (markRead) {
        const unread = (list || []).some((m) => m.sender_type === "customer" && !m.read_by_staff);
        if (unread) {
          try {
            await base44.entities.SupportMessage.updateMany(
              { ticket_id: ticket.id, sender_type: "customer", read_by_staff: false },
              { $set: { read_by_staff: true } }
            );
            onUpdated();
          } catch { /* best-effort */ }
        }
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadMessages(true);
    const id = setInterval(() => loadMessages(false), 7000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id]);

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

  const reply = async (e) => {
    e.preventDefault();
    const msg = text.trim();
    if ((!msg && attachments.length === 0) || sending) return;
    setSending(true);
    try {
      await base44.entities.SupportMessage.create({
        ticket_id: ticket.id,
        sender_type: "staff",
        sender_id: me?.id || "",
        sender_name: displayName(me) || "Support",
        message_text: msg,
        attachments,
        read_by_customer: false,
        read_by_staff: true,
      });
      await base44.entities.SupportTicket.update(ticket.id, {
        last_message_at: new Date().toISOString(),
        last_message_preview: msg.slice(0, 160) || (attachments.length ? "[image]" : ""),
        status: status === "open" ? "pending" : status,
      });
      setText("");
      setAttachments([]);
      await loadMessages(false);
      onUpdated();
      // Notify the customer (in-app) if they're a registered user.
      if (ticket.customer_id) {
        try {
          await base44.entities.Notification.create({
            recipient_id: ticket.customer_id,
            type: "info",
            message: `Support replied to: "${ticket.subject}"`,
            ref_type: "support_ticket",
            ref_id: ticket.id,
            ref_name: ticket.subject,
            read: false,
          });
        } catch { /* best-effort */ }
      }
    } catch {
      toast({ title: "Could not send reply", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const updateMeta = async (patch) => {
    try {
      await base44.entities.SupportTicket.update(ticket.id, patch);
      onUpdated();
    } catch {
      toast({ title: "Could not update ticket", variant: "destructive" });
    }
  };

  const changeStatus = (v) => { setStatus(v); updateMeta({ status: v }); };
  const changePriority = (v) => { setPriority(v); updateMeta({ priority: v }); };
  const changeAssignee = (v) => {
    setAssigneeId(v);
    const u = staffUsers.find((s) => s.id === v);
    updateMeta({ assigned_to_id: v || null, assigned_to: u ? displayName(u) : null });
  };

  const assigneeOptions = [{ label: "Unassigned", value: "" }, ...staffUsers.map((u) => ({ label: displayName(u) || u.email, value: u.id }))];

  return (
    <Sheet open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="line-clamp-1">{ticket?.subject}</SheetTitle>
          <SheetDescription>
            {ticket?.customer_name || ticket?.customer_email || "Guest"} · {ticket?.customer_email}
          </SheetDescription>
        </SheetHeader>

        {/* Controls */}
        <div className="grid grid-cols-3 gap-2 border-b border-border p-3">
          <div>
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">Status</p>
            <Dropdown type="select" options={STATUS_OPTS} value={status} onChange={changeStatus} placeholder="Status" className="w-full" />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">Priority</p>
            <Dropdown type="select" options={PRIORITY_OPTS} value={priority} onChange={changePriority} placeholder="Priority" className="w-full" />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">Assignee</p>
            <Dropdown type="select" options={assigneeOptions} value={assigneeId} onChange={changeAssignee} placeholder="Unassigned" className="w-full" />
          </div>
        </div>

        {/* Thread */}
        <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-muted/30 p-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_type === "staff";
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
                      {m.sender_name || (mine ? "Support" : "Customer")} · {new Date(m.created_date).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer */}
        <form onSubmit={reply} className="border-t border-border p-3">
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
            <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-9 w-9 shrink-0">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(e); } }}
              placeholder="Type a reply…"
              className="min-h-[40px] max-h-28 flex-1 resize-none rounded-xl"
              rows={1}
            />
            <Button type="submit" size="icon" disabled={sending || (!text.trim() && attachments.length === 0)} className="h-9 w-9 shrink-0">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:rotate-180" />}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}