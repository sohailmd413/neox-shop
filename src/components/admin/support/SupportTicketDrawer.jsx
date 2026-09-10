import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Paperclip, X, Sparkles, Search, Package, Link2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { displayName } from "@/lib/users";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/admin/ui/Dropdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { uploadSupportImage } from "@/lib/supportUpload";
import { cn } from "@/lib/utils";
import OrderLookupPanel, {
  detectOrderRef, orderRef, STATUS_LABEL, formatOrderDetails,
} from "@/components/admin/support/OrderLookupPanel";

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

const fmtTime = (d) => {
  try { return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
};

// Right-side chat thread drawer for a single support ticket. Staff read the full
// conversation, reply (canned/quick replies + smart suggestions + variable
// substitution), look up & link orders inline, and manage status/priority/assignee.
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
  const [canned, setCanned] = useState([]);
  const [orderContext, setOrderContext] = useState(null);
  const [lastInsertedCannedId, setLastInsertedCannedId] = useState(null);
  const [orderLookupOpen, setOrderLookupOpen] = useState(false);
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

  // Canned responses (active, most-used first).
  useEffect(() => {
    base44.entities.CannedResponse.filter({ is_active: true }, "-usage_count", 200)
      .then(setCanned).catch(() => setCanned([]));
  }, []);

  // Order context: prefer a linked order (ticket.order_id), else the customer's latest order.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let o = null;
      if (ticket?.order_id) {
        try { o = await base44.entities.Order.get(ticket.order_id); } catch { o = null; }
      }
      if (!o && ticket?.customer_id) {
        try {
          const ords = await base44.entities.Order.filter({ user_id: ticket.customer_id }, "-created_date", 1);
          o = ords?.[0] || null;
        } catch { o = null; }
      }
      if (!cancelled) setOrderContext(o);
    };
    load();
    return () => { cancelled = true; };
  }, [ticket?.id, ticket?.order_id, ticket?.customer_id]);

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

  // Smart suggestions: keyword/category match against the customer's most recent message.
  const lastCustomerMsg = useMemo(
    () => [...messages].reverse().find((m) => m.sender_type === "customer")?.message_text || "",
    [messages]
  );
  const isArabicContext = /[\u0600-\u06FF]/.test(lastCustomerMsg);
  const detectedOrderRef = useMemo(() => detectOrderRef(lastCustomerMsg), [lastCustomerMsg]);

  const suggestions = useMemo(() => {
    if (!lastCustomerMsg || canned.length === 0) return [];
    const msg = lastCustomerMsg.toLowerCase();
    const scored = canned
      .map((c) => {
        const terms = [...(c.keywords || []), c.category].filter(Boolean).map((t) => t.toLowerCase());
        let score = 0;
        for (const t of terms) if (t && msg.includes(t)) score++;
        return { c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || (b.c.usage_count || 0) - (a.c.usage_count || 0))
      .slice(0, 3)
      .map((x) => x.c);
    return scored;
  }, [lastCustomerMsg, canned]);

  const substitute = (raw) => {
    if (!raw) return "";
    const name = ticket?.customer_name || ticket?.customer_email || "there";
    const orderId = orderContext ? orderRef(orderContext) : null;
    const orderStatus = orderContext ? (STATUS_LABEL[orderContext.status] || orderContext.status) : null;
    return raw
      .replace(/\{customer_name\}/g, name)
      .replace(/\{order_id\}/g, orderId || "{order_id}")
      .replace(/\{order_status\}/g, orderStatus || "{order_status}");
  };

  const insertText = (body) => {
    setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${body}` : body));
  };

  const insertCanned = (c) => {
    if (!c) return;
    const raw = isArabicContext ? (c.message_text_ar || c.message_text_en) : (c.message_text_en || c.message_text_ar);
    insertText(substitute(raw));
    setLastInsertedCannedId(c.id);
  };

  const insertOrderDetails = (o) => insertText(formatOrderDetails(o, isArabicContext));

  // Link a looked-up order to the ticket so future messages keep its context.
  const useOrder = async (o) => {
    setOrderContext(o);
    setOrderLookupOpen(false);
    try {
      await base44.entities.SupportTicket.update(ticket.id, { order_id: o.id });
      onUpdated();
    } catch { /* best-effort */ }
  };

  const cannedOptions = canned.map((c) => ({
    label: c.category ? `${c.title} · ${c.category}` : c.title,
    value: c.id,
  }));

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
      if (lastInsertedCannedId) {
        try {
          await base44.entities.CannedResponse.updateMany({ id: lastInsertedCannedId }, { $inc: { usage_count: 1 } });
        } catch { /* best-effort */ }
      }
      setText("");
      setAttachments([]);
      setLastInsertedCannedId(null);
      await loadMessages(false);
      onUpdated();
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/30 px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            messages.map((m, i) => {
              const mine = m.sender_type === "staff";
              const groupStart = i === 0 || messages[i - 1].sender_type !== m.sender_type;
              return (
                <div
                  key={m.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start", groupStart ? "mt-4 first:mt-0" : "mt-1")}
                >
                  <div className="max-w-[80%]">
                    {groupStart && (
                      <div className={cn("mb-1 flex items-center gap-1.5 text-[11px]", mine ? "justify-end" : "justify-start")}>
                        <span className="font-medium text-muted-foreground">{m.sender_name || (mine ? "Support" : "Customer")}</span>
                        <span className="text-muted-foreground/70">{fmtTime(m.created_date)}</span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm shadow-sm",
                        mine ? "bg-brand-blue text-white" : "bg-background text-foreground border border-border"
                      )}
                    >
                      {m.message_text && <p className="whitespace-pre-wrap break-words">{m.message_text}</p>}
                      {m.attachments?.length > 0 && (
                        <div className={cn("flex flex-wrap gap-1.5", m.message_text && "mt-2")}>
                          {m.attachments.map((u, idx) => (
                            <a key={idx} href={u} target="_blank" rel="noopener noreferrer">
                              <img src={u} alt="" className="h-20 w-20 rounded-lg object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: suggestions/quick-replies band → order context → composer */}
        <div className="border-t border-border bg-background">
          {/* Suggested + quick replies (tinted band for separation) */}
          <div className="space-y-2 border-b border-border bg-muted/30 px-4 py-3">
            {suggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Suggested:
                </span>
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => insertCanned(c)}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-xs transition-colors hover:border-foreground/30 hover:bg-muted"
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            )}
            <Dropdown
              type="search"
              options={cannedOptions}
              value=""
              onChange={(id) => insertCanned(canned.find((c) => c.id === id))}
              placeholder="Quick replies"
              emptyText="No canned responses."
              className="w-full"
              size="sm"
            />
          </div>

          {/* Order context + lookup */}
          <div className="space-y-2 border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {orderContext ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ring/10 px-2.5 py-1 text-xs">
                  <Package className="h-3.5 w-3.5 text-ring" />
                  <span className="font-medium">{orderRef(orderContext)}</span>
                  <span className="text-muted-foreground">· {STATUS_LABEL[orderContext.status] || orderContext.status}</span>
                  <button type="button" onClick={() => insertOrderDetails(orderContext)} className="font-medium text-ring hover:underline">
                    Insert details
                  </button>
                </span>
              ) : detectedOrderRef ? (
                <button
                  type="button"
                  onClick={() => setOrderLookupOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700 transition-colors hover:bg-amber-100"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="font-medium">{detectedOrderRef}</span>
                  <span className="text-amber-600/80">mentioned · Look up</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOrderLookupOpen((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1 text-xs transition-colors hover:text-foreground",
                  orderContext ? "text-muted-foreground" : "text-ring"
                )}
              >
                <Search className="h-3.5 w-3.5" /> Look up order
              </button>
            </div>

            {orderLookupOpen && (
              <OrderLookupPanel
                ticket={ticket}
                onUseOrder={useOrder}
                onInsert={insertOrderDetails}
                isArabic={isArabicContext}
                autoQuery={detectedOrderRef || ""}
              />
            )}
          </div>

          {/* Attachments + composer */}
          <div className="space-y-2 px-4 py-3">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
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

            <form onSubmit={reply} className="flex items-end gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ""; }} />
              <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-11 w-11 shrink-0">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(e); } }}
                placeholder="Type a reply…"
                className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl"
                rows={1}
              />
              <Button type="submit" size="icon" disabled={sending || (!text.trim() && attachments.length === 0)} className="h-11 w-11 shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:rotate-180" />}
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}