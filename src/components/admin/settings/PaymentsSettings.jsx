import { useState } from "react";
import { Save, CreditCard, Banknote, Wallet, Smartphone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

const METHODS = [
  { id: "card", label: "Card", desc: "Stripe-powered card payments.", icon: CreditCard },
  { id: "cod", label: "Cash on delivery", desc: "Pay in cash when the order arrives.", icon: Banknote },
  { id: "upi", label: "UPI", desc: "Instant bank transfer via UPI.", icon: Smartphone },
  { id: "wallet", label: "Wallet", desc: "Digital wallet payments.", icon: Wallet },
  { id: "net_banking", label: "Net banking", desc: "Direct bank transfer.", icon: Building2 },
];

export default function PaymentsSettings({ setting, onSave }) {
  const [enabled, setEnabled] = useState(setting.payment_methods_enabled || []);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const toggle = (m) => {
    if (enabled.includes(m)) setConfirm(m);
    else setEnabled((prev) => [...prev, m]);
  };

  const doDisable = () => {
    setEnabled((prev) => prev.filter((x) => x !== confirm));
    setConfirm(null);
  };

  const save = async () => {
    if (enabled.length === 0) {
      setConfirm("__none__");
      return;
    }
    setSaving(true);
    try {
      await onSave({ payment_methods_enabled: enabled });
    } finally {
      setSaving(false);
    }
  };

  const confirmMethod = METHODS.find((m) => m.id === confirm);
  const isDisableAll = confirm === "__none__";

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-muted-foreground">Enable the payment methods customers can use at checkout.</p>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {METHODS.map((m) => {
          const Icon = m.icon;
          const on = enabled.includes(m.id);
          return (
            <div key={m.id} className="flex items-center justify-between gap-4 px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </div>
              <Switch checked={on} onCheckedChange={() => toggle(m.id)} />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-1">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save payments"}
        </Button>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={isDisableAll ? save : doDisable}
        variant="warning"
        title={isDisableAll ? "Disable all payment methods?" : `Disable ${confirmMethod?.label}?`}
        description={
          isDisableAll
            ? "Customers won't be able to check out with no payment methods enabled. Keep at least one method."
            : `Customers won't be able to use ${confirmMethod?.label} at checkout. You can re-enable it any time.`
        }
        confirmLabel="Disable"
      />
    </div>
  );
}