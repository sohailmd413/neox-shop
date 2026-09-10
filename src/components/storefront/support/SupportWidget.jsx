import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { base44 } from "@/api/base44Client";
import SupportFAQList from "./SupportFAQList";
import SupportStartForm from "./SupportStartForm";
import SupportConversation from "./SupportConversation";
import { fetchMyChat, sendCustomerMessage, getGuestIdentity, setGuestIdentity } from "@/lib/supportChat";

// Floating support chat widget mounted once in the storefront layout so its
// state (open/closed, current ticket, messages) survives page navigation.
// Guests are identified by a persisted name+email; logged-in customers by their
// user id. Polls every 7s for new staff replies and shows an unread badge on
// the bubble while the panel is closed.
export default function SupportWidget() {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("faq"); // faq | form | chat
  const [user, setUser] = useState(null);
  const [guest, setGuest] = useState(getGuestIdentity());
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Load FAQ quick-answers + current user once.
  useEffect(() => {
    (async () => {
      try {
        const [f, me] = await Promise.all([
          base44.entities.FAQItem.filter({ active: true }, "display_order", 50),
          base44.auth.me().catch(() => null),
        ]);
        setFaqs(f || []);
        if (me) setUser(me);
      } catch { /* ignore */ }
    })();
  }, []);

  const identityKey = user ? `u:${user.id}` : guest?.email ? `g:${guest.email}` : null;
  const identity = user ? { customerId: user.id } : guest ? { email: guest.email } : null;

  const reload = useCallback(
    async (markRead) => {
      if (!identity) return;
      setLoading(true);
      try {
        const data = await fetchMyChat({ ...identity, markRead });
        setTicket(data.ticket);
        setMessages(data.messages || []);
        setUnread(markRead ? 0 : data.unread);
        if (data.ticket) setStep("chat");
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [identityKey]
  );

  // Initial load whenever an identity is known.
  useEffect(() => {
    if (identityKey) reload(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey]);

  // Poll for new staff replies. Marks them read only while the panel is open in
  // the conversation view, so the bubble badge reflects unseen replies.
  useEffect(() => {
    if (!identityKey) return;
    const id = setInterval(() => {
      reload(open && step === "chat");
    }, 7000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey, open, step, reload]);

  // Opening the panel into an existing conversation marks staff replies read.
  useEffect(() => {
    if (open && step === "chat" && ticket) reload(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleStarted = async () => {
    setGuest(getGuestIdentity());
    await reload(true);
    setStep("chat");
  };

  const handleSend = async ({ message, attachments }) => {
    if (!ticket) return;
    setSending(true);
    try {
      await sendCustomerMessage({ ticketId: ticket.id, message, attachments, email: guest?.email, customerId: user?.id });
      await reload(true);
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue text-white shadow-elevated transition-transform hover:scale-105 rtl:left-5 rtl:right-auto"
        aria-label={t("support.title")}
      >
        {open ? <MessageCircle className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white rtl:-left-1 rtl:right-auto">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-5 z-50 flex max-h-[72vh] w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-elevated rtl:left-5 rtl:right-auto"
          >
            {step === "faq" && (
              <SupportFAQList faqs={faqs} onStart={() => setStep("form")} onMinimize={() => setOpen(false)} />
            )}
            {step === "form" && (
              <SupportStartForm
                user={user}
                guest={guest}
                onBack={() => setStep("faq")}
                onMinimize={() => setOpen(false)}
                onStarted={handleStarted}
              />
            )}
            {step === "chat" && (
              <SupportConversation
                ticket={ticket}
                messages={messages}
                onSend={handleSend}
                sending={sending}
                loading={loading}
                onBack={() => setStep("faq")}
                onMinimize={() => setOpen(false)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}