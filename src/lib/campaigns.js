import { formatPrice } from "@/lib/format";

export const SEGMENT_LABELS = {
  all_opted_in: "All opted-in customers",
  vip_customers: "VIP customers (top 10% by spend)",
  inactive_customers: "Inactive customers (90+ days)",
  specific_category_shoppers: "Shoppers of a specific category",
};

export const STATUS_LABELS = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  cancelled: "Cancelled",
};

export const STATUS_BADGE = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  sending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

// Email-safe product card inserted into the rich-text body by the campaign
// builder. Appends to both English and Arabic bodies (using the localized name).
export function productCardHtml(product, lang = "en") {
  const name = lang === "ar" ? product.name_ar || product.name : product.name;
  const img = (product.images && product.images[0]) || "";
  const price = product.price || 0;
  const link = `${window.location.origin}/product/${product.id}`;
  return (
    `<table cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;max-width:100%;">` +
    `<tr>` +
    `<td style="width:120px;padding:12px;">${img ? `<img src="${img}" width="100" height="100" style="border-radius:8px;object-fit:cover;" />` : ""}</td>` +
    `<td style="padding:12px;">` +
    `<p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#0f172a;">${name}</p>` +
    `<p style="margin:0 0 10px;font-size:14px;color:#475569;">${formatPrice(price)}</p>` +
    `<a href="${link}" style="display:inline-block;padding:8px 14px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;">${lang === "ar" ? "تسوق الآن" : "Shop now"}</a>` +
    `</td></tr></table>`
  );
}