import { base44 } from "@/api/base44Client";

// Debounced upsert of the cart snapshot to the backend (abandoned-cart
// tracking). Logged-in customers are tracked from CartContext; guests are
// tracked once they enter an email at checkout. The single module-level timer
// coalesces rapid edits so we don't write on every qty change.
let timer = null;
export function syncCart(items, email, name) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const payload = {
      items: items.map((i) => ({
        product_id: i.productId,
        name: i.name,
        image: i.image,
        price: i.price,
        quantity: i.quantity,
      })),
      email,
      name,
    };
    base44.functions.invoke("syncAbandonedCart", payload).catch(() => {});
  }, 2500);
}

// Loads a cart snapshot by its restore token (recovery email link).
export async function restoreCartByToken(token) {
  const res = await base44.functions.invoke("restoreAbandonedCart", { token });
  return res?.data;
}

// Marks the caller's cart recovered after a successful checkout so recovery
// emails stop. Best-effort — the order is already placed.
export async function markCartRecovered(orderId, email) {
  try {
    await base44.functions.invoke("syncAbandonedCart", { recovered: true, orderId, email });
  } catch {}
}