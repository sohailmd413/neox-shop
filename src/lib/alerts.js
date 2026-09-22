import { base44 } from "@/api/base44Client";

// Server-side price-alert sync. No-op for guests (price-drop alerts require a
// customer account to email). Fire-and-forget; failures are swallowed so the
// wishlist toggle stays responsive.
export async function syncPriceAlert(productId, adding) {
  try {
    const authed = await base44.auth.isAuthenticated();
    if (!authed) return;
    if (adding) await base44.functions.invoke("createPriceAlert", { product_id: productId });
    else await base44.functions.invoke("removePriceAlert", { product_id: productId });
  } catch {}
}

// Back-in-stock alert request. Logged-in customers pass null email (the
// function uses the account email); guests pass their email.
export async function requestStockAlert(productId, email) {
  try {
    const res = await base44.functions.invoke("requestStockAlert", { product_id: productId, email });
    return res?.data;
  } catch (e) {
    return { error: e?.response?.data?.error || "Could not subscribe." };
  }
}