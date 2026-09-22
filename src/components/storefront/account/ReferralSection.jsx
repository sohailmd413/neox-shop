import React, { useEffect, useState } from "react";
import { Gift, Copy, Check, Mail, MessageCircle, Send, Users, TrendingUp, Award, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { useToast } from "@/components/ui/use-toast";
import { buildReferralLink, buildShareMessage } from "@/lib/referral";

const STATUS_BADGE = {
  invited: "bg-amber-100 text-amber-700",
  registered: "bg-blue-100 text-blue-700",
  qualified: "bg-indigo-100 text-indigo-700",
  rewarded: "bg-emerald-100 text-emerald-700",
  expired: "bg-zinc-200 text-zinc-600",
};

// Customer-facing "Refer a friend" tab. Pulls the caller's code, live program
// config (Give/Get), masked history, stats, and owned reward coupons from the
// getMyReferral backend function. All reward math is server-side.
export default function ReferralSection() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getMyReferral", {});
      setData(res?.data || null);
    } catch { setData(null); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!data || !data.enabled) return <div className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">{t("referral.disabled")}</div>;

  const cfg = data.config || {};
  const link = buildReferralLink(data.code);
  const friendGets = cfg.referredRewardType === "loyalty_points" ? `${cfg.referredRewardValue} ${t("referral.points")}` : `${formatPrice(cfg.referredRewardValue)} ${t("referral.off")}`;
  const youGet = cfg.referrerRewardType === "loyalty_points" ? `${cfg.referrerRewardValue} ${t("referral.points")}` : `${formatPrice(cfg.referrerRewardValue)} ${t("referral.off")}`;
  const shareMsg = buildShareMessage(data.code, lang, friendGets);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: t("referral.copied") });
      setTimeout(() => setCopied(false), 1500);
    } catch { toast({ title: t("referral.copy") }); }
  };
  const shareWhatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, "_blank");
  const shareEmail = () => { window.location.href = `mailto:?subject=${encodeURIComponent("NeoX Shop")}&body=${encodeURIComponent(shareMsg)}`; };

  const sendInvite = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast({ title: t("referral.inviteError"), variant: "destructive" }); return; }
    setSending(true);
    try {
      const res = await base44.functions.invoke("createReferralInvite", { email: email.trim(), origin: window.location.origin });
      if (res?.data?.error) toast({ title: res.data.error, variant: "destructive" });
      else { toast({ title: t("referral.inviteSent") }); setEmail(""); }
    } catch (err) {
      toast({ title: err?.response?.data?.error || t("referral.inviteError"), variant: "destructive" });
    }
    setSending(false);
  };

  const statusLabel = (s) => ({
    invited: t("referral.stInvited"), registered: t("referral.stRegistered"), qualified: t("referral.stQualified"), rewarded: t("referral.stRewarded"), expired: t("referral.stExpired"),
  })[s] || s;
  const locale = lang === "ar" ? "ar-EG" : undefined;
  const stats = data.stats || {};

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-foreground to-foreground/80 p-6 text-background">
        <div className="flex items-center gap-2 text-sm opacity-80"><Gift className="h-4 w-4" /> {t("referral.title")}</div>
        <p className="mt-2 text-sm opacity-90">{t("referral.subtitle")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.12em] opacity-70">{t("referral.give")}</p>
            <p className="mt-1 text-xl font-semibold">{friendGets}</p>
            <p className="text-xs opacity-70">{t("referral.onFirstOrder")}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.12em] opacity-70">{t("referral.get")}</p>
            <p className="mt-1 text-xl font-semibold">{youGet}</p>
            <p className="text-xs opacity-70">{t("referral.onFirstOrder")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border p-5">
        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{t("referral.yourLink")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code dir="ltr" className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-sm">{link}</code>
          <button onClick={() => copy(link)} className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm text-background hover:opacity-90">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {t("referral.copyLink")}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("referral.yourCode")}: <span dir="ltr" className="font-mono font-medium">{data.code}</span></p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={shareWhatsapp} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><MessageCircle className="h-4 w-4" /> {t("referral.whatsapp")}</button>
          <button onClick={shareEmail} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><Mail className="h-4 w-4" /> {t("referral.email")}</button>
          <button onClick={() => copy(shareMsg)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><Copy className="h-4 w-4" /> {t("referral.copy")}</button>
        </div>
      </div>

      <form onSubmit={sendInvite} className="rounded-2xl border border-border p-5">
        <p className="text-sm font-medium">{t("referral.inviteBy")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("referral.friendEmail")} className="min-w-[200px] flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40" />
          <button type="submit" disabled={sending} className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {sending ? t("referral.sending") : t("referral.send")}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[{ k: "invited", l: t("referral.statsInvited"), i: Users }, { k: "registered", l: t("referral.statsRegistered"), i: TrendingUp }, { k: "qualified", l: t("referral.statsQualified"), i: Award }, { k: "rewarded", l: t("referral.statsRewarded"), i: Gift }].map((s) => {
          const Icon = s.i;
          return (
            <div key={s.k} className="rounded-2xl border border-border p-4">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-2 text-2xl font-semibold">{stats[s.k] || 0}</p>
              <p className="text-xs text-muted-foreground">{s.l}</p>
            </div>
          );
        })}
      </div>

      {data.rewards && data.rewards.length > 0 && (
        <div className="rounded-2xl border border-border p-5">
          <p className="text-sm font-medium">{t("referral.yourRewards")}</p>
          <div className="mt-3 space-y-2">
            {data.rewards.map((c) => (
              <div key={c.code} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span dir="ltr" className="font-mono font-medium">{c.code}</span>
                <span className="text-muted-foreground">{formatPrice(c.value)} {t("referral.off")}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("referral.useAtCheckout")}</p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-medium">{t("referral.history")}</h2>
        {(!data.referrals || data.referrals.length === 0) ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">{t("referral.empty")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-3">{t("referral.friend")}</th><th className="px-3 py-3">{t("referral.status")}</th><th className="px-3 py-3">{t("referral.reward")}</th><th className="px-3 py-3">{t("referral.date")}</th></tr>
              </thead>
              <tbody>
                {data.referrals.map((r) => {
                  const date = r.registered_at || r.invited_at;
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-3" dir="ltr">{r.referred_email}</td>
                      <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status] || "bg-muted"}`}>{statusLabel(r.status)}</span></td>
                      <td className="px-3 py-3 text-muted-foreground">{r.referrer_reward || "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{date ? new Date(date).toLocaleDateString(locale) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}