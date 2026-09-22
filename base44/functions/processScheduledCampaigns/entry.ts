import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendCampaignNow } from "../../shared/campaigns.ts";

// Scheduled job (runs every few minutes). Finds campaigns with status=scheduled
// whose scheduled_send_at has passed and sends each to its resolved opted-in
// segment. Auth is not required — this is a platform-scheduled maintenance task
// (it only ever reads campaigns and sends to opted-in customers).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date().toISOString();
    const due = await base44.asServiceRole.entities.Campaign.filter({ status: "scheduled" }, "-created_date", 200) || [];
    const results = [];
    for (const c of due) {
      if (c.scheduled_send_at && new Date(c.scheduled_send_at).toISOString() <= now) {
        try {
          const r = await sendCampaignNow(base44, c);
          results.push({ id: c.id, name: c.name, ...r });
        } catch (e) {
          results.push({ id: c.id, name: c.name, error: e.message });
        }
      }
    }
    return Response.json({ ok: true, processed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}