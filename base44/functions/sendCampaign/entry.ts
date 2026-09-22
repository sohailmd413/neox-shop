import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendCampaignNow, sendTest } from "../../shared/campaigns.ts";

// Send a campaign, or send a test to the admin's own inbox.
// - { campaign_id, test: true }  → preview English content to the caller's email
// - { campaign_id }               → resolve the segment + send to all opted-in
//                                   recipients (admin / marketing_manager only)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'marketing_manager') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const id = body && body.campaign_id;
    if (!id) return Response.json({ error: 'campaign_id is required' }, { status: 400 });

    const campaign = await base44.asServiceRole.entities.Campaign.get(id);
    if (!campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 });

    if (body.test) {
      if (!user.email) return Response.json({ error: 'Your admin account has no email address' }, { status: 400 });
      const r = await sendTest(base44, campaign, user.email);
      return Response.json({ ok: true, test: true, to: user.email, ...r });
    }

    if (campaign.status === 'sent') return Response.json({ error: 'Campaign already sent' }, { status: 400 });
    if (campaign.status === 'cancelled') return Response.json({ error: 'Campaign is cancelled' }, { status: 400 });

    const r = await sendCampaignNow(base44, campaign);
    return Response.json({ ok: true, ...r });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}