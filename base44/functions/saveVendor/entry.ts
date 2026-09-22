import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { encryptPII, decryptPII, maskBank } from "../../shared/piiCrypto.ts";

// Create or update a vendor, encrypting bank_account_details before it's stored.
// Only admin and product_manager may save vendors (per Vendor RLS). The bank
// field is only accepted/encrypted when the caller is an admin — product_manager
// edits never touch bank_account_details, preserving the existing encrypted value.
//
// On update, approval transitions are stamped server-side so approved_by always
// reflects the acting admin (never trusted from the client):
//  - status -> "active" (from a non-active state): sets approved_at + approved_by,
//    clears rejection_reason.
//  - status -> "pending_verification": clears approved_at/approved_by/rejection
//    (re-submission / reset).
//  - status -> "rejected": rejection_reason is passed through from the caller.
// Returns the saved vendor with bank details resolved (full for admin, masked
// for product_manager) so the UI can refresh consistently.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== "admin" && user.role !== "product_manager")) return Response.json({ error: 'Forbidden' }, { status: 403 });
    let body = {}; try { body = await req.json(); } catch (e) { body = {}; }
    const { id, data } = body || {};
    if (!data || typeof data !== "object") return Response.json({ error: 'Missing data' }, { status: 400 });
    const payload = { ...data };

    // Server-side approval stamping on status transitions.
    if (id && payload.status) {
      const existing = await base44.entities.Vendor.get(id).catch(() => null);
      if (existing && existing.status !== payload.status) {
        if (payload.status === "active") {
          payload.approved_at = new Date().toISOString();
          payload.approved_by = user.full_name || user.email || "Admin";
          payload.rejection_reason = "";
        } else if (payload.status === "pending_verification") {
          payload.approved_at = "";
          payload.approved_by = "";
          payload.rejection_reason = "";
        }
        // On "rejected", rejection_reason is passed through from the caller (admin).
        // On suspended/inactive, leave approval stamps as-is (an approved vendor
        // paused then reactivated should keep its original approved_by).
      }
    }

    if (user.role === "admin" && payload.bank_account_details !== undefined) {
      payload.bank_account_details = await encryptPII(payload.bank_account_details);
    } else {
      delete payload.bank_account_details;
    }
    let saved;
    if (id) saved = await base44.entities.Vendor.update(id, payload);
    else saved = await base44.entities.Vendor.create(payload);
    if (saved) {
      const dec = await decryptPII(saved.bank_account_details);
      saved.bank_account_details = user.role === "admin" ? (dec || "") : maskBank(dec);
    }
    // Audit-log vendor application decisions (who approved/rejected, when, which vendor).
    if (id && payload.status && payload.status !== "inactive" && payload.status !== "suspended") {
      const action = payload.status === "active" ? "vendor_approved" : payload.status === "rejected" ? "vendor_rejected" : null;
      if (action) {
        await base44.asServiceRole.entities.AuditLog.create({
          admin_id: user.id, action, target_type: "Vendor", target_id: id,
        }).catch(() => {});
      }
    }
    return Response.json({ vendor: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}