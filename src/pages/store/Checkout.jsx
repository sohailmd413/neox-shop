import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Lock } from "lucide-react";
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
    city: "",
    state: "",
    postal_code: "",
    country: "",
    phone: "",
  });

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
        setCouponMsg(data?.reason || "Invalid coupon code.");
        return;
      }
      setCoupon({ code: data.code, discount_type: data.discount_type, discount_value: data.discount_value });
      setCouponMsg("Coupon applied!");
    } catch {
      setCouponMsg("Could not validate coupon.");
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput("");
    setCouponMsg("");
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const placeOrder = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    const required = ["name", "email", "line1", "city", "postal_code", "country"];
    for (const k of required) {
      if (!form[k].trim()) {
        toast({ title: "Please fill in all required fields.", variant: "destructive" });
        return;
      }
    }
    setPlacing(true);
    try {
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
        shipping_address: {
          name: form.name,
          line1: form.line1,
          city: form.city,
          state: form.state,
          postal_code: form.postal_code,
          country: form.country,
          phone: form.phone,
        },
      });
      setPlaced(order);
      clearCart();
    } catch (err) {
      toast({ title: "Could not place order. Please try again.", variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return <OrderSuccess order={placed} email={form.email} />;
  }

  if (blocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 pt-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600"><Lock className="h-6 w-6" /></div>
        <h1 className="text-2xl font-semibold tracking-tight">Your account is blocked</h1>
        <p className="max-w-sm text-sm text-muted-foreground">You can't place new orders. Please contact the store for help.</p>
        <Button asChild className="rounded-full"><Link to="/shop">Back to store</Link></Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 pt-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground">Add something before heading to checkout.</p>
        <Button asChild className="rounded-full">
          <Link to="/shop">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-16">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Continue shopping
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Checkout</h1>

        <form onSubmit={placeOrder} className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
          {/* Form */}
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-medium">Contact</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input label="Full name" value={form.name} onChange={set("name")} required />
                <Input label="Email" type="email" value={form.email} onChange={set("email")} required />
              </div>
            </section>

            <section>
              <h2 className="text-lg font-medium">Shipping address</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input label="Address" value={form.line1} onChange={set("line1")} required />
                </div>
                <Input label="City" value={form.city} onChange={set("city")} required />
                <Input label="State / Province" value={form.state} onChange={set("state")} />
                <Input label="Postal code" value={form.postal_code} onChange={set("postal_code")} required />
                <Input label="Country" value={form.country} onChange={set("country")} required />
                <Input label="Phone" value={form.phone} onChange={set("phone")} />
              </div>
            </section>

            <section>
              <h2 className="text-lg font-medium">Payment method</h2>
              <div className="mt-4 space-y-3">
                {enabledPayments.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    No payment methods are currently available. Please contact the store.
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
                      <span className="flex-1 text-sm font-medium">{PAYMENT_LABELS[m]?.en || m}</span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${on ? "border-foreground bg-foreground text-background" : "border-border"}`}>
                        {on && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
                {paymentMethod === "card" && (
                  <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    Secure payment via Stripe. Card details are collected on the next step — we never store raw card numbers.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Order summary
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
                      {coupon.code} · {coupon.discount_type === "percent" ? `${coupon.discount_value}% off` : `${formatPrice(coupon.discount_value)} off`}
                    </span>
                    <button onClick={removeCoupon} className="text-xs text-muted-foreground underline hover:text-foreground">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Coupon code"
                      className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      className="rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {couponMsg && (
                  <p className={`mt-1.5 text-xs ${coupon ? "text-emerald-600" : "text-destructive"}`}>{couponMsg}</p>
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <Row label="Subtotal" value={<AnimatedNumber value={subtotal} format={formatPrice} />} />
                {discount > 0 && <Row label="Discount" value={`−${formatPrice(discount)}`} />}
                <Row label="Shipping" value={shipping === 0 ? "Free" : <AnimatedNumber value={shipping} format={formatPrice} />} />
                <Row label="Tax" value={<AnimatedNumber value={tax} format={formatPrice} />} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="font-medium">Total</span>
                <span className="text-lg font-semibold font-display"><AnimatedNumber value={total} format={formatPrice} /></span>
              </div>

              <Pressable className="mt-5 w-full">
                <Button type="submit" disabled={placing} className="w-full rounded-full">
                  {placing ? "Placing order…" : `Pay ${formatPrice(total)}`}
                </Button>
              </Pressable>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> Secure checkout
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