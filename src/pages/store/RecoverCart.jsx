import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { restoreCartByToken } from "@/lib/abandonedCart";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

// Landing page for the "Restore my cart" link in recovery emails. Loads the
// abandoned-cart snapshot by token, rebuilds the local cart, stashes any
// recovery coupon for checkout to auto-apply, then sends the customer to
// checkout. No login required — guests can restore too.
export default function RecoverCart() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { addItem, clearCart } = useCart();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [status, setStatus] = useState("loading"); // loading | done | empty | error

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) { if (alive) setStatus("error"); return; }
      try {
        const data = await restoreCartByToken(token);
        if (!alive) return;
        if (!data || data.recovered || !data.items || data.items.length === 0) {
          setStatus("empty");
          return;
        }
        clearCart();
        data.items.forEach((i) => {
          addItem(
            {
              id: i.product_id,
              name: i.name,
              name_ar: "",
              price: i.price,
              images: i.image ? [i.image] : [],
              stock: Infinity,
            },
            i.quantity
          );
        });
        if (data.coupon_code) sessionStorage.setItem("recovery_coupon", data.coupon_code);
        setStatus("done");
        setTimeout(() => navigate("/checkout"), 700);
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const txt = (en, ar) => (lang === "ar" ? ar : en);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 pt-16 text-center md:pt-24">
      {status === "loading" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{txt("Restoring your cart…", "جارٍ استعادة سلتك…")}</p>
        </>
      )}
      {status === "done" && (
        <>
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          <h1 className="text-2xl font-semibold tracking-tight">{txt("Your cart is ready!", "سلتك جاهزة!")}</h1>
          <p className="text-sm text-muted-foreground">{txt("Taking you to checkout…", "نقوم بتوجيهك إلى الدفع…")}</p>
        </>
      )}
      {status === "empty" && (
        <>
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">{txt("This cart is no longer available", "لم تعد هذه السلة متاحة")}</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {txt("It may have already been completed or expired. Browse the store to start a new order.", "ربما تم إتمامها أو انتهت صلاحيتها. تصفّح المتجر لبدء طلب جديد.")}
          </p>
          <Button asChild className="rounded-full"><Link to="/shop">{txt("Browse products", "تصفّح المنتجات")}</Link></Button>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h1 className="text-2xl font-semibold tracking-tight">{txt("Couldn't restore this cart", "تعذّرت استعادة هذه السلة")}</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {txt("The restore link may be invalid or expired.", "قد يكون رابط الاستعادة غير صالح أو منتهي الصلاحية.")}
          </p>
          <Button asChild className="rounded-full"><Link to="/shop">{txt("Browse products", "تصفّح المنتجات")}</Link></Button>
        </>
      )}
    </div>
  );
}