import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const TOGGLES = [
  { key: "order_updates", label: "Order updates", desc: "Status changes and delivery alerts." },
  { key: "marketing_opt_in", label: "Promotional offers", desc: "Sales, discounts and marketing emails." },
  { key: "price_drop", label: "Price drop alerts", desc: "When wishlist items go on sale." },
  { key: "new_arrivals", label: "New arrivals", desc: "New products in categories you follow." },
];

export default function NotificationsSection({ user, reload }) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({
    order_updates: user.customer_notifications?.order_updates ?? true,
    marketing_opt_in: !!user.marketing_opt_in,
    price_drop: user.customer_notifications?.price_drop ?? true,
    new_arrivals: user.customer_notifications?.new_arrivals ?? false,
  });
  const [saving, setSaving] = useState(false);

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
      });
      await reload();
      toast({ title: "Preferences saved" });
    } catch { toast({ title: "Could not save", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Notification preferences</h2>
        <p className="text-sm text-muted-foreground">Choose what updates you want to receive.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border divide-y divide-border">
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
            <div>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <Switch checked={prefs[t.key]} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [t.key]: v }))} />
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save preferences</Button>
      </div>
    </div>
  );
}