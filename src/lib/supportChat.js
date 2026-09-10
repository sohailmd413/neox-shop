import { base44 } from "@/api/base44Client";

// Storefront-side support chat helpers. Customer-facing reads/writes go through
// backend functions (service role) so guests with no account can still start
// and continue a conversation. Guest identity (name + email) is persisted in
// localStorage so a returning visitor resumes their open ticket.

const GUEST_KEY = "neox_support_guest";

export function getGuestIdentity() {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setGuestIdentity({ name, email }) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify({ name: name || "", email: (email || "").toLowerCase().trim() }));
  } catch { /* ignore */ }
}

// Fetch the active conversation for the current customer (logged-in or guest).
// `markRead` should be true only while the customer is viewing the panel, so
// unread staff replies clear; background polls pass false to keep the badge.
export async function fetchMyChat({ customerId, email, ticketId, markRead = false }) {
  const res = await base44.functions.invoke("getMySupportChat", {
    customer_id: customerId || null,
    email: email || null,
    ticket_id: ticketId || null,
    mark_read: markRead,
  });
  return res.data;
}

// Start a brand-new ticket with the first message.
export async function startChat({ name, email, subject, message, customerId, attachments }) {
  const res = await base44.functions.invoke("startSupportChat", {
    name, email, subject, message, customer_id: customerId || null, attachments: attachments || [],
  });
  return res.data;
}

// Append a customer message to an existing ticket.
export async function sendCustomerMessage({ ticketId, message, attachments, email, customerId }) {
  const res = await base44.functions.invoke("sendSupportMessage", {
    ticket_id: ticketId, message, attachments: attachments || [], email: email || null, customer_id: customerId || null,
  });
  return res.data;
}