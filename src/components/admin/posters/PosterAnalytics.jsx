import React from "react";
import { Eye, MousePointerClick, TrendingUp, AlertTriangle, Activity, Trophy } from "lucide-react";
import { ctr, expiringSoon, statusOf } from "./posterConfig";

export default function PosterAnalytics({ posters }) {
  const active = posters.filter((p) => statusOf(p) === "active").length;
  const impressions = posters.reduce((s, p) => s + (Number(p.impressions) || 0), 0);
  const clicks = posters.reduce((s, p) => s + (Number(p.clicks) || 0), 0);
  const rate = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const expiring = posters.filter((p) => expiringSoon(p)).length;
  const zeroClick = posters.filter((p) => (p.impressions || 0) > 0 && (p.clicks || 0) === 0).length;

  let best = null;
  posters.forEach((p) => {
    if ((p.impressions || 0) >= 10) {
      if (!best || ctr(p) > ctr(best)) best = p;
    }
  });

  const cards = [
    { label: "Active banners", value: active, icon: Activity, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Impressions", value: impressions.toLocaleString(), icon: Eye, tone: "text-blue-600 bg-blue-50" },
    { label: "Clicks", value: clicks.toLocaleString(), icon: MousePointerClick, tone: "text-violet-600 bg-violet-50", sub: `CTR ${rate.toFixed(1)}%` },
    { label: "Expiring soon", value: expiring, icon: AlertTriangle, tone: "text-amber-600 bg-amber-50" },
    { label: "Zero clicks", value: zeroClick, icon: TrendingUp, tone: "text-rose-600 bg-rose-50" },
    { label: "Best CTR", value: best ? `${ctr(best).toFixed(1)}%` : "—", icon: Trophy, tone: "text-yellow-600 bg-yellow-50", sub: best?.title },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className="mt-2 text-lg font-semibold">{c.value}</p>
            {c.sub && <p className="truncate text-xs text-muted-foreground">{c.sub}</p>}
          </div>
        );
      })}
    </div>
  );
}