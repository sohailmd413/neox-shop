import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { formatPrice } from "@/lib/format";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const TAX_RATE = 0.08;
const FREE_SHIPPING_THRESHOLD = 75;
const SHIPPING_FEE = 8;

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { toast } = useToast();
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);
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

  const tax = subtotal * TAX_RATE;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
  const total = subtotal + tax + shipping;

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
        discount: 0,
        total,
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
    return (
      <div className="flex min-h-screen items-center justify-center px-5 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Order confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thank you for your purchase. A confirmation has been sent to {form.email}.
          </p>
          <div className="mt-6 rounded-2xl border border-border p-5 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order number</span>
              <span className="font-mono text-xs">{placed.id}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatPrice(placed.total)}</span>
            </div>
          </div>
          <Button asChild className="mt-6 w-full rounded-full">
            <Link to="/shop">Continue shopping</Link>
          </Button>
        </motion.div>
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
              <h2 className="text-lg font-medium">Payment</h2>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                Secure payment via Stripe. Card details are collected on the next step —
                we never store raw card numbers.
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
                      {item.image && (
                        <Image src={item.image} alt={item.name} fittingType="fill" className="h-full w-full object-cover" />
                      )}
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

              <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <Row label="Subtotal" value={formatPrice(subtotal)} />
                <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
                <Row label="Tax" value={formatPrice(tax)} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="font-medium">Total</span>
                <span className="text-lg font-semibold">{formatPrice(total)}</span>
              </div>

              <Button type="submit" disabled={placing} className="mt-5 w-full rounded-full">
                {placing ? "Placing order…" : `Pay ${formatPrice(total)}`}
              </Button>
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