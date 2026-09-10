import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Lock, Plus } from "lucide-react";
import OrderSuccess from "@/components/storefront/OrderSuccess";
import AnimatedNumber from "@/components/storefront/AnimatedNumber";
import Pressable from "@/components/storefront/Pressable";
import { useCart } from "@/lib/CartContext";
import { formatPrice } from "@/lib/format";
import { base44 } from "@/api/base44Client";
import ProductImage from "@/components/storefront/ProductImage";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useStoreSetting } from "@/lib/useStoreSetting";
import { computeTax, computeShipping, PAYMENT_LABELS } from "@/lib/settings";
import { useLanguage } from "@/lib/i18n";
import BackBar from "@/components/storefront/BackBar";

const PAYMENT_ICONS = {
  card: "💳",
  cod: "💵",
  upi: "📱",
  wallet: "👛",
  net_banking: "🏦",
};

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { toast } = useToast();
  const store = useStoreSetting();
  const { t, lang } = useLanguage();
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [blocked, setBlocked] = useState(false);
  const enabledPayments = store.payment_methods_enabled || [];
  const [paymentMethod, setPaymentMethod] = useState(enabledPayments[0] || "card");

  // Keep the selection valid if the enabled methods change (e.g. an admin
  // disables a method while a checkout is open).
  useEffect(() => {
    if (enabledPayments.length && !enabledPayments.includes(paymentMethod)) {
      setPaymentMethod(enabledPayments[0]);
    }
  }, [enabledPayments.join(",")]);

  useEffect(() => {
    base44.functions.invoke("getCustomerAccess", {})
      .then((r) => setBlocked(!!r?.data?.blocked))
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    name: "",
    email: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    phone: "",
  });
  // Saved address book (scoped to the customer via RLS) + which entry is
  // selected for this order ("new" = enter a fresh address inline).
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saveNew, setSaveNew] = useState(true);
  const [setDefault, setSetDefault] = useState(false);

  const applyAddress = (a) =>
    setForm((f) => ({
      ...f,
      name: a.full_name || f.name,
      phone: a.phone || f.phone,
      line1: a.line1 || "",
      line2: a.line2 || "",
      city: a.city || "",
      state: a.state || "",
      postal_code: a.postal_code || "",
      country: a.country || "",
    }));

  // Prefill from the signed-in customer's profile and saved default address.
  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (me) {
          setForm((f) => ({
            ...f,
            name: me.display_name || me.full_name || f.name,
            email: me.email || f.email,
            phone: me.phone || f.phone,
          }));
        }
      } catch {}
      try {
        const list = await base44.entities.Address.list("-created_date", 50);
        const addrs = list || [];
        setAddresses(addrs);
        const def = addrs.find((a) => a.is_default) || addrs[0];
        if (def) {
          setSelectedId(def.id);
          applyAddress(def);
          setSetDefault(!!def.is_default);
        } else {
          setSelectedId("new");
        }
      } catch {
        setSelectedId("new");
      }
    })();
  }, []);

  const discount = coupon
    ? coupon.discount_type === "percent"
      ? subtotal * (coupon.discount_value / 100)
      : Math.min(coupon.discount_value, subtotal)
    : 0;
  const taxable = Math.max(0, subtotal - discount);
  // Tax + shipping come from the store Setting (tax_rules / shipping_zones),
  // matched against the customer's country — no hardcoded rates.
  const tax = computeTax(taxable, form.country, store.tax_rules);
  const shipping = subtotal === 0 ? 0 : computeShipping(subtotal, form.country, store.shipping_zones);
  const total = taxable + tax + shipping;

  const applyCoupon = async () => {
    setCouponMsg("");
    if (!couponInput.trim()) return;
    try {
      const res = await base44.functions.invoke("validateCoupon", {
        code: couponInput.trim(),
        cart_items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity, price: i.price })),
        subtotal,
      });
      const data = res?.data;
      if (!data || !data.valid) {
        setCoupon(null);
        setCouponMsg(data?.reason || t("checkout.couponInvalid"));
        return;
      }
      setCoupon({ code: data.code, discount_type: data.discount_type, discount_value: data.discount_value });
      setCouponMsg(t("checkout.couponApplied"));
    } catch {
      setCouponMsg(t("checkout.couponError"));
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput("");
    setCouponMsg("");
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const selectAddress = (a) => {
    setSelectedId(a.id);
    applyAddress(a);
    setSetDefault(!!a.is_default);
  };
  const startNewAddress = () => {
    setSelectedId("new");
    setSetDefault(false);
    setForm((f) => ({ ...f, line1: "", line2: "", city: "", state: "", postal_code: "", country: "" }));
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    const required = ["name", "email", "line1", "city", "postal_code", "country"];
    for (const k of required) {
      if (!form[k].trim()) {
        toast({ title: t("checkout.required"), variant: "destructive" });
        return;
      }
    }
    setPlacing(true);
    try {
      // Snapshot the address used at checkout time so historical orders are
      // unaffected by later edits/deletes in the address book. When a saved
      // address is selected, copy from the Address record (preserves line2);
      // otherwise copy from the entered form.
      const selected = selectedId && selectedId !== "new" ? addresses.find((a) => a.id === selectedId) : null;
      const shipping_address = selected
        ? {
            name: selected.full_name || form.name,
            line1: selected.line1 || form.line1,
            line2: selected.line2 || "",
            city: selected.city || form.city,
            state: selected.state || form.state,
            postal_code: selected.postal_code || form.postal_code,
            country: selected.country || form.country,
            phone: selected.phone || form.phone,
          }
        : {
            name: form.name,
            line1: form.line1,
            line2: form.line2 || "",
            city: form.city,
            state: form.state,
            postal_code: form.postal_code,
            country: form.country,
            phone: form.phone,
          };

      const order = await base44.entities.Order.create({
        status: "pending",
        items: items.map((i) => ({
          product_id: i.productId,
          name: i.name,
          image: i.image,
          price: i.price,
          quantity: i.quantity,
        })),
        subtotal,
        tax,
        shipping_fee: shipping,
        discount,
        total,
        coupon_code: coupon?.code || "",
        customer_email: form.email,
        payment_method: paymentMethod,
        timeline: [{ status: "pending", by: "system", at: new Date().toISOString() }],
        shipping_address,
      });

      // Persist address-book changes made at checkout (best-effort — the
      // order is already placed, so failures here don't block it).
      try {
        if (selectedId === "new" && saveNew) {
          const created = await base44.entities.Address.create({
            label: "Home",
            full_name: form.name,
            phone: form.phone,
            line1: form.line1,
            line2: form.line2 || "",
            city: form.city,
            state: form.state,
            postal_code: form.postal_code,
            country: form.country,
            is_default: setDefault,
          });
          if (setDefault && created) {
            const all = await base44.entities.Address.list("-created_date", 50);
            await Promise.all(
              (all || []).filter((a) => a.id !== created.id && a.is_default).map((a) => base44.entities.Address.update(a.id, { is_default: false }))
            );
          }
        } else if (selected && setDefault && !selected.is_default) {
          await base44.entities.Address.update(selected.id, { is_default: true });
          await Promise.all(
            addresses.filter((a) => a.id !== selected.id && a.is_default).map((a) => base44.entities.Address.update(a.id, { is_default: false }))
          );
        }
      } catch {}

      setPlaced(order);
      clearCart();
    } catch (err) {
      toast({ title: t("checkout.placeError"), variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return <OrderSuccess order={placed} email={form.email} />;
  }

  if (blocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 pt-16 md:pt-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600"><Lock className="h-6 w-6" /></div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("checkout.blocked")}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t("checkout.blockedDesc")}</p>
        <Button asChild className="rounded-full"><Link to="/shop">{t("checkout.backToStore")}</Link></Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 pt-16 md:pt-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("checkout.cartEmpty")}</h1>
        <p className="text-sm text-muted-foreground">{t("checkout.cartEmptyDesc")}</p>
        <Button asChild className="rounded-full">
          <Link to="/shop">{t("checkout.browse")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-16 md:pt-24">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <BackBar fallbackTo="/shop" fallbackLabel={t("back.shop")} />
        <h1 className="mt-4 font-headline text-3xl tracking-tight sm:text-4xl">{t("checkout.title")}</h1>

        <form onSubmit={placeOrder} className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
          {/* Form */}
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-medium">{t("checkout.contact")}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input label={t("checkout.fullName")} value={form.name} onChange={set("name")} required />
                <Input label={t("checkout.email")} type="email" dir="ltr" value={form.email} onChange={set("email")} required />
              </div>
            </section>

            <section>
              <h2 className="text-lg font-medium">{t("checkout.shippingAddress")}</h2>

              {addresses.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {addresses.map((a) => {
                    const on = selectedId === a.id;
                    return (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() => selectAddress(a)}
                        className={`flex flex-col gap-1 rounded-2xl border p-4 text-left transition-colors ${on ? "border-foreground bg-muted/40" : "border-border hover:border-foreground/30"}`}
                      >
                        <div className="flex items-center justify-between">
                          {a.label ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{a.label}</span>
                          ) : <span />}
                          {a.is_default && <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">{t("address.default")}</span>}
                        </div>
                        <p className="mt-1 text-sm font-medium">{a.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground"><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</span></p>
                        <p className="text-xs text-muted-foreground"><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{[a.city, a.state, a.postal_code].filter(Boolean).join(", ")}</span></p>
                        <p className="text-xs text-muted-foreground"><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{a.country}</span></p>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={startNewAddress}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl border border-dashed p-4 text-sm font-medium transition-colors ${selectedId === "new" ? "border-foreground bg-muted/40 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30"}`}
                  >
                    <Plus className="h-4 w-4" /> {t("checkout.addNewAddress")}
                  </button>
                </div>
              )}

              {(addresses.length === 0 || selectedId === "new") && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input label={t("checkout.address")} value={form.line1} onChange={set("line1")} required />
                  </div>
                  <div className="sm:col-span-2">
                    <Input label={t("address.line2")} value={form.line2} onChange={set("line2")} />
                  </div>
                  <Input label={t("checkout.city")} value={form.city} onChange={set("city")} required />
                  <Input label={t("checkout.state")} value={form.state} onChange={set("state")} />
                  <Input label={t("checkout.postalCode")} dir="ltr" value={form.postal_code} onChange={set("postal_code")} required />
                  <Input label={t("checkout.country")} value={form.country} onChange={set("country")} required />
                  <Input label={t("checkout.phone")} dir="ltr" value={form.phone} onChange={set("phone")} />
                  {selectedId === "new" && (
                    <label className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-4 py-3 sm:col-span-2">
                      <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} className="h-4 w-4 rounded border-border" />
                      <span className="text-sm font-medium">{t("checkout.saveForFuture")}</span>
                    </label>
                  )}
                </div>
              )}

              <label className="mt-4 flex items-center gap-2.5 rounded-xl bg-muted/40 px-4 py-3">
                <input type="checkbox" checked={setDefault} onChange={(e) => setSetDefault(e.target.checked)} className="h-4 w-4 rounded border-border" />
                <span className="text-sm font-medium">{t("checkout.setAsDefault")}</span>
              </label>
            </section>

            <section>
              <h2 className="text-lg font-medium">{t("checkout.paymentMethod")}</h2>
              <div className="mt-4 space-y-3">
                {enabledPayments.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    {t("checkout.noPayments")}
                  </p>
                )}
                {enabledPayments.map((m) => {
                  const on = paymentMethod === m;
                  return (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${on ? "border-foreground bg-muted/40" : "border-border hover:border-foreground/30"}`}
                    >
                      <span className="text-xl">{PAYMENT_ICONS[m] || "•"}</span>
                      <span className="flex-1 text-sm font-medium">{PAYMENT_LABELS[m]?.[lang] || PAYMENT_LABELS[m]?.en || m}</span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${on ? "border-foreground bg-foreground text-background" : "border-border"}`}>
                        {on && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
                {paymentMethod === "card" && (
                  <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    {t("checkout.cardNote")}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("checkout.orderSummary")}
              </h2>
              <ul className="mt-4 space-y-4">
                {items.map((item) => (
                  <li key={item.productId} className="flex gap-3">
                    <div className="relative h-16 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted/40">
                      <ProductImage src={item.image} alt={item.name} fittingType="fill" size="sm" className="h-full w-full object-cover" />
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col justify-center">
                      <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(item.price)}</p>
                    </div>
                    <span className="self-center text-sm font-medium">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Coupon */}
              <div className="mt-5 border-t border-border pt-4">
                {coupon ? (
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="font-medium">
                      {coupon.code} · {coupon.discount_type === "percent" ? `${coupon.discount_value}% ${t("product.off")}` : `${formatPrice(coupon.discount_value)} ${t("product.off")}`}
                    </span>
                    <button onClick={removeCoupon} className="text-xs text-muted-foreground underline hover:text-foreground">
                      {t("cart.remove")}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder={t("checkout.couponPlaceholder")}
                      className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      className="rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      {t("checkout.apply")}
                    </button>
                  </div>
                )}
                {couponMsg && (
                  <p className={`mt-1.5 text-xs ${coupon ? "text-emerald-600" : "text-destructive"}`}>{couponMsg}</p>
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <Row label={t("cart.subtotal")} value={<AnimatedNumber value={subtotal} format={formatPrice} />} />
                {discount > 0 && <Row label={t("cart.discount")} value={`−${formatPrice(discount)}`} />}
                <Row label={t("cart.shipping")} value={shipping === 0 ? t("checkout.free") : <AnimatedNumber value={shipping} format={formatPrice} />} />
                <Row label={t("cart.tax")} value={<AnimatedNumber value={tax} format={formatPrice} />} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="font-medium">{t("cart.total")}</span>
                <span className="text-lg font-semibold font-display"><AnimatedNumber value={total} format={formatPrice} /></span>
              </div>

              <Pressable className="mt-5 w-full">
                <Button type="submit" disabled={placing} className="w-full rounded-full">
                  {placing ? t("checkout.placing") : `${t("checkout.pay")} ${formatPrice(total)}`}
                </Button>
              </Pressable>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> {t("checkout.secureCheckout")}
              </p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        {...props}
        className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
      />
    </label>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}