import React, { useEffect, useMemo, useState } from "react";
import { Users, TrendingUp, Award, Gift, Loader2, Flag } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STATUS_BADGE = {
  invited: "bg-amber-100 text-amber-700", registered: "bg-blue-100 text-blue-700",
  qualified: "bg-indigo-100 text-indigo-700", rewarded: "bg-emerald-100 text-emerald-700", expired: "bg-zinc-200 text-zinc-600",
};
const FILTERS = ["all", "invited", "registered", "qualified", "rewarded", "expired"];
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");

// Admin referral dashboard: aggregate stats, conversion rate, top referrers,
// and a filterable list of all referrals. Admin-only data via getReferralAdmin.
export default function AdminReferrals() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try { const res = await base44.functions.invoke("getReferralAdmin", {}); setData(res?.data || null); }
    catch { setData(null); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const list = (data && data.list) || [];
    return filter === "all" ? list : list.filter((r) => r.status === filter);
  }, [data, filter]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!data) return <div className="text-sm text-destructive">Could not load referrals.</div>;
  const s = data.stats || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Referrals</h1>
        <p className="text-sm text-muted-foreground">{s.total || 0} total · {data.conversion || 0}% conversion (registered → rewarded)</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[{ k: "invited", l: "Invited", i: Users }, { k: "registered", l: "Registered", i: TrendingUp }, { k: "qualified", l: "Qualified", i: Award }, { k: "rewarded", l: "Rewarded", i: Gift }, { k: "expired", l: "Expired", i: Flag }].map((m) => {
          const Icon = m.i;
          return (
            <div key={m.k} className="rounded-2xl border border-border p-4">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-2 text-2xl font-semibold">{s[m.k] || 0}</p>
              <p className="text-xs text-muted-foreground">{m.l}</p>
            </div>
          );
        })}
      </div>

      {data.topReferrers && data.topReferrers.length > 0 && (
        <div className="rounded-2xl border border-border p-5">
          <p className="text-sm font-medium">Top referrers</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.topReferrers.map((r, i) => (
              <span key={r.id} className="rounded-full bg-muted px-3 py-1.5 text-sm">#{i + 1} {r.name} · {r.qualified}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs capitalize transition-colors ${filter === f ? "bg-foreground text-background" : "border border-border hover:bg-muted"}`}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">No referrals.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-3">Referrer</th><th className="px-3 py-3">Referred</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Invited</th><th className="px-3 py-3">Rewarded</th><th className="px-3 py-3">Rewards</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-3 font-medium">{r.referrer_name}{r.flagged && <Flag className="ml-1 inline h-3 w-3 text-amber-500" />}</td>
                  <td className="px-3 py-3">{r.referred_name}<br /><span className="text-xs text-muted-foreground" dir="ltr">{r.referred_email}</span></td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[r.status] || "bg-muted"}`}>{r.status}</span></td>
                  <td className="px-3 py-3 text-muted-foreground">{fmtDate(r.invited_at)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{fmtDate(r.rewarded_at)}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{r.referred_reward && <div>Friend: {r.referred_reward}</div>}{r.referrer_reward && <div>Referrer: {r.referrer_reward}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}