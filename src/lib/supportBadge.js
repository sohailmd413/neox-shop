import { base44 } from "@/api/base44Client";

// Unread customer-message count for the Admin Support nav badge. Mirrors the
// loadPendingCounts/loadRejectedCounts pattern used for the Moderation group.
export async function loadSupportUnread() {
  try {
    const list = await base44.entities.SupportMessage.filter(
      { sender_type: "customer", read_by_staff: false },
      "-created_date",
      200
    );
    return (list || []).length;
  } catch {
    return 0;
  }
}