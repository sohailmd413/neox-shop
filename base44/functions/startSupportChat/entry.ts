import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveCustomer } from "../../shared/supportChat.ts";

// Creates a new support ticket plus its first customer message. Works for
// logged-in customers (keyed by user id) and guests (keyed by email). Notifies
// support staff (admins) so the inbox lights up immediately.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { customerId, email, name } = await resolveCustomer(base44, body);

    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    if (!subject) return Response.json({ error: "Subject is required" }, { status: 400 });
    if (!message && attachments.length === 0) return Response.json({ error: "Message is required" }, { status: 400 });
    if (!customerId && !email) return Response.json({ error: "Email is required for guests" }, { status: 400 });

    const now = new Date().toISOString();
    const ticket = await base44.asServiceRole.entities.SupportTicket.create({
      customer_id: customerId,
      customer_name: name,
      customer_email: email,
      subject,
      status: "open",
      priority: "medium",
      last_message_at: now,
      last_message_preview: message.slice(0, 160) || (attachments.length ? "[image]" : ""),
    });

    await base44.asServiceRole.entities.SupportMessage.create({
      ticket_id: ticket.id,
      sender_type: "customer",
      sender_id: customerId || "",
      sender_name: name || email,
      message_text: message,
      attachments,
      read_by_customer: true,
      read_by_staff: false,
    });

    // Notify support staff (admins). Best-effort — never fail the request.
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
      const text = `New support ticket from ${name || email}: "${subject}"`;
      await Promise.all((admins || []).map((a) =>
        base44.asServiceRole.entities.Notification.create({
          recipient_id: a.id,
          type: "info",
          message: text,
          ref_type: "support_ticket",
          ref_id: ticket.id,
          ref_name: subject,
          read: false,
        })
      ));
    } catch { /* notifications are best-effort */ }

    return Response.json({ ok: true, ticket_id: ticket.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}