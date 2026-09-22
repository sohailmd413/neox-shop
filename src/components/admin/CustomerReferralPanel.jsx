import React, { useEffect, useState } from "react";
import { Loader2, Flag } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STATUS_BADGE = {
  invited: "bg-amber-100 text-amber-700", registered: "bg-blue-100 text-blue-700",
  qualified: "bg-indigo-100 text-indigo-700", rewarded: "bg-emerald-100 text-emerald-700", expired: "bg-zinc-200 text-zinc-600",
};

// Shown on the admin Customer Detail page. Surfaces whether this customer was
// referred (and the status) plus a summary of referrals they've made. Reads
// the Referral entity directly — admin role passes the RLS read rule.
export default function CustomerReferralPanel({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [out, inc] = await Promise.all([
        base44.entities.Referral.filter({ referrer_customer_id: userId }, "-invited_at", 200).catch(() => []),
        base44.entities.Referral.filter({ referred_customer_id: userId }, "-created_date", 5).catch(() => []),
      ]);
      setData({ outgoing: out || [], incoming: (inc || [])[0] || null });
    } catch { setData(null); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [userId]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!data) return <div className="text-sm text-muted-foreground">Could not load referral activity.</div>;

  const counts = { invited: 0, registered: 0, qualified: 0, rewarded: 0, expired: 0 };
  (data.outgoing || []).forEach((r) => { if (counts[r.status] !== undefined) counts[r.status]++; });

  return (
    <div className="space-y-5">
      {data.incoming ? (
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Referred by</p>
          <p className="mt-1 text-sm font-medium">This customer signed up via a referral</p>
          <p className="mt-1 text-xs text-muted-foreground">Status: <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[data.incoming.status] || "bg-muted"}`}>{data.incoming.status}</span></p>
          {data.incoming.referred_reward && <p className="mt-1 text-xs text-muted-foreground">Friend reward: {data.incoming.referred_reward}</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">This customer was not referred by anyone.</div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border p-4">
            <p className="text-2xl font-semibold">{v}</p>
            <p className="text-xs capitalize text-muted-foreground">{k}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        {data.outgoing.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No referrals made.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-3">Friend</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Reward</th></tr>
            </thead>
            <tbody>
              {data.outgoing.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-3" dir="ltr">{r.referred_email || "—"}{r.flagged && <Flag className="ml-1 inline h-3 w-3 text-amber-500" />}</td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status] || "bg-muted"}`}>{r.status}</span></td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{r.referrer_reward || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}