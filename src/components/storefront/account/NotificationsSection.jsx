import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Bell, BellOff, ShieldAlert } from "lucide-react";
import { subscribePush, unsubscribePush, getPushPermission, pushSupported } from "@/lib/push";

const EMAIL_TOGGLES = [
  { key: "order_updates", label: "Order updates", desc: "Status changes and delivery alerts." },
  { key: "marketing_opt_in", label: "Promotional offers", desc: "Sales, discounts and marketing emails." },
  { key: "price_drop", label: "Price drop alerts", desc: "When wishlist items go on sale." },
  { key: "new_arrivals", label: "New arrivals", desc: "New products in categories you follow." },
];

const PUSH_TOGGLES = [
  { key: "order_updates", label: "Order updates", desc: "Push when your order status changes." },
  { key: "price_drops", label: "Price drops", desc: "Push when a wishlist item goes on sale." },
  { key: "restocks", label: "Back in stock", desc: "Push when a watched item is back in stock." },
  { key: "broadcasts", label: "Promo broadcasts", desc: "Major sale events. Requires marketing opt-in too." },
];

export default function NotificationsSection({ user, reload }) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({
    order_updates: user.customer_notifications?.order_updates ?? true,
    marketing_opt_in: !!user.marketing_opt_in,
    price_drop: user.customer_notifications?.price_drop ?? true,
    new_arrivals: user.customer_notifications?.new_arrivals ?? false,
  });
  const [pushPrefs, setPushPrefs] = useState(() => ({
    enabled: user.push_preferences?.enabled ?? true,
    order_updates: user.push_preferences?.order_updates ?? true,
    price_drops: user.push_preferences?.price_drops ?? true,
    restocks: user.push_preferences?.restocks ?? true,
    broadcasts: user.push_preferences?.broadcasts ?? true,
  }));
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushPerm, setPushPerm] = useState(() => getPushPermission());
  const supported = pushSupported();

  const save = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("updateCustomerProfile", {
        marketing_opt_in: prefs.marketing_opt_in,
        customer_notifications: {
          order_updates: prefs.order_updates,
          price_drop: prefs.price_drop,
          new_arrivals: prefs.new_arrivals,
        },
        push_preferences: pushPrefs,
      });
      await reload();
      toast({ title: "Preferences saved" });
    } catch {
      toast({ title: "Could not save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const enablePush = async () => {
    setPushBusy(true);
    try {
      const r = await subscribePush();
      setPushPerm(getPushPermission());
      if (r.ok) toast({ title: "Push notifications enabled" });
      else if (r.reason === "denied") toast({ title: "Permission denied", description: "Enable it from your browser site settings.", variant: "destructive" });
      else if (r.reason === "unsupported") toast({ title: "Push not supported on this browser", variant: "destructive" });
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    setPushBusy(true);
    try {
      await unsubscribePush();
      setPushPerm(getPushPermission());
      toast({ title: "Push notifications disabled" });
    } finally {
      setPushBusy(false);
    }
  };

  const pushActive = supported && pushPerm === "granted";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Notification preferences</h2>
        <p className="text-sm text-muted-foreground">Choose what updates you want to receive.</p>
      </div>

      {/* Email preferences */}
      <div className="overflow-hidden rounded-2xl border border-border divide-y divide-border">
        {EMAIL_TOGGLES.map((t) => (
          <label key={t.key} className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
            <div>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <Switch checked={prefs[t.key]} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [t.key]: v }))} />
          </label>
        ))}
      </div>

      {/* Browser push preferences */}
      <div className="rounded-2xl border border-border">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5 border-b border-border">
          <div>
            <p className="text-sm font-medium">Browser push notifications</p>
            <p className="text-xs text-muted-foreground">Real-time alerts on this device — even when you're not on the site.</p>
          </div>
          {!supported ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldAlert className="h-3.5 w-3.5" /> Not supported</span>
          ) : pushActive ? (
            <Button size="sm" variant="outline" onClick={disablePush} disabled={pushBusy}>
              <BellOff className="mr-1.5 h-3.5 w-3.5" /> {pushBusy ? "Disabling…" : "Disable on this device"}
            </Button>
          ) : pushPerm === "denied" ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldAlert className="h-3.5 w-3.5" /> Blocked in browser settings</span>
          ) : (
            <Button size="sm" onClick={enablePush} disabled={pushBusy}>
              {pushBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Bell className="mr-1.5 h-3.5 w-3.5" />} Enable on this device
            </Button>
          )}
        </div>

        {/* Granular per-type push toggles. Shown whenever push is supported, so the
            customer can tune types before/after enabling. These are honored server-side. */}
        {supported && (
          <div className="divide-y divide-border">
            <label className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
              <div>
                <p className="text-sm font-medium">All push notifications</p>
                <p className="text-xs text-muted-foreground">Master switch for this account.</p>
              </div>
              <Switch checked={pushPrefs.enabled} onCheckedChange={(v) => setPushPrefs((p) => ({ ...p, enabled: v }))} />
            </label>
            {PUSH_TOGGLES.map((t) => (
              <label key={t.key} className={`flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5 ${!pushPrefs.enabled ? "opacity-50 pointer-events-none" : ""}`}>
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                <Switch
                  checked={pushPrefs[t.key]}
                  onCheckedChange={(v) => setPushPrefs((p) => ({ ...p, [t.key]: v }))}
                  disabled={!pushPrefs.enabled}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save preferences</Button>
      </div>
    </div>
  );
}