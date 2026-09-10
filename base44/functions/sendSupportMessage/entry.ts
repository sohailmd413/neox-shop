import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveCustomer, ownsTicket } from "../../shared/supportChat.ts";

// A customer (logged-in or guest) appends a message to their existing ticket.
// Verifies ownership so a guest can only post into the ticket tied to their
// email. Reopens a "pending" ticket (waiting on customer) back to "open" so
// staff see the new reply. Notifies the assigned staff member, or all admins
// when unassigned.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const ticketId = String(body.ticket_id || "");
    if (!ticketId) return Response.json({ error: "ticket_id is required" }, { status: 400 });

    const message = String(body.message || "").trim();
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    if (!message && attachments.length === 0) return Response.json({ error: "Message is required" }, { status: 400 });

    const { customerId, email, name } = await resolveCustomer(base44, body);
    const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticketId);
    if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });
    if (!ownsTicket(ticket, customerId, email)) return Response.json({ error: "Not authorized" }, { status: 403 });

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.SupportMessage.create({
      ticket_id: ticketId,
      sender_type: "customer",
      sender_id: customerId || "",
      sender_name: ticket.customer_name || ticket.customer_email,
      message_text: message,
      attachments,
      read_by_customer: true,
      read_by_staff: false,
    });
    await base44.asServiceRole.entities.SupportTicket.update(ticketId, {
      last_message_at: now,
      last_message_preview: message.slice(0, 160) || (attachments.length ? "[image]" : ""),
      status: ticket.status === "pending" ? "open" : ticket.status,
    });

    // Notify staff.
    try {
      let recipientIds = [];
      if (ticket.assigned_to_id) recipientIds = [ticket.assigned_to_id];
      else {
        const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
        recipientIds = (admins || []).map((u) => u.id);
      }
      const text = `New message on ticket: "${ticket.subject}"`;
      await Promise.all(recipientIds.map((rid) =>
        base44.asServiceRole.entities.Notification.create({
          recipient_id: rid, type: "info", message: text,
          ref_type: "support_ticket", ref_id: ticketId, ref_name: ticket.subject, read: false,
        })
      ));
    } catch { /* best-effort */ }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}