import React, { useEffect, useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Compact loyalty summary for the admin dashboard: total outstanding points
// (the business's redemption liability across all customers), plus points
// awarded and redeemed this calendar month — a quick sense of program scale/cost.
export default function LoyaltyDashboardWidget() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [profiles, txs, settings] = await Promise.all([
          base44.entities.CustomerProfile.list("-created_date", 500).catch(() => []),
          base44.entities.LoyaltyTransaction.list("-created_date", 500).catch(() => []),
          base44.entities.Setting.filter({ key: "store" }).catch(() => []),
        ]);
        if (!alive) return;
        const enabled = (settings && settings[0]?.loyalty_program_enabled) === true;
        if (!enabled) { setData({ enabled: false }); return; }

        const outstanding = (profiles || []).reduce((s, p) => s + (Number(p.loyalty_points_balance) || 0), 0);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        let awarded = 0, redeemed = 0;
        for (const t of (txs || [])) {
          if (!t.created_date) continue;
          if (new Date(t.created_date).getTime() < monthStart) continue;
          const pts = Number(t.points) || 0;
          if (t.type === "earned") awarded += pts;
          else if (t.type === "redeemed") redeemed += Math.abs(pts);
        }
        setData({ enabled: true, outstanding, awarded, redeemed });
      } catch {
        if (alive) setData(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!data) return null;
  if (!data.enabled) return null;

  const stats = [
    { label: "Points outstanding", value: data.outstanding.toLocaleString(), icon: Wallet, color: "text-foreground", hint: "Total redeemable liability" },
    { label: "Awarded this month", value: data.awarded.toLocaleString(), icon: TrendingUp, color: "text-emerald-600" },
    { label: "Redeemed this month", value: data.redeemed.toLocaleString(), icon: TrendingDown, color: "text-blue-600" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-background p-6">
      <h2 className="flex items-center gap-2 text-base font-medium">
        <Sparkles className="h-4 w-4" /> Loyalty program
      </h2>
      <ul className="mt-4 space-y-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Icon className={`h-4 w-4 ${s.color}`} /> {s.label}
              </span>
              <span className="flex flex-col items-end">
                <span className={`font-semibold ${s.color}`}>{s.value}</span>
                {s.hint && <span className="text-[11px] text-muted-foreground">{s.hint}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}