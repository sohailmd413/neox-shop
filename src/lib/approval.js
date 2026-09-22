// Shared approval-workflow helpers for Products and Categories.
// Centralizes validation, status transitions, audit-trail history, and
// in-app notifications so the form, the Approvals queue, and the storefront
// all behave consistently.

import { base44 } from "@/api/base44Client";

export const APPROVAL_STATUSES = ["draft", "pending_approval", "rejected", "active"];

// Rejects values that look like leftover test/garbage text (e.g. "vdd", "test",
// "asdf", "xxxx"). Applied to category name/name_ar so stray artifacts can't be
// saved going forward.
const TEST_ARTIFACT_RE = /^(test|testing|asdf|fdsa|vdd|xxx|qwerty|abcdef?|foobar?|lorem|ipsum|sample|placeholder|untitled|none|n\/a|tbd|\.+)$/i;
export function looksLikeTestArtifact(str) {
  const s = String(str || "").trim();
  if (!s) return false;
  if (TEST_ARTIFACT_RE.test(s)) return true;
  if (s.length <= 6 && /^([a-z0-9])\1{2,}$/i.test(s)) return true; // "aaaa", "vvv"
  return false;
}

export function userName(user) {
  if (!user) return "Admin";
  return (user.display_name && String(user.display_name).trim()) || user.full_name || user.email || "Admin";
}

// Minimum required fields for a category to be submitted for approval.
export function validateCategory(form) {
  const errors = {};
  if (!form.name || !String(form.name).trim()) errors.name = "Category name is required";
  if (!form.name_ar || !String(form.name_ar).trim()) errors.name_ar = "Arabic name is required before publishing";
  if (looksLikeTestArtifact(form.name)) errors.name = "This looks like test text — enter a real category name.";
  if (looksLikeTestArtifact(form.name_ar)) errors.name_ar = "This looks like test text — enter a real Arabic name.";
  if (form.description && String(form.description).trim() && (!form.description_ar || !String(form.description_ar).trim())) {
    errors.description_ar = "Arabic description is required before publishing";
  }
  if (!form.image_url) errors.image = "Add a category image before submitting for approval";
  return { valid: Object.keys(errors).length === 0, errors };
}

// Append an audit-trail entry to an existing approval_history array.
export function appendHistory(history, entry) {
  return [...(history || []), { ...entry, at: new Date().toISOString() }];
}

function entityApi(name) {
  return base44.entities[name];
}

// Submit a draft (product or category) for admin sign-off.
// `record` is the freshly-saved draft record (must have an id and any prior history).
export async function submitForApproval(entityName, record, user) {
  const history = appendHistory(record.approval_history, {
    action: "submitted",
    by: userName(user),
    by_id: user.id,
  });
  const patch = {
    status: "pending_approval",
    submitted_by: userName(user),
    submitted_by_id: user.id,
    submitted_at: new Date().toISOString(),
    rejection_reason: null,
    approval_history: history,
  };
  if (entityName === "Category") patch.active = false;
  return entityApi(entityName).update(record.id, patch);
}

// Approve a pending submission. `self` is flagged in the audit log when the
// approver is the same person who submitted (segregation of duties).
export async function approveItem(entityName, record, user) {
  const selfApprove = !!record.submitted_by_id && record.submitted_by_id === user.id;
  const history = appendHistory(record.approval_history, {
    action: "approved",
    by: userName(user),
    by_id: user.id,
    self: selfApprove,
  });
  const patch = {
    status: "active",
    rejection_reason: null,
    approval_history: history,
  };
  if (entityName === "Category") patch.active = true;
  const updated = await entityApi(entityName).update(record.id, patch);
  // Notify the original submitter (if it wasn't a self-approval).
  if (record.submitted_by_id && !selfApprove) {
    notify(record.submitted_by_id, {
      type: "approved",
      message: `Your ${entityLabel(entityName)} "${record.name}" was approved and is now live.`,
      ref_type: entityName.toLowerCase(),
      ref_id: record.id,
      ref_name: record.name,
    });
  }
  audit(user, entityName === "Product" ? "product_approved" : "category_approved", entityName, record.id);
  if (entityName === "Product" && record.vendor_id) {
    try { await base44.functions.invoke("notifyVendorProductDecision", { vendor_id: record.vendor_id, decision: "approved", product_name: record.name }); } catch {}
  }
  return updated;
}

// Reject a pending submission back to draft, storing the mandatory reason.
export async function rejectItem(entityName, record, user, reason) {
  const selfApprove = !!record.submitted_by_id && record.submitted_by_id === user.id;
  const history = appendHistory(record.approval_history, {
    action: "rejected",
    by: userName(user),
    by_id: user.id,
    reason,
    self: selfApprove,
  });
  const patch = {
    status: "rejected",
    rejection_reason: reason,
    approval_history: history,
  };
  if (entityName === "Category") patch.active = false;
  const updated = await entityApi(entityName).update(record.id, patch);
  if (record.submitted_by_id) {
    notify(record.submitted_by_id, {
      type: "rejected",
      message: `Your ${entityLabel(entityName)} "${record.name}" was rejected: ${reason}`,
      ref_type: entityName.toLowerCase(),
      ref_id: record.id,
      ref_name: record.name,
      reason,
    });
  }
  audit(user, entityName === "Product" ? "product_rejected" : "category_rejected", entityName, record.id);
  if (entityName === "Product" && record.vendor_id) {
    try { await base44.functions.invoke("notifyVendorProductDecision", { vendor_id: record.vendor_id, decision: "rejected", product_name: record.name, reason }); } catch {}
  }
  return updated;
}

function entityLabel(name) {
  return name === "Category" ? "category" : "product";
}

async function notify(recipientId, payload) {
  try {
    await base44.entities.Notification.create({ recipient_id: recipientId, read: false, ...payload });
  } catch {
    /* notifications are best-effort */
  }
}

// Best-effort audit trail. Every vendor application + product/category
// approval/rejection decision is recorded in the AuditLog with the acting staff
// member, the action, and the target — visible to admins.
function audit(user, action, targetType, targetId) {
  try {
    base44.entities.AuditLog.create({ admin_id: user.id, action, target_type: targetType, target_id: targetId });
  } catch {
    /* audit is best-effort; must never block the approval */
  }
}

// Pending-count badge data for the Approvals nav item.
export async function loadPendingCounts() {
  try {
    const [products, categories] = await Promise.all([
      base44.entities.Product.filter({ status: "pending_approval" }, "-submitted_at", 200),
      base44.entities.Category.filter({ status: "pending_approval" }, "-submitted_at", 200),
    ]);
    return { products: (products || []).length, categories: (categories || []).length };
  } catch {
    return { products: 0, categories: 0 };
  }
}

// Rejected-count badge data for the Rejected nav item. Independent from
// loadPendingCounts so an item is only ever counted in one queue.
export async function loadRejectedCounts() {
  try {
    const [products, categories] = await Promise.all([
      base44.entities.Product.filter({ status: "rejected" }, "-updated_date", 200),
      base44.entities.Category.filter({ status: "rejected" }, "-updated_date", 200),
    ]);
    return { products: (products || []).length, categories: (categories || []).length };
  } catch {
    return { products: 0, categories: 0 };
  }
}