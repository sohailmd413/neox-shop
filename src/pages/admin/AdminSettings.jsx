import { useEffect, useState } from "react";
import { Store, CreditCard, Truck, Percent, FileText, Sparkles, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ensureStoreSetting, patchStoreSetting } from "@/lib/settings";
import { refreshStoreSettingCache } from "@/lib/useStoreSetting";
import GeneralSettings from "@/components/admin/settings/GeneralSettings";
import PaymentsSettings from "@/components/admin/settings/PaymentsSettings";
import ShippingSettings from "@/components/admin/settings/ShippingSettings";
import TaxSettings from "@/components/admin/settings/TaxSettings";
import PoliciesSettings from "@/components/admin/settings/PoliciesSettings";
import LoyaltySettings from "@/components/admin/settings/LoyaltySettings";
import AbandonedCartSettings from "@/components/admin/settings/AbandonedCartSettings";

const TABS = [
  { id: "general", label: "General", icon: Store },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "tax", label: "Tax", icon: Percent },
  { id: "policies", label: "Policies", icon: FileText },
  { id: "loyalty", label: "Loyalty", icon: Sparkles },
  { id: "abandoned_carts", label: "Abandoned carts", icon: ShoppingCart },
];

export default function AdminSettings() {
  const [active, setActive] = useState("general");
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureStoreSetting()
      .then((s) => setSetting(s))
      .catch(() => toast.error("Could not load settings"))
      .finally(() => setLoading(false));
  }, []);

  const save = async (patch) => {
    const updated = await patchStoreSetting(setting.id, patch);
    setSetting((s) => ({ ...s, ...patch, ...updated }));
    // Reload the app-wide cache so storefront header/footer, checkout, and the
    // currency formatter pick up the new values in this session.
    refreshStoreSettingCache();
    toast.success("Settings saved");
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading settings…</div>;
  if (!setting) return <div className="text-sm text-destructive">Could not load settings.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Store settings</h1>
        <p className="text-sm text-muted-foreground">Configure your storefront, payments, shipping, tax, and policies.</p>
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${on ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" /> {t.label}
                {on && <motion.span layoutId="settingsTabUnderline" className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {active === "general" && <GeneralSettings setting={setting} onSave={save} />}
        {active === "payments" && <PaymentsSettings setting={setting} onSave={save} />}
        {active === "shipping" && <ShippingSettings setting={setting} onSave={save} />}
        {active === "tax" && <TaxSettings setting={setting} onSave={save} />}
        {active === "policies" && <PoliciesSettings setting={setting} onSave={save} />}
        {active === "loyalty" && <LoyaltySettings setting={setting} onSave={save} />}
        {active === "abandoned_carts" && <AbandonedCartSettings setting={setting} onSave={save} />}
      </div>
    </div>
  );
}