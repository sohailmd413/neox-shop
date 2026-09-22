import React, { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { requestStockAlert } from "@/lib/alerts";
import { useToast } from "@/components/ui/use-toast";

// Replaces the "Add to cart" button on Product Detail when the product is out
// of stock. Logged-in customers subscribe in one click (their account email);
// guests enter an email first. After subscribing, shows a disabled "You'll be
// notified" state, remembered per-browser via localStorage to avoid duplicate
// signups in the same session.
export default function BackInStockButton({ product, className = "" }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [authed, setAuthed] = useState(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | submitting | done
  const [showInput, setShowInput] = useState(false);
  const flagKey = `stock_alert_${product.id}`;

  useEffect(() => {
    base44.auth.isAuthenticated().then(setAuthed).catch(() => setAuthed(false));
    if (localStorage.getItem(flagKey) === "1") setState("done");
  }, [product.id]);

  const submit = async () => {
    if (state === "done") return;
    if (!authed && !email.trim()) { toast({ title: t("alerts.emailPlaceholder"), variant: "destructive" }); return; }
    setState("submitting");
    try {
      const res = await requestStockAlert(product.id, authed ? null : email.trim());
      if (res?.error) { toast({ title: res.error, variant: "destructive" }); setState("idle"); return; }
      localStorage.setItem(flagKey, "1");
      setState("done");
      toast({ title: t("alerts.backInStockDone") });
    } catch (e) {
      toast({ title: t("alerts.backInStockError"), variant: "destructive" });
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <div className={`flex flex-1 items-center justify-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground ${className}`}>
        <BellRing className="h-4 w-4" /> {t("alerts.backInStockDone")}
      </div>
    );
  }

  if (authed) {
    return (
      <button onClick={submit} disabled={state === "submitting"} className={`flex flex-1 items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50 ${className}`}>
        {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} {t("alerts.notifyMe")}
      </button>
    );
  }

  return (
    <div className={`flex-1 ${className}`}>
      {showInput ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("alerts.emailPlaceholder")} className="flex-1 rounded-lg border border-input bg-transparent px-3 py-3 text-sm" dir="ltr" />
          <button onClick={submit} disabled={state === "submitting" || !email.trim()} className="flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50">
            {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} {t("alerts.notifyMe")}
          </button>
        </div>
      ) : (
        <button onClick={() => setShowInput(true)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background hover:opacity-90">
          <Bell className="h-4 w-4" /> {t("alerts.notifyMe")}
        </button>
      )}
    </div>
  );
}