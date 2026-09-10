import React, { useEffect, useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { pointsValue } from "@/lib/loyalty";

// Customer-facing Loyalty Rewards tab in the Account section. Reads the
// caller's balance, value, program config and transaction history via the
// getMyLoyalty backend function (the balance lives on the admin-only
// CustomerProfile, so it can't be read directly).
export default function LoyaltySection() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getMyLoyalty", {});
      setData(res?.data || null);
    } catch {
      setData(null);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data || !data.enabled) {
    return (
      <div className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        {t("loyalty.disabled")}
      </div>
    );
  }

  const cfg = data.config || {};
  const tx = data.transactions || [];
  const locale = lang === "ar" ? "ar-EG" : undefined;
  const typeMeta = {
    earned: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", label: t("loyalty.earned") },
    redeemed: { icon: TrendingDown, color: "text-blue-600", bg: "bg-blue-50", label: t("loyalty.redeemed") },
    expired: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: t("loyalty.expired") },
    admin_adjustment: { icon: Sparkles, color: "text-foreground", bg: "bg-muted", label: t("loyalty.adjusted") },
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-foreground to-foreground/80 p-6 text-background">
        <div className="flex items-center gap-2 text-sm opacity-80">
          <Sparkles className="h-4 w-4" /> {t("loyalty.title")}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] opacity-70">{t("loyalty.balance")}</p>
            <p className="mt-1 text-4xl font-semibold font-display">{data.balance.toLocaleString(locale)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] opacity-70">{t("loyalty.value")}</p>
            <p className="mt-1 text-2xl font-semibold">{formatPrice(data.pointsValue)}</p>
          </div>
        </div>
        <p className="mt-4 text-sm opacity-90">
          {t("loyalty.earnPer")} {formatPrice(cfg.pointsPerCurrency)} {t("loyalty.spent")}. {t("loyalty.redeemFor")} {cfg.redeemPoints} {t("loyalty.pointsForOff")} {formatPrice(cfg.redeemAmount)} {t("loyalty.off")}.
        </p>
      </div>

      {data.expiringSoon && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            <b>{data.expiringSoon.points.toLocaleString(locale)}</b> {t("loyalty.expiringDesc")}
          </span>
        </div>
      )}

      <div>
        <h2 className="text-lg font-medium">{t("loyalty.history")}</h2>
        {tx.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            {t("loyalty.empty")}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {tx.map((tr) => {
              const m = typeMeta[tr.type] || typeMeta.admin_adjustment;
              const Icon = m.icon;
              const positive = Number(tr.points) > 0;
              return (
                <li key={tr.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${m.bg} ${m.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">{tr.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.label} · {new Date(tr.created_date).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${positive ? "text-emerald-600" : "text-foreground"}`}>
                    {positive ? "+" : ""}{Number(tr.points).toLocaleString(locale)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}